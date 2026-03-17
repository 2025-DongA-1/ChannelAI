/**
 * 점검 스크립트: campaignController
 * 실행: npx ts-node src/__tests__/check_campaign_controller.ts
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

const {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} = require('../controllers/campaignController');

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
  console.log('  🔍 CAMPAIGN CONTROLLER 점검 시작');
  console.log('========================================');

  // ── getCampaigns ─────────────────────────────────────────────────────────────
  console.log('\n▶ getCampaigns');

  console.log('\n[1] 정상 목록 조회');
  {
    setQueries(
      { rows: [{ id: 1, campaign_name: '테스트 캠페인', platform: 'Meta' }] },
      { rows: [{ count: '1' }] }
    );
    const { req, res } = mockReqRes({}, {}, { page: '1', limit: '10' });
    await getCampaigns(req, res);
    check('200 반환', res.statusCode === 200);
    check('campaigns 배열 포함', Array.isArray(res.body?.campaigns));
    check('pagination 포함', res.body?.pagination !== undefined);
  }

  // ── getCampaignById ──────────────────────────────────────────────────────────
  console.log('\n▶ getCampaignById');

  console.log('\n[2] 존재하지 않는 캠페인 → 404');
  {
    setQueries({ rows: [] }, { rows: [] });
    const { req, res } = mockReqRes({}, { id: '999' }, {});
    await getCampaignById(req, res);
    check('404 반환', res.statusCode === 404);
    check('error = CAMPAIGN_NOT_FOUND', res.body?.error === 'CAMPAIGN_NOT_FOUND');
  }

  console.log('\n[3] 정상 캠페인 조회');
  {
    setQueries(
      { rows: [{ id: 1, campaign_name: '테스트', platform: 'Google' }] },
      { rows: [{ id: 1, impressions: 1000 }] }
    );
    const { req, res } = mockReqRes({}, { id: '1' }, {});
    await getCampaignById(req, res);
    check('200 반환', res.statusCode === 200);
    check('campaign 포함', res.body?.campaign !== undefined);
    check('latest_metrics 포함', res.body?.latest_metrics !== undefined || res.body?.latest_metrics === null);
  }

  // ── createCampaign ──────────────────────────────────────────────────────────
  console.log('\n▶ createCampaign');

  console.log('\n[4] 필수 필드 누락 → 400');
  {
    setQueries();
    const { req, res } = mockReqRes({ campaign_name: '이름만' }, {}, {});
    await createCampaign(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = INVALID_INPUT', res.body?.error === 'INVALID_INPUT');
  }

  console.log('\n[5] 타인 마케팅 계정 접근 → 403');
  {
    setQueries({ rows: [] });
    const { req, res } = mockReqRes({
      marketing_account_id: 99,
      campaign_name: '테스트',
      campaign_id: 'ext-001',
    }, {}, {});
    await createCampaign(req, res);
    check('403 반환', res.statusCode === 403);
    check('error = FORBIDDEN', res.body?.error === 'FORBIDDEN');
  }

  console.log('\n[6] 정상 캠페인 생성 → 201');
  {
    setQueries(
      { rows: [{ id: 10 }] },
      { rows: [], insertId: 42 },
      { rows: [{ id: 42, campaign_name: '신규' }] }
    );
    const { req, res } = mockReqRes({
      marketing_account_id: 10,
      campaign_name: '신규 캠페인',
      campaign_id: 'ext-002',
    }, {}, {});
    await createCampaign(req, res);
    check('201 반환', res.statusCode === 201);
    check('campaign 포함', res.body?.campaign !== undefined);
  }

  // ── updateCampaign ──────────────────────────────────────────────────────────
  console.log('\n▶ updateCampaign');

  console.log('\n[7] 존재하지 않는 캠페인 수정 → 404');
  {
    setQueries({ rows: [] });
    const { req, res } = mockReqRes({ campaign_name: '수정' }, { id: '999' }, {});
    await updateCampaign(req, res);
    check('404 반환', res.statusCode === 404);
    check('error = CAMPAIGN_NOT_FOUND', res.body?.error === 'CAMPAIGN_NOT_FOUND');
  }

  console.log('\n[8] 정상 캠페인 수정 → 200');
  {
    setQueries(
      { rows: [{ id: 1 }] },
      { rows: [] },
      { rows: [{ id: 1, campaign_name: '수정됨' }] }
    );
    const { req, res } = mockReqRes({ campaign_name: '수정됨' }, { id: '1' }, {});
    await updateCampaign(req, res);
    check('200 반환', res.statusCode === 200);
    check('campaign 포함', res.body?.campaign !== undefined);
  }

  // ── deleteCampaign ──────────────────────────────────────────────────────────
  console.log('\n▶ deleteCampaign');

  console.log('\n[9] 존재하지 않는 캠페인 삭제 → 404');
  {
    setQueries({ rows: [] });
    const { req, res } = mockReqRes({}, { id: '999' }, {});
    await deleteCampaign(req, res);
    check('404 반환', res.statusCode === 404);
  }

  console.log('\n[10] 정상 캠페인 삭제 → 200');
  {
    setQueries(
      { rows: [{ id: 1 }] },
      { rows: [] }
    );
    const { req, res } = mockReqRes({}, { id: '1' }, {});
    await deleteCampaign(req, res);
    check('200 반환', res.statusCode === 200);
    check('message 포함', typeof res.body?.message === 'string');
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
