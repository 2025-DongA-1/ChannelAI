/**
 * 점검 스크립트: socialAuthController (카카오/네이버/구글 OAuth)
 * 실행: npx ts-node src/__tests__/check_social_auth_controller.ts
 */

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3001';
process.env.KAKAO_CLIENT_ID = 'test-kakao-id';
process.env.KAKAO_REDIRECT_URI = 'http://localhost:3000/api/v1/auth/kakao/callback';
process.env.NAVER_CLIENT_ID = 'test-naver-id';
process.env.NAVER_CLIENT_SECRET = 'test-naver-secret';
process.env.NAVER_REDIRECT_URI = 'http://localhost:3000/api/v1/auth/naver/callback';
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/v1/auth/google/callback';
process.env.HTTPS_PROXY = 'http://10.10.10.6:3128';

// ─── Mock 상태 ──────────────────────────────────────────────────────────────
let _queryResponses: Array<{ rows: any[]; insertId?: number }> = [];
let _qIdx = 0;

const mockClient = {
  query: async (_sql: string, _params?: any[]) => {
    const r = _queryResponses[_qIdx] ?? { rows: [] };
    _qIdx++;
    return r;
  },
  release: () => {},
};

const mockPool = {
  query: async (_sql: string, _params?: any[]) => {
    const r = _queryResponses[_qIdx] ?? { rows: [] };
    _qIdx++;
    return r;
  },
  connect: async () => mockClient,
};

function setQueries(...results: Array<{ rows: any[]; insertId?: number }>) {
  _queryResponses = results;
  _qIdx = 0;
}

// ─── axios Mock ─────────────────────────────────────────────────────────────
let _axiosPostResponse: any = { data: {} };
let _axiosGetResponse: any = { data: {} };
let _axiosPostShouldThrow = false;

const mockAxios: any = {
  post: async (..._args: any[]) => {
    if (_axiosPostShouldThrow) throw new Error('Network error');
    return _axiosPostResponse;
  },
  get: async (..._args: any[]) => _axiosGetResponse,
  defaults: { httpsAgent: null, httpAgent: null, proxy: false },
};

// ─── require.cache 주입 ──────────────────────────────────────────────────────
require.cache[require.resolve('../config/database')] = {
  id: require.resolve('../config/database'),
  filename: require.resolve('../config/database'),
  loaded: true,
  exports: { __esModule: true, default: mockPool },
  paths: [], children: [], parent: null,
} as any;

require.cache[require.resolve('axios')] = {
  id: require.resolve('axios'),
  filename: require.resolve('axios'),
  loaded: true,
  exports: { __esModule: true, default: mockAxios },
  paths: [], children: [], parent: null,
} as any;

require.cache[require.resolve('../utils/logger')] = {
  id: require.resolve('../utils/logger'),
  filename: require.resolve('../utils/logger'),
  loaded: true,
  exports: { __esModule: true, logAuth: () => {} },
  paths: [], children: [], parent: null,
} as any;

require.cache[require.resolve('https-proxy-agent')] = {
  id: require.resolve('https-proxy-agent'),
  filename: require.resolve('https-proxy-agent'),
  loaded: true,
  exports: { __esModule: true, HttpsProxyAgent: class { constructor(_url: string) {} } },
  paths: [], children: [], parent: null,
} as any;

const {
  getKakaoAuthUrl,
  handleKakaoCallback,
  getNaverAuthUrl,
  handleNaverCallback,
  getGoogleAuthUrl,
  handleGoogleCallback,
} = require('../controllers/socialAuthController');

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

function mockReqRes(body: any = {}, params: any = {}, query: any = {}, headers: any = {}, user: any = { id: 1 }) {
  const req: any = { body, params, query, headers, user };
  const res: any = {
    statusCode: 200,
    body: null as any,
    redirectUrl: null as string | null,
    status(code: number) { this.statusCode = code; return this; },
    json(b: any) { this.body = b; return this; },
    redirect(url: string) { this.redirectUrl = url; this.statusCode = 302; },
  };
  return { req, res };
}

