import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  getTrends,
  getComparison,
  getRecommendations,
} from '../controllers/insightController';

const router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticate);

// 추세 분석
router.get('/trends', getTrends);

// 플랫폼 비교
router.get('/comparison', getComparison);

// AI 추천
router.get('/recommendations', getRecommendations);

export default router;
