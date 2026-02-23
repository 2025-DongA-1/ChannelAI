import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import pool from '../config/database';

// JWT_SECRET 필수 체크 (서버 시작 시 한 번 체크하는 방식도 가능)
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const JWT_SECRET: Secret = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/* =========================
   로그인 예시 (JWT 발급 부분)
========================= */
export const login = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { email } = req.body;

    const result = await client.query(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const user = result.rows[0];

    // 🔥 fallback 제거된 JWT 발급
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    res.json({ token });
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

/* =========================
   이메일 중복 확인
========================= */
export const checkEmail = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { email } = req.query;

    const result = await client.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    const isAvailable = result.rows.length === 0;

    res.json({
      available: isAvailable,
      message: isAvailable
        ? '사용 가능한 이메일입니다.'
        : '이미 사용 중인 이메일입니다.',
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

/* =========================
   내 정보 조회
========================= */
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
};import { Request, Response } from 'express';
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

^G Help         ^O Write Out    ^W Where Is     ^K Cut          ^T Execute      ^C Location     M-U Undo
^X Exit         ^R Read File    ^\ Replace      ^U Paste        ^J Justify      ^/ Go To Line   M-E Redo