(async () => {
  console.log('\n========================================');
  console.log('  🔍 SOCIAL AUTH CONTROLLER 점검 시작');
  console.log('========================================');

  // ── getKakaoAuthUrl ──────────────────────────────────────────────────────────
  console.log('\n▶ getKakaoAuthUrl');

  console.log('\n[1] 인증 없이 URL 생성 → authUrl 반환');
  {
    const { req, res } = mockReqRes({}, {}, {}, {});
    getKakaoAuthUrl(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
    check('authUrl 포함', typeof res.body?.authUrl === 'string' && res.body.authUrl.includes('kauth.kakao.com'));
  }

  console.log('\n[2] JWT 헤더로 URL 생성 → state에 userId 포함');
  {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 42, email: 'a@b.com', role: 'user' }, 'test-secret');
    const { req, res } = mockReqRes({}, {}, {}, { authorization: `Bearer ${token}` });
    getKakaoAuthUrl(req, res);
    check('200 반환', res.statusCode === 200);
    check('state에 userId(:42) 포함', res.body?.authUrl?.includes(':42'));
  }

  // ── handleKakaoCallback ──────────────────────────────────────────────────────
  console.log('\n▶ handleKakaoCallback');

  console.log('\n[3] code 없음 → missing_code redirect');
  {
    setQueries();
    _axiosPostShouldThrow = false;
    const { req, res } = mockReqRes({}, {}, {});
    await handleKakaoCallback(req, res);
    check('302 redirect', res.statusCode === 302);
    check('missing_code 포함', res.redirectUrl?.includes('missing_code') ?? false);
  }

  console.log('\n[4] axios 실패 → oauth_failed redirect');
  {
    setQueries();
    _axiosPostShouldThrow = true;
    const { req, res } = mockReqRes({}, {}, { code: 'valid-code' });
    await handleKakaoCallback(req, res);
    _axiosPostShouldThrow = false;
    check('302 redirect', res.statusCode === 302);
    check('oauth_failed 포함', res.redirectUrl?.includes('oauth_failed') ?? false);
  }

  console.log('\n[5] 기존 카카오 유저 → JWT redirect');
  {
    _axiosPostResponse = { data: { access_token: 'kakao-access-token' } };
    _axiosGetResponse = {
      data: {
        id: 99999,
        kakao_account: { profile: { nickname: '카카오유저' } },
      },
    };
    // provider_id로 유저 찾기 → 1건 반환
    setQueries({ rows: [{ id: 5, email: 'kakao@test.com', name: '카카오유저', role: 'user', provider: 'kakao' }] });
    const { req, res } = mockReqRes({}, {}, { code: 'valid-code', state: 'randomstate' });
    await handleKakaoCallback(req, res);
    check('302 redirect', res.statusCode === 302);
    check('token 포함', res.redirectUrl?.includes('token=') ?? false);
    check('oauth_failed 미포함', !res.redirectUrl?.includes('oauth_failed'));
  }

  console.log('\n[6] 미연동 카카오 계정 → not_linked redirect');
  {
    _axiosPostResponse = { data: { access_token: 'kakao-access-token' } };
    _axiosGetResponse = {
      data: {
        id: 88888,
        kakao_account: { profile: { nickname: '미연동유저' } },
      },
    };
    // provider_id로 조회 → 없음, 구버전 조회 → 없음
    setQueries({ rows: [] }, { rows: [] });
    const { req, res } = mockReqRes({}, {}, { code: 'valid-code', state: 'randomstate' });
    await handleKakaoCallback(req, res);
    check('302 redirect', res.statusCode === 302);
    check('not_linked 포함', res.redirectUrl?.includes('not_linked') ?? false);
  }

  // ── getNaverAuthUrl ──────────────────────────────────────────────────────────
  console.log('\n▶ getNaverAuthUrl');

  console.log('\n[7] 네이버 URL 생성');
  {
    const { req, res } = mockReqRes({}, {}, {}, {});
    getNaverAuthUrl(req, res);
    check('200 반환', res.statusCode === 200);
    check('authUrl 포함', res.body?.authUrl?.includes('nid.naver.com') ?? false);
  }

  // ── handleNaverCallback ──────────────────────────────────────────────────────
  console.log('\n▶ handleNaverCallback');

  console.log('\n[8] code 없음 → missing_code redirect');
  {
    setQueries();
    _axiosPostShouldThrow = false;
    const { req, res } = mockReqRes({}, {}, {});
    await handleNaverCallback(req, res);
    check('302 redirect', res.statusCode === 302);
    check('missing_code 포함', res.redirectUrl?.includes('missing_code') ?? false);
  }

  // ── getGoogleAuthUrl ─────────────────────────────────────────────────────────
  console.log('\n▶ getGoogleAuthUrl');

  console.log('\n[9] 구글 URL 생성');
  {
    const { req, res } = mockReqRes({}, {}, {}, {});
    getGoogleAuthUrl(req, res);
    check('200 반환', res.statusCode === 200);
    check('authUrl 포함', res.body?.authUrl?.includes('accounts.google.com') ?? false);
  }

  // ── handleGoogleCallback ─────────────────────────────────────────────────────
  console.log('\n▶ handleGoogleCallback');

  console.log('\n[10] code 없음 → missing_code redirect');
  {
    setQueries();
    _axiosPostShouldThrow = false;
    const { req, res } = mockReqRes({}, {}, {});
    await handleGoogleCallback(req, res);
    check('302 redirect', res.statusCode === 302);
    check('missing_code 포함', res.redirectUrl?.includes('missing_code') ?? false);
  }

  console.log('\n[11] 기존 구글 유저 → JWT redirect');
  {
    _axiosPostResponse = { data: { access_token: 'google-access-token', id_token: 'id-token' } };
    _axiosGetResponse = {
      data: {
        id: '77777',
        email: 'google@test.com',
        name: '구글유저',
      },
    };
    setQueries({ rows: [{ id: 7, email: 'google@test.com', name: '구글유저', role: 'user', provider: 'google' }] });
    const { req, res } = mockReqRes({}, {}, { code: 'valid-code', state: 'randomstate' });
    await handleGoogleCallback(req, res);
    check('302 redirect', res.statusCode === 302);
    check('token 포함', res.redirectUrl?.includes('token=') ?? false);
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
