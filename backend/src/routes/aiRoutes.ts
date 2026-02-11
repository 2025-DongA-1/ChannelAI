import { Router } from 'express';
import { getAIRecommendation, checkModelStatus } from '../controllers/aiRecommendationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// AI 추천 (인증 필요)
router.post('/recommend', authenticate, getAIRecommendation);

// 모델 상태 확인
router.get('/status', checkModelStatus);

export default router;
