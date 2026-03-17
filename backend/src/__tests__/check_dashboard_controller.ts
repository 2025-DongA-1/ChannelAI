/**
 * 점검 스크립트: dashboardController
 * 실행: npx ts-node src/__tests__/check_dashboard_controller.ts
 */

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// ─── Mock 상태 ──────────────────────────────────────────────────────────────
let _queryResponses: Array<{ rows: any[] }> = [];
let _qIdx = 0;

const mockPool = {
  query: async (_sql: string, _params?: any[]) => {
    const r = _queryResponses[_qIdx] ?? { rows: [] };
    _qIdx++;
    return r;
  },
};

function setQueries(...results: Array<{ rows: any[] }>) {
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

const { getSummary } = require('../controllers/dashboardController');

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
  console.log('  🔍 DASHBOARD CONTROLLER 점검 시작');
  console.log('========================================');

  // ── getSummary ───────────────────────────────────────────────────────────────
  console.log('\n▶ getSummary');

  console.log('\n[1] 데이터 없을 때 → 크래시 없이 200');
  {
    setQueries(
      { rows: [{ total_campaigns: '0', total_accounts: '0', total_impressions: '0', total_clicks: '0', total_conversions: '0', total_cost: '0', total_revenue: '0', avg_ctr: '0', avg_cpc: '0', avg_roas: '0' }] },
      { rows: [] },
      { rows: [] }
    );
    const { req, res } = mockReqRes({});
    await getSummary(req, res);
    check('200 반환', res.statusCode === 200);
    check('metrics 포함', res.body?.metrics !== undefined);
    check('budget 포함', res.body?.budget !== undefined);
    check('status 포함', res.body?.status !== undefined);
  }

  console.log('\n[2] 정상 데이터 → 값 검증');
  {
    setQueries(
      { rows: [{ total_campaigns: '5', total_accounts: '3', total_impressions: '100000', total_clicks: '5000', total_conversions: '250', total_cost: '5000000', total_revenue: '15000000', avg_ctr: '5.00', avg_cpc: '1000.00', avg_roas: '3.00' }] },
      { rows: [{ status: 'active', count: '3' }, { status: 'paused', count: '2' }] },
      { rows: [{ total_budget: '20000000', daily_budget: '500000' }] }
    );
    const { req, res } = mockReqRes({});
    await getSummary(req, res);
    check('200 반환', res.statusCode === 200);
    check('campaigns = 5', res.body?.metrics?.campaigns === 5);
    check('cost = 5000000', res.body?.metrics?.cost === 5000000);
    check('roas = 3', res.body?.metrics?.roas === 3);
    check('status.active = 3', res.body?.status?.active === 3);
    check('budget.total = 20000000', res.body?.budget?.total === 20000000);
    check('budget.remaining = 15000000', res.body?.budget?.remaining === 15000000);
  }

  console.log('\n[3] 날짜 필터 포함 → 정상 처리');
  {
    setQueries(
      { rows: [{ total_campaigns: '2', total_accounts: '1', total_impressions: '50000', total_clicks: '2500', total_conversions: '100', total_cost: '2000000', total_revenue: '6000000', avg_ctr: '5.00', avg_cpc: '800.00', avg_roas: '3.00' }] },
      { rows: [{ status: 'active', count: '2' }] },
      { rows: [] }
    );
    const { req, res } = mockReqRes({ startDate: '2025-01-01', endDate: '2025-01-31' });
    await getSummary(req, res);
    check('200 반환', res.statusCode === 200);
    check('period 포함', res.body?.period !== undefined);
    check('campaigns = 2', res.body?.metrics?.campaigns === 2);
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
