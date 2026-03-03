import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

// ──────────────────────────────────────────────────────────────
// 회원가입
// users 테이블 생성 후 user_profiles 테이블에 name 저장
// ──────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '이메일, 비밀번호, 이름은 필수입니다.',
      });
    }

    // 이메일 중복 확인
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'EMAIL_EXISTS',
        message: '이미 사용 중인 이메일입니다.',
      });
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
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: '회원가입 중 오류가 발생했습니다.',
    });
  }
};

// ──────────────────────────────────────────────────────────────
// 로그인
// ──────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '이메일과 비밀번호를 입력해주세요.',
      });
    }

    // users + user_profiles JOIN으로 name 함께 조회
    const result = await pool.query(
      `SELECT u.*, up.name
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.email = ?`,
      [email]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 로그인 시도: ${email}`);
    }

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const user = result.rows[0];

    // 소셜 로그인 계정
    if (!user.password_hash) {
      return res.status(400).json({
        error: 'SOCIAL_ACCOUNT',
        message: '소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요.',
      });
    }

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const actualProvider = user.provider || 'email';

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, provider: actualProvider },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? '',      // user_profiles.name
        role: user.role,
        provider: actualProvider,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: '로그인 중 오류가 발생했습니다.',
    });
  }
};

// ──────────────────────────────────────────────────────────────
// 이메일 중복 확인
// ──────────────────────────────────────────────────────────────
export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '이메일을 입력해주세요.',
      });
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
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: '이메일 확인 중 오류가 발생했습니다.',
    });
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
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
      });
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
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
    });
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
          return res.status(409).json({
            error: 'EMAIL_EXISTS',
            message: '이미 사용 중인 이메일입니다.',
          });
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
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: '프로필 수정 중 오류가 발생했습니다.',
    });
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
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '새 비밀번호는 6자 이상이어야 합니다.',
      });
    }

    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' });
    }

    const user = result.rows[0];

    // 소셜 로그인 계정은 비밀번호 없음
    if (!user.password_hash || user.password_hash.startsWith('KAKAO:') ||
        user.password_hash.startsWith('NAVER:') || user.password_hash.startsWith('GOOGLE:')) {
      return res.status(400).json({
        error: 'SOCIAL_ACCOUNT',
        message: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.',
      });
    }

    // 현재 비밀번호 확인
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'WRONG_PASSWORD',
        message: '현재 비밀번호가 올바르지 않습니다.',
      });
    }

    // 새 비밀번호 해싱 후 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    return res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: '비밀번호 변경 중 오류가 발생했습니다.',
    });
  }
};
