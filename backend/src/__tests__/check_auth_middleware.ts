/**
 * 점검 스크립트: auth 미들웨어 (authenticate)
 * 실행: npx ts-node src/__tests__/check_auth_middleware.ts
 */

import jwt from 'jsonwebtoken';
import { authenticate } from '../middlewares/auth';

// ─────────────────────────────────────────
// 테스트용 유틸
// ─────────────────────────────────────────

const SECRET = 'test-secret-key-for-inspection';
process.env.JWT_SECRET = SECRET;

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

/** mock req / res / next 생성 */
function mockContext(authHeader?: string) {
  const req: any = {
    headers: authHeader ? { authorization: authHeader } : {},
  };
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next: next as any, isNextCalled: () => nextCalled };
}

// ─────────────────────────────────────────
// 테스트 케이스
// ─────────────────────────────────────────

console.log('\n========================================');
console.log('  🔍 AUTH 미들웨어 점검 시작');
console.log('========================================\n');

// ── 1. 유효한 JWT ──────────────────────────
console.log('[1] 유효한 JWT');
{
  const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'user' }, SECRET, { expiresIn: '1h' });
  const { req, res, next, isNextCalled } = mockContext(`Bearer ${token}`);

  authenticate(req, res, next);

  check('next() 호출됨', isNextCalled());
  check('req.user.id = 1', req.user?.id === 1);
  check('req.user.email 설정됨', req.user?.email === 'test@test.com');
  check('req.user.role 설정됨', req.user?.role === 'user');
  check('res.status 401 아님', res.statusCode === 200);
}

// ── 2. Authorization 헤더 없음 ─────────────
console.log('\n[2] Authorization 헤더 없음');
{
  const { req, res, next, isNextCalled } = mockContext(undefined);

  authenticate(req, res, next);

  check('next() 미호출', !isNextCalled());
  check('401 반환', res.statusCode === 401);
  check('error = UNAUTHORIZED', res.body?.error === 'UNAUTHORIZED');
}

// ── 3. Bearer 접두사 없음 ───────────────────
console.log('\n[3] "Bearer " 접두사 없이 토큰만 전달');
{
  const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'user' }, SECRET);
  const { req, res, next, isNextCalled } = mockContext(token); // Bearer 없음

  authenticate(req, res, next);

  check('next() 미호출', !isNextCalled());
  check('401 반환', res.statusCode === 401);
  check('error = UNAUTHORIZED', res.body?.error === 'UNAUTHORIZED');
}

// ── 4. 만료된 JWT ───────────────────────────
console.log('\n[4] 만료된 JWT');
{
  const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'user' }, SECRET, { expiresIn: -1 });
  const { req, res, next, isNextCalled } = mockContext(`Bearer ${token}`);

  authenticate(req, res, next);

  check('next() 미호출', !isNextCalled());
  check('401 반환', res.statusCode === 401);
  check('error = INVALID_TOKEN', res.body?.error === 'INVALID_TOKEN');
}

// ── 5. 잘못된 서명 JWT ──────────────────────
console.log('\n[5] 잘못된 시크릿으로 서명된 JWT');
{
  const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'user' }, 'wrong-secret');
  const { req, res, next, isNextCalled } = mockContext(`Bearer ${token}`);

  authenticate(req, res, next);

  check('next() 미호출', !isNextCalled());
  check('401 반환', res.statusCode === 401);
  check('error = INVALID_TOKEN', res.body?.error === 'INVALID_TOKEN');
}

// ── 6. 완전히 쓰레기 값 ─────────────────────
console.log('\n[6] 완전히 잘못된 토큰 문자열');
{
  const { req, res, next, isNextCalled } = mockContext('Bearer this.is.garbage');

  authenticate(req, res, next);

  check('next() 미호출', !isNextCalled());
  check('401 반환', res.statusCode === 401);
  check('error = INVALID_TOKEN', res.body?.error === 'INVALID_TOKEN');
}

// ── 7. authorize - 올바른 role ───────────────
console.log('\n[7] authorize - 올바른 role (admin 접근)');
{
  const { authorize } = require('../middlewares/auth');
  const req: any = { user: { id: 1, email: 'admin@test.com', role: 'admin' } };
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  authorize('admin')(req, res, next);

  check('next() 호출됨', nextCalled);
  check('403 아님', res.statusCode === 200);
}

// ── 8. authorize - 잘못된 role ──────────────
console.log('\n[8] authorize - 권한 없는 role (user → admin 접근 시도)');
{
  const { authorize } = require('../middlewares/auth');
  const req: any = { user: { id: 2, email: 'user@test.com', role: 'user' } };
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  authorize('admin')(req, res, next);

  check('next() 미호출', !nextCalled);
  check('403 반환', res.statusCode === 403);
  check('error = FORBIDDEN', res.body?.error === 'FORBIDDEN');
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
