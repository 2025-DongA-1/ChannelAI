import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAuthUrl,
  handleOAuthCallback,
  syncCampaigns,
  syncMetrics,
  syncAllMetrics,
  disconnectAccount,
  uploadCSV,
  exportCSV,
  connectPlatform
} from '../controllers/integrationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Multer 설정
// Multer 설정
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, 'uploads/');
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// OAuth 인증 (인증 필요)
router.get('/auth/:platform', authenticate, getAuthUrl);

// OAuth 콜백 (인증 불필요 - 외부에서 리다이렉트)
router.get('/callback/:platform', handleOAuthCallback);

// API 키 기반 연동 (네이버 등)
router.post('/connect/:platform', authenticate, connectPlatform);

// 데이터 동기화 (인증 필요)
router.post('/sync/campaigns/:accountId', authenticate, syncCampaigns);
router.post('/sync/metrics/:campaignId', authenticate, syncMetrics);
router.post('/sync/all', authenticate, syncAllMetrics);

// CSV 업로드 ( Ad-Mate 기능 이식 )
router.post('/upload/csv', authenticate, upload.single('file'), uploadCSV);

// DB CSV 추출 다운로드
router.get('/export/csv', authenticate, exportCSV);

// 계정 연동 해제 (인증 필요)
router.delete('/disconnect/:platform', authenticate, disconnectAccount);

export default router;
