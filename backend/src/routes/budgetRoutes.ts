import { Router } from 'express';
import {
  getBudgetSummary,
  getBudgetByPlatform,
  getBudgetByCampaign,
  updateCampaignBudget,
} from '../controllers/budgetController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 예산 요약
router.get('/summary', authenticate, getBudgetSummary);

// 플랫폼별 예산
router.get('/by-platform', authenticate, getBudgetByPlatform);

// 캠페인별 예산
router.get('/by-campaign', authenticate, getBudgetByCampaign);

// 캠페인 예산 수정
router.put('/campaign/:id', authenticate, updateCampaignBudget);

export default router;
