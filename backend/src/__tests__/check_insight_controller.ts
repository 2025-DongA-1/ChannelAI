/**
 * 점검 스크립트: insightController (getTrends, getComparison)
 * 실행: npx ts-node src/__tests__/check_insight_controller.ts
 */

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// ─── Mock 상태 ──────────────────────────────────────────────────────────────
let _queryResponses: Array<{ rows: any[]; insertId?: number }> = [];
let _qIdx = 0;

const mockClient = {
  query: async (_sql: string, _params?: any[]) => {
    const r = _queryResponses[_qIdx] ?? { rows: [], insertId: 0 };
    _qIdx++;
    return r;
  },
  release: () => {},
};

const mockPool = {
  connect: async () => {
    _qIdx = 0;
    return mockClient;
  },
};

function setQueries(...results: Array<{ rows: any[]; insertId?: number }>) {
  _queryResponses = results;
  _qIdx = 0;
}

// ─── require.cache 주입 ──────────────────────────────────────────────────────
require.cache[require.resolve('../config/database')] = {
  id: require.resolve('../config/database'),
  filename: require.resolve('../config/database'),
  loaded: true,
  exports: { __esModule: true, default: mockPool },
  paths: [],
  children: [],
  parent: null,
} as any;

require.cache[require.resolve('../services/ai/aiAnalysisService')] = {
  id: require.resolve('../services/ai/aiAnalysisService'),
  filename: require.resolve('../services/ai/aiAnalysisService'),
  loaded: true,
  exports: {
    __esModule: true,
    AIAnalysisService: class {
      async analyze() { return {}; }
    },
  },
  paths: [],
  children: [],
  parent: null,
} as any;

const { getTrends, getComparison } = require('../controllers/insightController');

// ─── 유틸 ────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

function mockReqRes(query: any = {}, user: any = { id: 1 }) {
  const req: any = { query, user };
  const res: any = {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(b: any) { this.body = b; return this; },
  };
  return { req, res };
}

(async () => {
  console.log('\n========================================');
  console.log('  🔍 INSIGHT CONTROLLER 점검 시작');
  console.log('========================================');

  // ── getTrends ──────────────────────────────────────────────────────────────
  console.log('\n▶ getTrends');

  console.log('\n[1] 데이터 없을 때 → 크래시 없이 200');
  {
    setQueries(
      { rows: [] },
      { rows: [{ impressions: null, clicks: null, conversions: null, cost: null, revenue: null }] }
    );
    const { req, res } = mockReqRes({ start_date: '2025-01-01', end_date: '2025-01-31' });
    await getTrends(req, res);
    check('200 반환', res.statusCode === 200);
    check('timeline 빈 배열', Array.isArray(res.body?.timeline) && res.body.timeline.length === 0);
    check('changes 포함', res.body?.changes !== undefined);
    check('current 포함', res.body?.current !== undefined);
  }

  console.log('\n[2] 정상 데이터 → 집계 + 증감률 검증');
  {
    setQueries(
      {
        rows: [
          { date: '2025-01-01', impressions: '1000', clicks: '50', conversions: '5', cost: '10000', revenue: '30000' },
          { date: '2025-01-02', impressions: '2000', clicks: '100', conversions: '10', cost: '20000', revenue: '60000' },
        ]
      },
      { rows: [{ impressions: '500', clicks: '25', conversions: '3', cost: '5000', revenue: '15000' }] }
    );
    const { req, res } = mockReqRes({ start_date: '2025-01-01', end_date: '2025-01-02' });
    await getTrends(req, res);
    check('200 반환', res.statusCode === 200);
    check('timeline 2개', res.body?.timeline?.length === 2);
    check('current.impressions = 3000', res.body?.current?.impressions === 3000);
    check('changes.impressions 양수 (500→3000)', res.body?.changes?.impressions > 0);
  }

  console.log('\n[3] campaign_id 필터 → 정상 처리');
  {
    setQueries(
      { rows: [{ date: '2025-01-15', impressions: '500', clicks: '25', conversions: '2', cost: '5000', revenue: '15000' }] },
      { rows: [{ impressions: '0', clicks: '0', conversions: '0', cost: '0', revenue: '0' }] }
    );
    const { req, res } = mockReqRes({ start_date: '2025-01-01', end_date: '2025-01-31', campaign_id: '5' });
    await getTrends(req, res);
    check('200 반환', res.statusCode === 200);
    check('timeline 1개', res.body?.timeline?.length === 1);
  }

  // ── getComparison ──────────────────────────────────────────────────────────
  console.log('\n▶ getComparison');

  console.log('\n[4] 플랫폼 데이터 없을 때 → 빈 배열');
  {
    setQueries({ rows: [] });
    const { req, res } = mockReqRes({ start_date: '2025-01-01', end_date: '2025-01-31' });
    await getComparison(req, res);
    check('200 반환', res.statusCode === 200);
    check('platforms 빈 배열', Array.isArray(res.body?.platforms) && res.body.platforms.length === 0);
    check('totals 포함', res.body?.totals !== undefined);
  }

  console.log('\n[5] 멀티 플랫폼 → cost_share 합계 100%');
  {
    setQueries({
      rows: [
        { platform: 'Meta', campaign_count: '2', impressions: '5000', clicks: '250', conversions: '25', cost: '50000', revenue: '150000', avg_ctr: '5', avg_cpc: '200', total_roas: '3' },
        { platform: 'Google', campaign_count: '1', impressions: '3000', clicks: '150', conversions: '15', cost: '30000', revenue: '90000', avg_ctr: '5', avg_cpc: '200', total_roas: '3' },
      ]
    });
    const { req, res } = mockReqRes({ start_date: '2025-01-01', end_date: '2025-01-31' });
    await getComparison(req, res);
    check('200 반환', res.statusCode === 200);
    check('플랫폼 2개', res.body?.platforms?.length === 2);
    const totalShare = (res.body?.platforms ?? []).reduce((s: number, p: any) => s + p.cost_share, 0);
    check('cost_share 합계 ≈ 100', Math.abs(totalShare - 100) < 0.01);
  }

  console.log('\n[6] campaign_id 필터 포함 → 정상 처리');
  {
    setQueries({
      rows: [
        { platform: 'Meta', campaign_count: '1', impressions: '2000', clicks: '100', conversions: '10', cost: '20000', revenue: '60000', avg_ctr: '5', avg_cpc: '200', total_roas: '3' },
      ]
    });
    const { req, res } = mockReqRes({ start_date: '2025-01-01', end_date: '2025-01-31', campaign_id: '3' });
    await getComparison(req, res);
    check('200 반환', res.statusCode === 200);
    check('플랫폼 1개', res.body?.platforms?.length === 1);
    check('cost_share = 100 (단일 플랫폼)', res.body?.platforms?.[0]?.cost_share === 100);
  }

  // ─── 결과 ─────────────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`  결과: ${passed}개 통과 / ${failed}개 실패`);
  if (failed === 0) {
    console.log('  🎉 모든 점검 통과!');
  } else {
    console.log('  ⚠️  일부 점검 실패 - 위 항목 확인 필요');
    process.exit(1);
  }
  console.log('========================================\n');
})();
