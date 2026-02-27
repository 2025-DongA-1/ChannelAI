import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import pool from '../config/database';
import axios from 'axios';

/**
 * 카카오 로그인 URL 생성
 */
export const getKakaoAuthUrl = (req: Request, res: Response) => {
  let state = Math.random().toString(36).substring(7);

  // [연동 기능 추가] 헤더에 토큰이 있다면 state에 userId 심기
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'default-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      if (decoded && decoded.id) {
        state = `${state}:${decoded.id}`;
      }
    } catch (error) {
      console.warn('[Kakao Auth] Invalid token for linking');
    }
  }

  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}&response_type=code&state=${state}`;
  
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
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/me?error=missing_code`);
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
    const kakaoId = String(kakaoUser.id);
    const authId = `KAKAO:${kakaoId}`; // 카카오 고유 ID

    const name = kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자';

    // [연동 기능 추가] state 파라미터에서 userId 추출
    let linkingUserId: string | null = null;
    if (typeof state === 'string' && state.includes(':')) {
      const parts = state.split(':');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        linkingUserId = parts[1];
      }
    }

    if (linkingUserId) {
        // --- [계정 연동 모드] ---
        console.log(`[Kakao Auth] Processing linking for user ID: ${linkingUserId}`);

        // 이미 다른 계정에 연동되어 있는지 확인
        const existingLink = await client.query(
          'SELECT id FROM users WHERE provider_id = ?',
          [authId]
        );
        
        if (existingLink.rows.length > 0) {
          return res.redirect(`${frontendUrl}/me?error=already_linked_to_other`);
        }

        // 현재 사용자의 provider_id 업데이트
        await client.query(
          'UPDATE users SET provider = ?, provider_id = ? WHERE id = ?',
          ['kakao', authId, linkingUserId]
        );

        console.log(`[Kakao Auth] Successfully linked Kakao ID ${authId} to user ${linkingUserId}`);
        return res.redirect(`${frontendUrl}/me?success=kakao_linked`);

    } else {
        // --- [일반 로그인 모드] ---
        // 3. 카카오 고유 ID로 사용자 찾기
        let idResult = await client.query(
          'SELECT * FROM users WHERE provider_id = ?',
          [authId]
        );

        // (하위 호환성) 예전 방식 체크
        if (idResult.rows.length === 0) {
          const oldUserResult = await client.query(
              'SELECT * FROM users WHERE password_hash = ?',
              [authId]
          );
          if (oldUserResult.rows.length > 0) {
                const oldUser = oldUserResult.rows[0];
                await client.query('UPDATE users SET provider = ?, provider_id = ? WHERE id = ?', ['kakao', authId, oldUser.id]);
                idResult = { rows: [oldUser] } as any;
          }
        }

        let user;

        if (idResult.rows.length > 0) {
          // 이미 연동된 사용자 -> 로그인 성공
          user = idResult.rows[0];
        } else {
          // 연동된 계정 없음 -> 에러 리턴 (자동 가입 차단)
          return res.redirect(`${frontendUrl}/me?error=kakao_not_linked`);
        }

        // 4. JWT 토큰 생성
        const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, provider: 'kakao' },
          secret,
          { expiresIn: '7d' }
        );

        // 5. 프론트엔드로 리다이렉트
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
    }
  } catch (error) {
    console.error('Kakao OAuth error:', error);
    res.redirect(`${frontendUrl}/me?error=oauth_failed`);
  } finally {
    client.release();
  }
};

/**
 * 네이버 로그인 URL 생성
 */
