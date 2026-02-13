import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import pool from '../config/database';

// 회원가입
export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
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
    const existingUser = await client.query(
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
    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES (?, ?, ?, 'user')`,
      [email, hashedPassword, name]
    );
    
    const result = await client.query(
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
  } finally {
    client.release();
  }
};

// 로그인
export const login = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { email, password } = req.body;
    
    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '이메일과 비밀번호를 입력해주세요.',
      });
    }
    
    // 사용자 조회
    const result = await client.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = ? AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }
    
    const user = result.rows[0];
    
    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }
    
    // JWT 토큰 생성
    const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '로그인 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 이메일 중복 체크
export const checkEmail = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '이메일을 입력해주세요.',
      });
    }
    
    const result = await client.query(
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
  } finally {
    client.release();
  }
};

// 내 정보 조회
export const getMe = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as any).user.id;
    
    const result = await client.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};
