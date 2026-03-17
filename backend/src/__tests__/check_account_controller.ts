/**
 * 점검 스크립트: accountController (마케팅 계정 관리)
 * 실행: npx ts-node src/__tests__/check_account_controller.ts
 */

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// ─── Mock 상태 ──────────────────────────────────────────────────────────────
let _mockRows: any[] = [];
let _mockInsertId = 1;

const mockPool = {
  query: async (_sql: string, _params?: any[]) => ({
    rows: _mockRows,
    insertId: _mockInsertId,
  }),
};

function setMockDB(rows: any[], insertId = 1) {
  _mockRows = rows;
  _mockInsertId = insertId;
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

// crypto pass-through mock
require.cache[require.resolve('../utils/crypto')] = {
  id: require.resolve('../utils/crypto'),
  filename: require.resolve('../utils/crypto'),
  loaded: true,
  exports: {
    __esModule: true,
    encrypt: (s: string) => (s ? `enc:${s}` : s),
    decrypt: (s: string) => (s ? s.replace(/^enc:/, '') : s),
  },
  paths: [],
  children: [],
  parent: null,
} as any;

const {
  getAccounts,
  getAccountById,
} = require('../controllers/accountController');

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
  console.log('  🔍 ACCOUNT CONTROLLER 점검 시작');
  console.log('========================================');

  // ── getAccounts ─────────────────────────────────────────────────────────────
  console.log('\n▶ getAccounts');

  console.log('\n[1] 계정 없을 때 → 빈 배열');
  {
    setMockDB([]);
    const { req, res } = mockReqRes({}, {}, {});
    await getAccounts(req, res);
    check('200 반환', res.statusCode === 200);
    check('accounts 빈 배열', Array.isArray(res.body?.accounts) && res.body.accounts.length === 0);
  }

  console.log('\n[2] 계정 목록 조회 → 토큰 복호화 확인');
  {
    setMockDB([
      { id: 1, platform: 'Meta', account_name: '메타 광고', access_token: 'enc:mytoken', refresh_token: null },
    ]);
    const { req, res } = mockReqRes({}, {}, {});
    await getAccounts(req, res);
    check('200 반환', res.statusCode === 200);
    check('1개 계정', res.body?.accounts?.length === 1);
    check('access_token 복호화 (enc: 제거)', res.body?.accounts?.[0]?.access_token === 'mytoken');
  }

  console.log('\n[3] 플랫폼 필터 포함 → 정상 처리');
  {
    setMockDB([
      { id: 2, platform: 'Google', account_name: 'GDN', access_token: 'enc:googletoken', refresh_token: null },
    ]);
    const { req, res } = mockReqRes({}, {}, { platform: 'Google' });
    await getAccounts(req, res);
    check('200 반환', res.statusCode === 200);
    check('Google 계정 반환', res.body?.accounts?.[0]?.platform === 'Google');
  }

  // ── getAccountById ──────────────────────────────────────────────────────────
  console.log('\n▶ getAccountById');

  console.log('\n[4] 존재하지 않는 계정 → 404');
  {
    setMockDB([]);
    const { req, res } = mockReqRes({}, { id: '999' }, {});
    await getAccountById(req, res);
    check('404 반환', res.statusCode === 404);
    check('error = ACCOUNT_NOT_FOUND', res.body?.error === 'ACCOUNT_NOT_FOUND');
  }

  console.log('\n[5] 정상 계정 조회 → 토큰 복호화');
  {
    setMockDB([
      { id: 1, platform: 'Google', account_name: 'GDN', access_token: 'enc:googletoken', refresh_token: 'enc:refreshtoken' }
    ]);
    const { req, res } = mockReqRes({}, { id: '1' }, {});
    await getAccountById(req, res);
    check('200 반환', res.statusCode === 200);
    check('account 포함', res.body?.account !== undefined);
    check('access_token 복호화', res.body?.account?.access_token === 'googletoken');
    check('refresh_token 복호화', res.body?.account?.refresh_token === 'refreshtoken');
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
