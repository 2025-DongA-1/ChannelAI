/**
 * reportRoutes.ts
 * 리포트 이메일 발송 라우트
 */
import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  triggerWeeklyReport,
  triggerDailyReport,
  triggerTestReport,
} from '../controllers/reportController';

const router = Router();

// POST /api/v1/report/weekly  → 전체 사용자 주간 리포트 발송 (인증 필요)
router.post('/weekly', authenticate, triggerWeeklyReport);

// POST /api/v1/report/daily   → 전체 사용자 일간 리포트 발송 (인증 필요)
router.post('/daily', authenticate, triggerDailyReport);

// POST /api/v1/report/test    → 테스트 발송 (인증 필요)
router.post('/test', authenticate, triggerTestReport);

export default router;
