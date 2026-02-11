import { Router } from 'express';
import { register, login, getMe, checkEmail } from '../controllers/authController';
import {
  getKakaoAuthUrl,
  handleKakaoCallback,
  getNaverAuthUrl,
  handleNaverCallback,
  getGoogleAuthUrl,
  handleGoogleCallback,
  getKarrotAuthUrl,
  handleKarrotCallback,
} from '../controllers/socialAuthController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 이메일 중복 체크
router.get('/check-email', checkEmail);

// 회원가입
router.post('/register', register);

// 로그인
router.post('/login', login);

// 내 정보 조회 (인증 필요)
router.get('/me', authenticate, getMe);

// 소셜 로그인 - 카카오
router.get('/kakao', getKakaoAuthUrl);
router.get('/kakao/callback', handleKakaoCallback);

// 소셜 로그인 - 네이버
router.get('/naver', getNaverAuthUrl);
router.get('/naver/callback', handleNaverCallback);

// 소셜 로그인 - 구글
router.get('/google', getGoogleAuthUrl);
router.get('/google/callback', handleGoogleCallback);

// 광고 플랫폼 연동 - 당근마켓
router.get('/karrot', getKarrotAuthUrl);
router.get('/karrot/callback', handleKarrotCallback);

export default router;
