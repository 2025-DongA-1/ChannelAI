/**
 * 점검 스크립트: authController (register, login, checkEmail, changePassword)
 * 실행: npx ts-node src/__tests__/check_auth_controller.ts
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// ─────────────────────────────────────────
// 환경변수 (import 전에 설정)
// ─────────────────────────────────────────
process.env.JWT_SECRET = 'test-secret-key-for-inspection';
process.env.NODE_ENV = 'test';

// ─────────────────────────────────────────
// DB Mock
// ─────────────────────────────────────────
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

// require 캐시에 mock 주입
require.cache[require.resolve('../config/database')] = {
  id: require.resolve('../config/database'),
  filename: require.resolve('../config/database'),
  loaded: true,
  exports: { __esModule: true, default: mockPool },
  paths: [],
  children: [],
  parent: null,
} as any;

require.cache[require.resolve('../utils/logger')] = {
  id: require.resolve('../utils/logger'),
  filename: require.resolve('../utils/logger'),
  loaded: true,
  exports: { __esModule: true, logAuth: () => {} },
  paths: [],
  children: [],
  parent: null,
} as any;

// mock 주입 후 controller import
const {
  register,
  login,
  checkEmail,
  changePassword,
} = require('../controllers/authController');

// ─────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────
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

function mockReqRes(body: any = {}, query: any = {}, user: any = null) {
  const req: any = { body, query, user };
  const res: any = {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(b: any) { this.body = b; return this; },
  };
  return { req, res };
}

// ─────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────
(async () => {
  console.log('\n========================================');
  console.log('  🔍 AUTH CONTROLLER 점검 시작');
  console.log('========================================');

  // ══════════════════════════════════════════
  // [register]
  // ══════════════════════════════════════════
  console.log('\n▶ register');

  console.log('\n[1] 필수 필드 누락 (name 없음)');
  {
    const { req, res } = mockReqRes({ email: 'a@a.com', password: '123456' });
    await register(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = INVALID_INPUT', res.body?.error === 'INVALID_INPUT');
  }

  console.log('\n[2] 이메일 누락');
  {
    const { req, res } = mockReqRes({ password: '123456', name: '홍길동' });
    await register(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = INVALID_INPUT', res.body?.error === 'INVALID_INPUT');
  }

  console.log('\n[3] 중복 이메일 (DB에 기존 유저 있음)');
  {
    setMockDB([{ id: 99 }]);
    const { req, res } = mockReqRes({ email: 'dup@test.com', password: '123456', name: '중복' });
    await register(req, res);
    check('409 반환', res.statusCode === 409);
    check('error = EMAIL_EXISTS', res.body?.error === 'EMAIL_EXISTS');
  }

  console.log('\n[4] 정상 회원가입');
  {
    let callCount = 0;
    mockPool.query = async () => {
      callCount++;
      if (callCount === 1) return { rows: [], insertId: 0 }; // 중복 없음
      return { rows: [], insertId: 5 };                       // INSERT 결과
    };

    const { req, res } = mockReqRes({ email: 'new@test.com', password: '123456', name: '신규' });
    await register(req, res);

    check('201 반환', res.statusCode === 201);
    check('token 포함', typeof res.body?.token === 'string');
    check('user.email 일치', res.body?.user?.email === 'new@test.com');
    check('user.role = user', res.body?.user?.role === 'user');
    check('JWT 디코딩 가능', (() => {
      try {
        const d: any = jwt.verify(res.body.token, process.env.JWT_SECRET!);
        return d.id === 5 && d.email === 'new@test.com';
      } catch { return false; }
    })());

    mockPool.query = async () => ({ rows: _mockRows, insertId: _mockInsertId });
  }

  // ══════════════════════════════════════════
  // [login]
  // ══════════════════════════════════════════
  console.log('\n▶ login');

  console.log('\n[5] 필수 필드 누락 (password 없음)');
  {
    const { req, res } = mockReqRes({ email: 'a@a.com' });
    await login(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = INVALID_INPUT', res.body?.error === 'INVALID_INPUT');
  }

  console.log('\n[6] 존재하지 않는 이메일');
  {
    setMockDB([]);
    const { req, res } = mockReqRes({ email: 'none@test.com', password: '123456' });
    await login(req, res);
    check('401 반환', res.statusCode === 401);
    check('error = INVALID_CREDENTIALS', res.body?.error === 'INVALID_CREDENTIALS');
  }

  console.log('\n[7] 비밀번호 불일치');
  {
    const hashed = await bcrypt.hash('correct-password', 10);
    setMockDB([{ id: 1, email: 'user@test.com', password_hash: hashed, role: 'user', provider: 'email' }]);
    const { req, res } = mockReqRes({ email: 'user@test.com', password: 'wrong-password' });
    await login(req, res);
    check('401 반환', res.statusCode === 401);
    check('error = INVALID_CREDENTIALS', res.body?.error === 'INVALID_CREDENTIALS');
  }

  console.log('\n[8] 소셜 로그인 계정에 이메일 로그인 시도');
  {
    setMockDB([{ id: 2, email: 'social@test.com', password_hash: null, role: 'user', provider: 'kakao' }]);
    const { req, res } = mockReqRes({ email: 'social@test.com', password: 'anything' });
    await login(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = SOCIAL_ACCOUNT', res.body?.error === 'SOCIAL_ACCOUNT');
  }

  console.log('\n[9] 정상 로그인');
  {
    const hashed = await bcrypt.hash('mypassword', 10);
    setMockDB([{ id: 10, email: 'login@test.com', password_hash: hashed, role: 'user', provider: 'email', name: '사용자', plan: null }]);
    const { req, res } = mockReqRes({ email: 'login@test.com', password: 'mypassword' });
    await login(req, res);
    check('200 반환', res.statusCode === 200);
    check('token 포함', typeof res.body?.token === 'string');
    check('user.id = 10', res.body?.user?.id === 10);
    check('user.email 일치', res.body?.user?.email === 'login@test.com');
    check('JWT 디코딩 가능', (() => {
      try {
        const d: any = jwt.verify(res.body.token, process.env.JWT_SECRET!);
        return d.id === 10;
      } catch { return false; }
    })());
  }

  console.log('\n[10] 이메일 없음 vs 비밀번호 틀림 → 동일 에러 코드 (열거 공격 방지)');
  {
    setMockDB([]);
    const { req: req1, res: res1 } = mockReqRes({ email: 'none@test.com', password: '123456' });
    await login(req1, res1);

    const hashed = await bcrypt.hash('correct', 10);
    setMockDB([{ id: 1, email: 'exist@test.com', password_hash: hashed, role: 'user' }]);
    const { req: req2, res: res2 } = mockReqRes({ email: 'exist@test.com', password: 'wrong' });
    await login(req2, res2);

    check('두 경우 모두 401', res1.statusCode === 401 && res2.statusCode === 401);
    check('동일한 error 코드', res1.body?.error === res2.body?.error);
    check('동일한 message', res1.body?.message === res2.body?.message);
  }

  // ══════════════════════════════════════════
  // [checkEmail]
  // ══════════════════════════════════════════
  console.log('\n▶ checkEmail');

  console.log('\n[11] email 쿼리 파라미터 없음');
  {
    const { req, res } = mockReqRes({}, {});
    await checkEmail(req, res);
    check('400 반환', res.statusCode === 400);
  }

  console.log('\n[12] 사용 가능한 이메일');
  {
    setMockDB([]);
    const { req, res } = mockReqRes({}, { email: 'free@test.com' });
    await checkEmail(req, res);
    check('200 반환', res.statusCode === 200);
    check('available = true', res.body?.available === true);
  }

  console.log('\n[13] 이미 사용 중인 이메일');
  {
    setMockDB([{ id: 1 }]);
    const { req, res } = mockReqRes({}, { email: 'taken@test.com' });
    await checkEmail(req, res);
    check('200 반환', res.statusCode === 200);
    check('available = false', res.body?.available === false);
  }

  // ══════════════════════════════════════════
  // [changePassword]
  // ══════════════════════════════════════════
  console.log('\n▶ changePassword');

  console.log('\n[14] currentPassword 누락');
  {
    const { req, res } = mockReqRes({ newPassword: 'newpass' });
    req.user = { id: 1 };
    await changePassword(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = INVALID_INPUT', res.body?.error === 'INVALID_INPUT');
  }

  console.log('\n[15] 새 비밀번호 6자 미만');
  {
    const { req, res } = mockReqRes({ currentPassword: 'old123', newPassword: '123' });
    req.user = { id: 1 };
    await changePassword(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = INVALID_INPUT', res.body?.error === 'INVALID_INPUT');
  }

  console.log('\n[16] 소셜 계정 비밀번호 변경 시도');
  {
    setMockDB([{ password_hash: 'KAKAO:abc123' }]);
    const { req, res } = mockReqRes({ currentPassword: 'old123', newPassword: 'newpass123' });
    req.user = { id: 2 };
    await changePassword(req, res);
    check('400 반환', res.statusCode === 400);
    check('error = SOCIAL_ACCOUNT', res.body?.error === 'SOCIAL_ACCOUNT');
  }

  console.log('\n[17] 현재 비밀번호 불일치');
  {
    const hashed = await bcrypt.hash('correct-current', 10);
    setMockDB([{ password_hash: hashed }]);
    const { req, res } = mockReqRes({ currentPassword: 'wrong-current', newPassword: 'newpass123' });
    req.user = { id: 1 };
    await changePassword(req, res);
    check('401 반환', res.statusCode === 401);
    check('error = WRONG_PASSWORD', res.body?.error === 'WRONG_PASSWORD');
  }

  console.log('\n[18] 정상 비밀번호 변경');
  {
    const hashed = await bcrypt.hash('old-password', 10);
    mockPool.query = async (sql: string) => {
      if (sql.includes('SELECT')) return { rows: [{ password_hash: hashed }], insertId: 0 };
      return { rows: [], insertId: 0 };
    };

    const { req, res } = mockReqRes({ currentPassword: 'old-password', newPassword: 'new-password-123' });
    req.user = { id: 1 };
    await changePassword(req, res);
    check('200 반환', res.statusCode === 200);
    check('성공 메시지 포함', typeof res.body?.message === 'string');

    mockPool.query = async () => ({ rows: _mockRows, insertId: _mockInsertId });
  }

  // ─────────────────────────────────────────
  // 최종 결과
  // ─────────────────────────────────────────
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
