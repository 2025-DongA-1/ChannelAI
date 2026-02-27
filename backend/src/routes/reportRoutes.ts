import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  triggerWeeklyReport,
  triggerDailyReport,
  triggerTestReport,
  triggerSendToEmail,
} from '../controllers/reportController';

const router = Router();

router.post('/weekly', authenticate, triggerWeeklyReport);
router.post('/daily', authenticate, triggerDailyReport);
router.post('/test', authenticate, triggerTestReport);
router.post('/send-to', authenticate, triggerSendToEmail);  // 특정 이메일로 테스트 발송

export default router;
