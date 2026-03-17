/**
 * 점검 스크립트: budgetController
 * 실행: npx ts-node src/__tests__/check_budget_controller.ts
 */

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// ─── Mock 상태 ──────────────────────────────────────────────────────────────
let _queryResponses: Array<{ rows: any[]; insertId?: number }> = [];
let _qIdx = 0;

const mockPool = {
  query: async (_sql: string, _params?: any[]) => {
    const r = _queryResponses[_qIdx] ?? { rows: [] };
    _qIdx++;
    return r;
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

const { getBudgetSummary, getBudgetByPlatform, getBudgetByCampaign, updateCampaignBudget } = require('../controllers/budgetController');

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

function mockReqRes(body: any = {}, params: any = {}, query: any = {}, user: any = { id: 1 }) {
  const req: any = { body, params, query, user };
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
  console.log('  🔍 BUDGET CONTROLLER 점검 시작');
  console.log('========================================');

  // ── getBudgetSummary ─────────────────────────────────────────────────────────
  console.log('\n▶ getBudgetSummary');

  console.log('\n[1] 예산 설정 없을 때 → 0으로 처리 (크래시 없음)');
  {
    setQueries(
      { rows: [] },
      { rows: [{ total_spent: '0' }] },
      { rows: [{ count: '0' }] }
    );
    const { req, res } = mockReqRes({}, {}, {});
    await getBudgetSummary(req, res);
    check('200 반환', res.statusCode === 200);
    check('summary 포함', res.body?.summary !== undefined);
    check('totalBudget = 0', res.body?.summary?.totalBudget === 0);
    check('utilizationRate = 0', res.body?.summary?.utilizationRate === 0);
  }

  console.log('\n[2] 예산 설정 있을 때 → 정상 계산');
  {
    setQueries(
      { rows: [{ total_budget: '10000000', daily_budget: '300000' }] },
      { rows: [{ total_spent: '3000000' }] },
      { rows: [{ count: '5' }] }
    );
    const { req, res } = mockReqRes({}, {}, {});
    await getBudgetSummary(req, res);
    check('200 반환', res.statusCode === 200);
    check('totalBudget = 10000000', res.body?.summary?.totalBudget === 10000000);
    check('remaining = 7000000', res.body?.summary?.remaining === 7000000);
    check('utilizationRate = 30', res.body?.summary?.utilizationRate === 30);
    check('activeCampaigns = 5', res.body?.summary?.activeCampaigns === 5);
  }

  console.log('\n[3] 날짜 필터 포함 → 정상 처리');
  {
    setQueries(
      { rows: [{ total_budget: '5000000', daily_budget: '100000' }] },
      { rows: [{ total_spent: '1000000' }] },
      { rows: [{ count: '2' }] }
    );
    const { req, res } = mockReqRes({}, {}, { startDate: '2025-01-01', endDate: '2025-01-31' });
    await getBudgetSummary(req, res);
    check('200 반환', res.statusCode === 200);
    check('dailyBudget = 100000', res.body?.summary?.dailyBudget === 100000);
  }

  // ── getBudgetByPlatform ───────────────────────────────────────────────────────
  console.log('\n▶ getBudgetByPlatform');

  console.log('\n[4] 플랫폼 데이터 없을 때 → 빈 배열');
  {
    setQueries({ rows: [] });
    const { req, res } = mockReqRes({}, {}, {});
    await getBudgetByPlatform(req, res);
    check('200 반환', res.statusCode === 200);
    check('platforms 빈 배열', Array.isArray(res.body?.platforms) && res.body.platforms.length === 0);
  }

  console.log('\n[5] 멀티 플랫폼 → ROAS 계산');
  {
    setQueries({
      rows: [
        { platform: 'Meta', campaign_count: '2', daily_budget: '200000', total_budget: '5000000', spent: '1000000', revenue: '3000000' },
        { platform: 'Google', campaign_count: '1', daily_budget: '100000', total_budget: '3000000', spent: '500000', revenue: '1500000' },
      ]
    });
    const { req, res } = mockReqRes({}, {}, {});
    await getBudgetByPlatform(req, res);
    check('200 반환', res.statusCode === 200);
    check('플랫폼 2개', res.body?.platforms?.length === 2);
    check('Meta roas = 3', res.body?.platforms?.[0]?.roas === 3);
  }

  // ── updateCampaignBudget ─────────────────────────────────────────────────────
  console.log('\n▶ updateCampaignBudget');

  console.log('\n[6] 존재하지 않는 캠페인 → 404');
  {
    setQueries({ rows: [] });
    const { req, res } = mockReqRes({ dailyBudget: 100000 }, { id: '999' }, {});
    await updateCampaignBudget(req, res);
    check('404 반환', res.statusCode === 404);
  }

  console.log('\n[7] 정상 예산 수정 → 200');
  {
    setQueries(
      { rows: [{ id: 1 }] },
      { rows: [] },
      { rows: [{ id: 1, campaign_name: '테스트', daily_budget: 200000 }] }
    );
    const { req, res } = mockReqRes({ dailyBudget: 200000, totalBudget: 5000000 }, { id: '1' }, {});
    await updateCampaignBudget(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
    check('campaign 포함', res.body?.campaign !== undefined);
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
