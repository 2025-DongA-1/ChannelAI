import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { logAuth } from '../utils/logger';
import { ERROR_CODES, createErrorResponse } from '../constants/errorCodes';

// ──────────────────────────────────────────────────────────────
// 회원가입
// users 테이블 생성 후 user_profiles 테이블에 name 저장
// ──────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, code: ERROR_CODES.AUTH.INVALID_INPUT.code, message: '이메일, 비밀번호, 이름은 필수입니다.' });
    }

    // 이메일 중복 확인
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json(createErrorResponse(ERROR_CODES.AUTH.EMAIL_EXISTS));
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // users 테이블에 삽입 (name 컬럼 없음)
    const insertResult = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'user')`,
      [email, hashedPassword]
    );

    const newUserId = insertResult.insertId;

    // user_profiles 테이블에 name 저장
    await pool.query(
      `INSERT INTO user_profiles (user_id, name) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [newUserId, name]
    );

    // JWT 생성
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    const token = jwt.sign(
      { id: newUserId, email, role: 'user' },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    return res.status(201).json({
      user: { id: newUserId, email, name, role: 'user' },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '회원가입 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 로그인
// ──────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, code: ERROR_CODES.AUTH.INVALID_INPUT.code, message: '이메일과 비밀번호를 입력해주세요.' });
    }

    // users + user_profiles JOIN으로 name, plan 함께 조회
    const result = await pool.query(
      `SELECT u.*, up.name, up.plan
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.email = ?`,
      [email]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 로그인 시도: ${email}`);
    }

    if (result.rows.length === 0) {
      logAuth('Login Attempt Failed - User not found', false, { email });
      return res.status(401).json(createErrorResponse(ERROR_CODES.AUTH.INVALID_CREDENTIALS));
    }

    const user = result.rows[0];

    // 소셜 로그인 계정
    if (!user.password_hash) {
      logAuth('Login Attempt Failed - Used Email for Social Account', false, { email });
      return res.status(400).json(createErrorResponse(ERROR_CODES.AUTH.SOCIAL_ACCOUNT));
    }

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logAuth('Login Attempt Failed - Wrong Password', false, { email });
      return res.status(401).json(createErrorResponse(ERROR_CODES.AUTH.INVALID_CREDENTIALS));
    }

    const actualProvider = user.provider || 'email';

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, provider: actualProvider },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    logAuth('Login Successful', true, { email, userId: user.id });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? '',      // user_profiles.name
        role: user.role,
        provider: actualProvider,
        plan: user.plan ?? null,    // user_profiles.plan
      },
      token,
    });
  } catch (error) {
    logAuth('Login Error Resulting in Exception', false, { email: req.body?.email, error: String(error) });
    console.error('Login error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '로그인 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 이메일 중복 확인
// ──────────────────────────────────────────────────────────────
export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, code: ERROR_CODES.AUTH.INVALID_INPUT.code, message: '이메일을 입력해주세요.' });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    const isAvailable = result.rows.length === 0;
    return res.json({
      available: isAvailable,
      message: isAvailable ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.',
    });
  } catch (error) {
    console.error('Check email error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '이메일 확인 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 내 정보 조회 (user_profiles JOIN)
// ──────────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.created_at, u.password_hash,
              u.provider, u.provider_id, u.is_active,
              up.name, up.company_name, up.business_number, up.plan, up.phone_number
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(ERROR_CODES.AUTH.USER_NOT_FOUND));
    }

    const user = result.rows[0];

    // provider 결정
    let provider = user.provider || 'email';
    if ((provider === 'email' || provider === 'local') && user.password_hash) {
      if (user.password_hash.startsWith('NAVER:'))  provider = 'naver';
      else if (user.password_hash.startsWith('KAKAO:'))  provider = 'kakao';
      else if (user.password_hash.startsWith('GOOGLE:')) provider = 'google';
    }
    if (user.provider_id) {
      if (user.provider_id.startsWith('NAVER:'))  provider = 'naver';
      else if (user.provider_id.startsWith('KAKAO:'))  provider = 'kakao';
      else if (user.provider_id.startsWith('GOOGLE:')) provider = 'google';
    }

    const { password_hash, provider_id, ...rest } = user;

    return res.json({ user: { ...rest, provider } });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 프로필 수정 (이름, 이메일, 회사명, 사업자번호, 전화번호)
// PUT /api/v1/auth/me
// ──────────────────────────────────────────────────────────────
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, email, company_name, business_number, phone_number } = req.body;

    // 이메일 변경 요청이 있는 경우 중복 체크
    if (email) {
      const currentUser = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
      const currentEmail = currentUser.rows[0]?.email;

      if (email !== currentEmail) {
        const existing = await pool.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );
        if (existing.rows.length > 0) {
          return res.status(409).json(createErrorResponse(ERROR_CODES.AUTH.EMAIL_EXISTS));
        }
        // 이메일 업데이트
        await pool.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
      }
    }

    // user_profiles 업데이트 (없으면 생성)
    await pool.query(
      `INSERT INTO user_profiles (user_id, name, company_name, business_number, phone_number)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = COALESCE(?, name),
         company_name = COALESCE(?, company_name),
         business_number = COALESCE(?, business_number),
         phone_number = COALESCE(?, phone_number)`,
      [userId, name, company_name, business_number, phone_number,
       name, company_name, business_number, phone_number]
    );

    // 최신 정보 조회해서 반환
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.provider,
              up.name, up.company_name, up.business_number, up.plan, up.phone_number
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    return res.json({
      message: '프로필이 수정되었습니다.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '프로필 수정 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 비밀번호 변경
// PUT /api/v1/auth/me/password
// ──────────────────────────────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, code: ERROR_CODES.AUTH.INVALID_INPUT.code, message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, code: ERROR_CODES.AUTH.INVALID_INPUT.code, message: '새 비밀번호는 6자 이상이어야 합니다.' });
    }

    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(ERROR_CODES.AUTH.USER_NOT_FOUND));
    }

    const user = result.rows[0];

    // 소셜 로그인 계정은 비밀번호 없음
    if (!user.password_hash || user.password_hash.startsWith('KAKAO:') ||
        user.password_hash.startsWith('NAVER:') || user.password_hash.startsWith('GOOGLE:')) {
      return res.status(400).json({ success: false, code: ERROR_CODES.AUTH.SOCIAL_ACCOUNT.code, message: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.' });
    }

    // 현재 비밀번호 확인
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json(createErrorResponse(ERROR_CODES.AUTH.WRONG_PASSWORD));
    }

    // 새 비밀번호 해싱 후 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    return res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '비밀번호 변경 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 구독 정보 조회
// GET /api/v1/auth/subscription
// ──────────────────────────────────────────────────────────────
export const getSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await pool.query(
      `SELECT plan, plan_started_at, plan_expires_at,
              pay_method, pay_auto_renew, pay_card_company, pay_card_last4, pay_monthly_amt
       FROM v_subscription WHERE user_id = ?`,
      [userId]
    );
    const row = result.rows[0] || {};
    return res.json({
      plan:             row.plan             ?? null,
      plan_started_at:  row.plan_started_at  ?? null,
      plan_expires_at:  row.plan_expires_at  ?? null,
      pay_method:       row.pay_method       ?? null,
      pay_auto_renew:   row.pay_auto_renew   ?? 1,
      pay_card_company: row.pay_card_company ?? null,
      pay_card_last4:   row.pay_card_last4   ?? null,
      pay_monthly_amt:  row.pay_monthly_amt  ?? null,
    });
  } catch (error) {
    console.error('GetSubscription error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '구독 정보 조회 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 구독 해지 (plan + 결제정보 모두 NULL)
// POST /api/v1/auth/subscription/cancel
// ──────────────────────────────────────────────────────────────
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    // user_profiles plan 초기화
    await pool.query(
      `UPDATE user_profiles SET plan = NULL WHERE user_id = ?`,
      [userId]
    );
    // payment_methods 자동갱신 OFF
    await pool.query(
      `UPDATE payment_methods SET auto_renew = 0 WHERE user_id = ?`,
      [userId]
    );

    // 결제 이력 기록 (해지)
    await pool.query(
      `INSERT INTO payments (user_id, amount, plan, status)
       VALUES (?, 0, 'PRO', 'cancelled')`,
      [userId]
    );

    return res.json({ message: '구독이 해지되었습니다.' });
  } catch (error) {
    console.error('CancelSubscription error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '구독 해지 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 구독 활성화 (결제 완료 후 호출)
// POST /api/v1/auth/subscription/activate
// body: { months? }
// ──────────────────────────────────────────────────────────────
export const activateSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { months = 1 } = req.body;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + Number(months));

    // user_profiles plan = PRO
    await pool.query(
      `INSERT INTO user_profiles (user_id, plan) VALUES (?, 'PRO')
       ON DUPLICATE KEY UPDATE plan = 'PRO'`,
      [userId]
    );
    
    // payment_methods upsert
    await pool.query(
      `INSERT INTO payment_methods (user_id, method, monthly_amount, auto_renew)
       VALUES (?, 'card', 9900, 1)
       ON DUPLICATE KEY UPDATE monthly_amount = 9900, auto_renew = 1`,
      [userId]
    );

    // 결제 이력 기록
    await pool.query(
      `INSERT INTO payments (user_id, plan, amount, status, plan_started_at, plan_expires_at, paid_at)
       VALUES (?, 'PRO', 9900, 'success', ?, ?, NOW())`,
      [userId, now, expiresAt]
    );

    return res.json({ message: '구독이 활성화되었습니다.', plan_expires_at: expiresAt });
  } catch (error) {
    console.error('ActivateSubscription error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '구독 활성화 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 자동 갱신 설정 변경
// PATCH /api/v1/auth/subscription/auto-renew
// body: { auto_renew: 0 | 1 }
// ──────────────────────────────────────────────────────────────
export const updateAutoRenew = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { auto_renew } = req.body;
    if (auto_renew !== 0 && auto_renew !== 1) {
      return res.status(400).json({ success: false, code: ERROR_CODES.AUTH.INVALID_INPUT.code, message: 'auto_renew는 0 또는 1이어야 합니다.' });
    }
    
    await pool.query(
      `UPDATE payment_methods SET auto_renew = ? WHERE user_id = ?`,
      [auto_renew, userId]
    );
    return res.json({ message: '자동 갱신 설정이 변경되었습니다.', pay_auto_renew: auto_renew });
  } catch (error) {
    console.error('UpdateAutoRenew error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '자동 갱신 설정 변경 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// [TEST] 구독 만료일 현재로 초기화 (테스트 전용)
// POST /api/v1/auth/subscription/test-expire
// ──────────────────────────────────────────────────────────────
export const testExpireSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // v_subscription 뷰를 통해 자동 갱신 여부 등 구독 정보 조회
    const check = await pool.query(
      `SELECT pay_auto_renew as auto_renew FROM v_subscription WHERE user_id = ?`,
      [userId]
    );
    const autoRenew = (check.rows[0] as any)?.auto_renew ?? 1;

    if (autoRenew === 1) {
      // 자동 갱신 ON → 1개월 연장
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + 1);
      await pool.query(
        `UPDATE payments SET plan_expires_at = ?
         WHERE user_id = ? AND status = 'success'
         ORDER BY paid_at DESC LIMIT 1`,
        [newExpiry, userId]
      );
      return res.json({ message: '자동 갱신 ON: 구독이 1개월 연장되었습니다. (테스트)', plan_expires_at: newExpiry });
    } else {
      // 자동 갱신 OFF → FREE 전환
      await pool.query(
        `UPDATE user_profiles SET plan = NULL WHERE user_id = ?`,
        [userId]
      );
      return res.json({ message: '자동 갱신 OFF: FREE 요금제로 전환되었습니다. (테스트)', plan: null });
    }
  } catch (error) {
    console.error('TestExpireSubscription error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '테스트 실행 중 오류가 발생했습니다.' });
  }
};

// ──────────────────────────────────────────────────────────────
// 결제 수단 삭제
// DELETE /api/v1/auth/payment-method
// ──────────────────────────────────────────────────────────────
export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await pool.query(
      `DELETE FROM payment_methods WHERE user_id = ?`,
      [userId]
    );
    return res.json({ message: '결제 수단이 삭제되었습니다.' });
  } catch (error) {
    console.error('DeletePaymentMethod error:', error);
    return res.status(500).json({ success: false, code: ERROR_CODES.AUTH.SERVER_ERROR.code, message: '결제 수단 삭제 중 오류가 발생했습니다.' });
  }
};