export const getNaverAuthUrl = (req: Request, res: Response) => {
  let state = Math.random().toString(36).substring(7);
  const redirectUri = process.env.NAVER_REDIRECT_URI!;
  const clientId = process.env.NAVER_CLIENT_ID;

  // [연동 기능 개선] 쿠키 대신 state 파라미터 활용
  // 헤더에 토큰이 있다면, state에 userId 심기 (형식: "랜덤값:유저ID")
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'default-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      if (decoded && decoded.id) {
        state = `${state}:${decoded.id}`;
        console.log(`[Naver Auth] Linking initiated with state: ${state}`);
      }
    } catch (error) {
      console.warn('[Naver Auth] Invalid token provided for linking');
    }
  }

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
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
      return res.redirect(`${frontendUrl}/me?error=missing_code`);
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
    const naverId = naverUser.id;
    const authId = `NAVER:${naverId}`; // 네이버 고유 ID
    
    // [연동 기능 개선] state 파라미터에서 userId 추출
    // 형식: "랜덤값:유저ID"
    let linkingUserId: string | null = null;
    if (typeof state === 'string' && state.includes(':')) {
      const parts = state.split(':');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        linkingUserId = parts[1];
      }
    }

    if (linkingUserId) {
      // --- [계정 연동 모드] ---
      console.log(`[Naver Auth] Processing linking for user ID: ${linkingUserId}`);
      
      // 이미 다른 계정에 연동되어 있는지 확인
      // password_hash가 아니라 provider_id를 확인합니다.
      const existingLink = await client.query(
        'SELECT id FROM users WHERE provider_id = ?',
        [authId]
      );
      
      if (existingLink.rows.length > 0) {
        // 이미 다른 계정에 연동된 네이버 ID임
        return res.redirect(`${frontendUrl}/me?error=already_linked_to_other`);
      }

      // 현재 사용자의 provider_id를 업데이트 (비밀번호 보존!)
      // 단점: 기존에 다른 소셜(예: 카카오)이 연동되어 있었다면 덮어씌워짐. (1인 1소셜)
      await client.query(
        'UPDATE users SET provider = ?, provider_id = ? WHERE id = ?',
        ['naver', authId, linkingUserId]
      );

      console.log(`[Naver Auth] Successfully linked Naver ID ${authId} to user ${linkingUserId}`);
      
      // 마이페이지로 이동
      return res.redirect(`${frontendUrl}/me?success=naver_linked`);

    } else {
      // --- [일반 로그인 모드] ---
      
      // 1. 네이버 고유 ID로 사용자 찾기 (provider_id 조회)
      let idResult = await client.query(
        'SELECT * FROM users WHERE provider_id = ?',
        [authId]
      );

      // (하위 호환성) 예전 방식(password_hash에 저장된 경우)도 체크
      if (idResult.rows.length === 0) {
        const oldUserResult = await client.query(
           'SELECT * FROM users WHERE password_hash = ?',
           [authId]
        );
        if (oldUserResult.rows.length > 0) {
          // 구 방식 유저 발견 -> 마이그레이션 (provider_id로 옮기고, password_hash는 초기화하거나 둠)
          const oldUser = oldUserResult.rows[0];
          await client.query('UPDATE users SET provider = ?, provider_id = ? WHERE id = ?', ['naver', authId, oldUser.id]);
          idResult = { rows: [oldUser] } as any;
        }
      }

      let user;

      if (idResult.rows.length > 0) {
        // 이미 연동된 사용자 -> 로그인 성공
        user = idResult.rows[0];
      } else {
        // 연동된 계정 없음 -> 에러 리턴
        return res.redirect(`${frontendUrl}/me?error=naver_not_linked`);
      }

      // 2. JWT 토큰 생성
      const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, provider: 'naver' },
        secret,
        { expiresIn: '7d' }
      );

      // 3. 프론트엔드로 리다이렉트
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
    }
  } catch (error) {
    console.error('Naver OAuth error:', error);
    res.redirect(`${frontendUrl}/me?error=oauth_failed`);
  } finally {
    client.release();
  }
};

/**
 * 구글 로그인 URL 생성
 */
export const getGoogleAuthUrl = (req: Request, res: Response) => {
  let state = Math.random().toString(36).substring(7);

  // [연동 기능 추가] 헤더에 토큰이 있다면 state에 userId 심기
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'default-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      if (decoded && decoded.id) {
        state = `${state}:${decoded.id}`;
      }
    } catch (error) {
      console.warn('[Google Auth] Invalid token for linking');
    }
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
  
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
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/me?error=missing_code`);
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
    const googleId = googleUser.id; 
    const authId = `GOOGLE:${googleId}`;
    const name = googleUser.name || '구글 사용자';

    // [연동 기능 추가] state 파라미터에서 userId 추출
    let linkingUserId: string | null = null;
    if (typeof state === 'string' && state.includes(':')) {
      const parts = state.split(':');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        linkingUserId = parts[1];
      }
    }

    if (linkingUserId) {
        // --- [계정 연동 모드] ---
        console.log(`[Google Auth] Processing linking for user ID: ${linkingUserId}`);

        // 이미 다른 계정에 연동되어 있는지 확인
        const existingLink = await client.query(
          'SELECT id FROM users WHERE provider_id = ?',
          [authId]
        );
        
        if (existingLink.rows.length > 0) {
          return res.redirect(`${frontendUrl}/me?error=already_linked_to_other`);
        }

        // 현재 사용자의 provider_id 업데이트
        await client.query(
          'UPDATE users SET provider = ?, provider_id = ? WHERE id = ?',
          ['google', authId, linkingUserId]
        );

        console.log(`[Google Auth] Successfully linked Google ID ${authId} to user ${linkingUserId}`);
        return res.redirect(`${frontendUrl}/me?success=google_linked`);

    } else {
        // --- [일반 로그인 모드] ---
        // 3. 구글 고유 ID로 사용자 찾기
        let idResult = await client.query(
          'SELECT * FROM users WHERE provider_id = ?',
          [authId]
        );

        // (하위 호환성) 예전 방식 체크
        if (idResult.rows.length === 0) {
          const oldUserResult = await client.query(
              'SELECT * FROM users WHERE password_hash = ?',
              [authId]
          );
          if (oldUserResult.rows.length > 0) {
                const oldUser = oldUserResult.rows[0];
                await client.query('UPDATE users SET provider = ?, provider_id = ? WHERE id = ?', ['google', authId, oldUser.id]);
                idResult = { rows: [oldUser] } as any;
          }
        }

        let user;

        if (idResult.rows.length > 0) {
          // 이미 연동된 사용자 -> 로그인 성공
          user = idResult.rows[0];
        } else {
          // 연동된 계정 없음 -> 에러 리턴 (자동 가입 차단)
          return res.redirect(`${frontendUrl}/me?error=google_not_linked`);
        }

        // 4. JWT 토큰 생성
        const secret: Secret = process.env.JWT_SECRET || 'default-secret-key';
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, provider: 'google' },
          secret,
          { expiresIn: '7d' }
        );

        // 5. 프론트엔드로 리다이렉트
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}`);
    }
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${frontendUrl}/me?error=oauth_failed`);
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
