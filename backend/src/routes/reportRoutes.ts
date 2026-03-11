import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
// [2026-03-11 12:07] PDF 파일 업로드를 위한 multer import
import multer from 'multer';
import {
  triggerWeeklyReport,
  triggerDailyReport,
  triggerTestReport,
  triggerSendToEmail,
  getMonthlyReportData,
  generatePdfFromHtml,
  sendPdfByEmail,
} from '../controllers/reportController';

const router = Router();
// [2026-03-11 12:07] PDF 업로드용 multer 설정 (메모리 저장, 10MB 제한)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/weekly', authenticate, triggerWeeklyReport);
router.post('/daily', authenticate, triggerDailyReport);
router.post('/test', authenticate, triggerTestReport);
router.post('/send-to', authenticate, triggerSendToEmail);  // 특정 이메일로 테스트 발송
router.post('/send-pdf', authenticate, upload.single('pdf'), sendPdfByEmail);  // PDF 파일 업로드 → 이메일 발송
router.get('/monthly', authenticate, getMonthlyReportData);
router.post('/pdf', authenticate, generatePdfFromHtml);

export default router;
