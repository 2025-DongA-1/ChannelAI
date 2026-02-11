import { Router } from 'express';
import {
  getSummary,
  getChannelPerformance,
  getInsights,
  getBudgetStatus
} from '../controllers/dashboardController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 대시보드 요약
router.get('/summary', getSummary);

// 채널별 성과
router.get('/channel-performance', getChannelPerformance);

// 인사이트
router.get('/insights', getInsights);

// 예산 현황
router.get('/budget', getBudgetStatus);

export default router;
