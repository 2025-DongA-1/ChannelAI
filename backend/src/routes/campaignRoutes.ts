import { Router } from 'express';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignMetrics,
} from '../controllers/campaignController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 캠페인 CRUD
router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

// 캠페인 메트릭
router.get('/:id/metrics', getCampaignMetrics);

export default router;
