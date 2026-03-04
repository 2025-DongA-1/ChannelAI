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

// CSV 파일 임시 저장 폴더 경로
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// ✅ 서버 재시작 시 uploads 폴더가 없으면 자동 생성
// (폴더가 없으면 multer가 파일 저장에 실패하여 500 에러 발생)
import fs from 'fs';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('[Upload] uploads 폴더 자동 생성 완료:', UPLOADS_DIR);
}

// Multer 설정 (CSV 파일 업로드용 임시 저장소)
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, UPLOADS_DIR); // 절대 경로로 지정하여 안정성 향상
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
