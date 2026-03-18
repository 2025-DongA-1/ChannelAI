import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
// [2026-03-11 12:07] PDF 파일 업로드를 위한 multer import (LEGACY: 서버 생성 방식 전환으로 미사용)
import multer from 'multer';
import {
  triggerWeeklyReport,
  triggerDailyReport,
  triggerTestReport,
  triggerSendToEmail,
  getMonthlyReportData,
  generatePdfFromHtml,
  sendPdfByEmail,
  generatePdfFromPage,  // [2026-03-18] Puppeteer 텍스트 PDF
} from '../controllers/reportController';

const router = Router();
// [2026-03-11 12:07] PDF 업로드용 multer 설정 (LEGACY: 서버 생성 방식 전환으로 미사용)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/weekly', authenticate, triggerWeeklyReport);
router.post('/daily', authenticate, triggerDailyReport);
router.post('/test', authenticate, triggerTestReport);
router.post('/send-to', authenticate, triggerSendToEmail);  // 특정 이메일로 테스트 발송
// [2026-03-18] send-pdf: 서버가 직접 PDF 생성 후 이메일 발송 (multer 업로드 불필요)
router.post('/send-pdf', authenticate, sendPdfByEmail);
// router.post('/send-pdf', authenticate, upload.single('pdf'), sendPdfByEmail);  // [LEGACY] 프론트 PDF 업로드 방식
router.get('/monthly', authenticate, getMonthlyReportData);
router.post('/pdf', authenticate, generatePdfFromHtml);
// [2026-03-18] Puppeteer 텍스트 PDF 다운로드 엔드포인트
router.get('/generate-pdf', authenticate, generatePdfFromPage);

export default router;

