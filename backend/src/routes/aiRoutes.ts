import { Router } from 'express';
import { analyzeAndRecommend, getAgentStatus, getAdvancedMetrics, getMLRealtime, generateLLMInsights, generatePlatformInsights } from '../controllers/aiAgentController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// AI 마케팅 에이전트 분석 실행 (인증 필요)
router.post('/agent/analyze', authenticate, analyzeAndRecommend);

// AI 에이전트 상태 확인 (인증 필요)
router.get('/agent/status', authenticate, getAgentStatus);

// AI 고급 평가 리포트 조회 (인증 필요)
router.get('/agent/advanced-metrics', authenticate, getAdvancedMetrics);

// 실시간 ML 예측 - XGBoost + RandomForest (인증 필요)
router.get('/agent/ml-realtime', authenticate, getMLRealtime);

// 🤖 프론트엔드 데이터를 받아 OpenAI(LLM) 기반 마케팅 인사이트 텍스트 생성 (인증 필요)
router.post('/agent/generate-insights', authenticate, generateLLMInsights);

// 🤖 [추가됨] 플랫폼 성과 비교 분석 전용 엔드포인트
router.post('/agent/generate-platform-insights', authenticate, generatePlatformInsights);

export default router;
