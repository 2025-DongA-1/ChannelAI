import { Router } from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  syncCampaigns,
  syncMetrics,
  syncAllMetrics,
  disconnectAccount
} from '../controllers/integrationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// OAuth 인증 (인증 필요)
router.get('/auth/:platform', authenticate, getAuthUrl);

// OAuth 콜백 (인증 불필요 - 외부에서 리다이렉트)
router.get('/callback/:platform', handleOAuthCallback);

// 데이터 동기화 (인증 필요)
router.post('/sync/campaigns/:accountId', authenticate, syncCampaigns);
router.post('/sync/metrics/:campaignId', authenticate, syncMetrics);
router.post('/sync/all', authenticate, syncAllMetrics);

// 계정 연동 해제 (인증 필요)
router.delete('/disconnect/:platform', authenticate, disconnectAccount);

export default router;
