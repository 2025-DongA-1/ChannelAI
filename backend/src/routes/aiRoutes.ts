import { Router } from 'express';
import { analyzeAndRecommend, getAgentStatus } from '../controllers/aiAgentController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// AI 마케팅 에이전트 분석 실행 (인증 필요)
router.post('/agent/analyze', authenticate, analyzeAndRecommend);

// AI 에이전트 상태 확인 (인증 필요)
router.get('/agent/status', authenticate, getAgentStatus);

export default router;
