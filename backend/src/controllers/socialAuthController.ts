import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import pool from '../config/database';
import axios from 'axios';

/**
 * 카카오 로그인 URL 생성
 */
export const getKakaoAuthUrl = (req: Request, res: Response) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}&response_type=code`;
  
  res.json({
    success: true,
    authUrl: kakaoAuthUrl,
  });
};

/**
 * 카카오 OAuth 콜백 처리
 */
export const handleKakaoCallback = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    // 1. 카카오 액세스 토큰 받기
    const tokenResponse = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.KAKAO_CLIENT_ID,
          redirect_uri: process.env.KAKAO_REDIRECT_URI,
          code,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. 카카오 사용자 정보 가져오기
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const kakaoUser = userResponse.data;
    const email = kakaoUser.kakao_account?.email;
    const name = kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자';

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=email_required`);
    }

    // 3. 기존 사용자 확인 또는 생성
    let user;
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
      
      // 마지막 로그인 시간 업데이트
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
    } else {
      // 새 사용자 생성
      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES (?, ?, ?, 'user')`,
        [email, 'KAKAO_OAUTH', name]
      );
      const newUser = await client.query(
        'SELECT id, email, name, company_name, role, created_at FROM users WHERE id = ?',
        [insertResult.insertId]
      );
      user = newUser.rows[0];
    }

    // 4. JWT 토큰 생성
    const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // 5. 프론트엔드로 리다이렉트
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
  } catch (error) {
    console.error('Kakao OAuth error:', error);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  } finally {
    client.release();
  }
};

/**
 * 네이버 로그인 URL 생성
 */
export const getNaverAuthUrl = (req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(7);
  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${process.env.NAVER_CLIENT_ID}&redirect_uri=${process.env.NAVER_REDIRECT_URI}&state=${state}`;
  
  res.json({
    success: true,
    authUrl: naverAuthUrl,
  });
};

/**
 * 네이버 OAuth 콜백 처리
 */
export const handleNaverCallback = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    // 1. 네이버 액세스 토큰 받기
    const tokenResponse = await axios.post(
      'https://nid.naver.com/oauth2.0/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.NAVER_CLIENT_ID,
          client_secret: process.env.NAVER_CLIENT_SECRET,
          code,
          state,
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. 네이버 사용자 정보 가져오기
    const userResponse = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const naverUser = userResponse.data.response;
    const email = naverUser.email;
    const name = naverUser.name || naverUser.nickname || '네이버 사용자';

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=email_required`);
    }

    // 3. 기존 사용자 확인 또는 생성
    let user;
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
      
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
    } else {
      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES (?, ?, ?, 'user')`,
        [email, 'NAVER_OAUTH', name]
      );
      const newUser = await client.query(
        'SELECT id, email, name, company_name, role, created_at FROM users WHERE id = ?',
        [insertResult.insertId]
      );
      user = newUser.rows[0];
    }

    // 4. JWT 토큰 생성
    const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // 5. 프론트엔드로 리다이렉트
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
  } catch (error) {
    console.error('Naver OAuth error:', error);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  } finally {
    client.release();
  }
};

/**
 * 구글 로그인 URL 생성
 */
export const getGoogleAuthUrl = (req: Request, res: Response) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=openid%20email%20profile`;
  
  res.json({
    success: true,
    authUrl: googleAuthUrl,
  });
};

/**
 * 구글 OAuth 콜백 처리
 */
export const handleGoogleCallback = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    // 1. 구글 액세스 토큰 받기
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. 구글 사용자 정보 가져오기
    const userResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const googleUser = userResponse.data;
    const email = googleUser.email;
    const name = googleUser.name || '구글 사용자';

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=email_required`);
    }

    // 3. 기존 사용자 확인 또는 생성
    let user;
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
      
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
    } else {
      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES (?, ?, ?, 'user')`,
        [email, 'GOOGLE_OAUTH', name]
      );
      const newUser = await client.query(
        'SELECT id, email, name, company_name, role, created_at FROM users WHERE id = ?',
        [insertResult.insertId]
      );
      user = newUser.rows[0];
    }

    // 4. JWT 토큰 생성
    const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // 5. 프론트엔드로 리다이렉트
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  } finally {
    client.release();
  }
};

/**
 * 당근마켓 광고 플랫폼 연동 URL 생성
 */
export const getKarrotAuthUrl = (req: Request, res: Response) => {
  const karrotAuthUrl = `https://business.daangn.com/oauth/authorize?client_id=${process.env.KARROT_CLIENT_ID}&redirect_uri=${process.env.KARROT_REDIRECT_URI}&response_type=code&scope=ads:read ads:write`;
  
  res.json({
    success: true,
    authUrl: karrotAuthUrl,
  });
};

/**
 * 당근마켓 OAuth 콜백 처리
 */
export const handleKarrotCallback = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/integration?error=missing_code&platform=karrot`);
    }

    // Mock: 임시 성공 처리
    console.log('당근마켓 OAuth 콜백 - Mock 처리');
    
    res.redirect(`${frontendUrl}/integration?success=true&platform=karrot`);
  } catch (error) {
    console.error('Karrot OAuth error:', error);
    res.redirect(`${frontendUrl}/integration?error=oauth_failed&platform=karrot`);
  } finally {
    client.release();
  }
};
