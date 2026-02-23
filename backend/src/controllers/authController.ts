import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import pool from '../config/database';

// 회원가입
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    // 입력 검증
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
    
    // 사용자 생성
    const insertResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES (?, ?, ?, 'user')`,
      [email, hashedPassword, name]
    );
    
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [insertResult.insertId]
    );
    
    const user = result.rows[0];
    
    // JWT 토큰 생성
    const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '회원가입 중 오류가 발생했습니다.',
    });
  }
};

// 로그인
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '이메일과 비밀번호를 입력해주세요.',
      });
    }
    
    // 사용자 확인
    const result = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    // 디버깅 로그: 사용자 조회 결과
    console.log(`🔍 로그인 시도: ${email}`);
    
    if (result.rows.length === 0) {
      console.log('❌ 로그인 실패: 사용자를 찾을 수 없음');
      return res.status(401).json({
        error: 'USER_NOT_FOUND',
        message: '가입되지 않은 이메일입니다.',
      });
    }
    
    const user = result.rows[0];
    
    // 소셜 로그인으로만 가입한 경우 비밀번호가 없을 수 있음
    if (!user.password_hash) {
      console.log('❌ 로그인 실패: 비밀번호가 없는 계정 (소셜 가입 추정)');
      return res.status(400).json({
        error: 'SOCIAL_ACCOUNT',
        message: '소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요.',
      });
    }

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`🔐 비밀번호 검증 결과: ${isMatch ? '일치' : '불일치'}`);
    
    if (!isMatch) {
      return res.status(401).json({
        error: 'INVALID_PASSWORD',
        message: '비밀번호가 일치하지 않습니다.',
      });
    }
    
    // DB의 provider 정보 확인, 없으면 email로 기본값
    const actualProvider = user.provider || 'email';

    // JWT 토큰 생성
    const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, provider: actualProvider },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );
    
    res.json({
      user: {
        id: user.id, // 사용자 ID 필드 추가
        email: user.email,
        name: user.name,
        role: user.role,
        provider: actualProvider,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '로그인 중 오류가 발생했습니다.',
    });
  }
};

// 이메일 중복 체크
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
    
    res.json({
      available: isAvailable,
      message: isAvailable ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.',
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '이메일 확인 중 오류가 발생했습니다.',
    });
  }
};

// 내 정보 조회
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // provider, provider_id 컬럼 추가 조회
    const result = await pool.query(
      'SELECT id, email, name, role, created_at, password_hash, provider, provider_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    
    const user = result.rows[0];
    
    // provider 결정 로직 개선
    // 1. DB의 provider 컬럼 우선 사용
    let provider = user.provider || 'email';
    
    // 2. 만약 provider가 email/local인데 password_hash가 소셜 형식이면 (구 데이터 호환)
    if ((provider === 'email' || provider === 'local') && user.password_hash) {
      if (user.password_hash.startsWith('NAVER:')) provider = 'naver';
      else if (user.password_hash.startsWith('KAKAO:')) provider = 'kakao';
      else if (user.password_hash.startsWith('GOOGLE:')) provider = 'google';
    }

    // 3. provider_id가 존재하면 해당 소셜로 덮어씀 (신규 연동 로직 반영)
    if (user.provider_id) {
       if (user.provider_id.startsWith('NAVER:')) provider = 'naver';
       else if (user.provider_id.startsWith('KAKAO:')) provider = 'kakao';
       else if (user.provider_id.startsWith('GOOGLE:')) provider = 'google';
    }

    const { password_hash, provider_id, ...userWithoutSensitive } = user;
    
    // 프론트엔드에 provider 정보 전달
    res.json({ user: { ...userWithoutSensitive, provider } });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
    });
  }
};
