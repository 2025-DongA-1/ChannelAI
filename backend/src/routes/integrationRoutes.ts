import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAuthUrl,
  handleOAuthCallback,
  syncMetrics,
  syncAllMetrics,
  disconnectAccount,
  uploadCSV,
  exportCSV,
  connectPlatform,
  crawlKarrotAdResult,
  crawlKarrotAdResultManual,
  deleteKarrotManualCampaign,
  updateKarrotManualCampaign
} from '../controllers/integrationController';
import { authenticate } from '../middlewares/auth';

const router = Router();
// 🥕 당근마켓 광고 데이터 수동 입력/수정/삭제
router.post('/karrot/manual', authenticate, crawlKarrotAdResultManual);
router.delete('/karrot/manual/:campaignId', authenticate, deleteKarrotManualCampaign);
router.put('/karrot/manual/:campaignId', authenticate, updateKarrotManualCampaign);

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
// router.post('/sync/campaigns/:accountId', authenticate, syncCampaigns); // 제거: syncCampaigns 미존재
router.post('/sync/metrics/:campaignId', authenticate, syncMetrics);
router.post('/sync/all', authenticate, syncAllMetrics);

// CSV 업로드 ( Ad-Mate 기능 이식 )
router.post('/upload/csv', authenticate, upload.single('file'), uploadCSV);

// DB CSV 추출 다운로드
router.get('/export/csv', authenticate, exportCSV);

// 계정 연동 해제 (인증 필요)
router.delete('/disconnect/:platform', authenticate, disconnectAccount);

// 🥕 당근마켓 광고 결과 크롤링 (사용자 입력 기반)
router.post('/karrot', authenticate, crawlKarrotAdResult);

export default router;
