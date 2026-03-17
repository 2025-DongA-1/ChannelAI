import { Router } from 'express';
import {
  getBudgetSummary,
  getBudgetByPlatform,
  getBudgetByCampaign,
  updateCampaignBudget,
  updateTotalBudget, // 👈 이 줄을 추가합니다.
} from '../controllers/budgetController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { updateCampaignBudgetSchema, updateTotalBudgetSchema } from '../schemas';

const router = Router();

// 예산 요약
router.get('/summary', authenticate, getBudgetSummary);

// 👇 전체 예산 설정 저장 (이 줄을 새롭게 추가하세요!)
router.post('/settings', authenticate, validate(updateTotalBudgetSchema), updateTotalBudget);

// 플랫폼별 예산
router.get('/by-platform', authenticate, getBudgetByPlatform);

// 캠페인별 예산
router.get('/by-campaign', authenticate, getBudgetByCampaign);

// 캠페인 예산 수정
router.put('/campaign/:id', authenticate, validate(updateCampaignBudgetSchema), updateCampaignBudget);

export default router;
