import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
  name: z.string().min(1, '이름을 입력해주세요.'),
});

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
  newPassword: z.string().min(6, '새 비밀번호는 6자 이상이어야 합니다.'),
});

// ── Campaign ──────────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  marketing_account_id: z.number({ message: '마케팅 계정 ID는 필수입니다.' }),
  campaign_name: z.string().min(1, '캠페인 이름을 입력해주세요.'),
  campaign_id: z.string().min(1, '외부 캠페인 ID를 입력해주세요.'),
  daily_budget: z.number().nonnegative().optional(),
  total_budget: z.number().nonnegative().optional(),
  status: z.enum(['active', 'paused', 'ended']).optional(),
});

export const updateCampaignSchema = z.object({
  campaign_name: z.string().min(1).optional(),
  daily_budget: z.number().nonnegative().optional(),
  total_budget: z.number().nonnegative().optional(),
  status: z.enum(['active', 'paused', 'ended']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: '수정할 항목을 최소 1개 이상 입력해주세요.',
});

// ── Budget ────────────────────────────────────────────────────────────────────

export const updateCampaignBudgetSchema = z.object({
  dailyBudget: z.number().nonnegative().optional(),
  totalBudget: z.number().nonnegative().optional(),
}).refine((data) => data.dailyBudget !== undefined || data.totalBudget !== undefined, {
  message: 'dailyBudget 또는 totalBudget 중 하나는 필수입니다.',
});

export const updateTotalBudgetSchema = z.object({
  totalBudget: z.number().nonnegative('전체 예산은 0 이상이어야 합니다.'),
  dailyBudget: z.number().nonnegative('일일 예산은 0 이상이어야 합니다.'),
});

// ── Subscription / Payment ────────────────────────────────────────────────────

export const activateSubscriptionSchema = z.object({
  months: z.number().int().positive('구독 개월 수는 1 이상이어야 합니다.').optional(),
});

export const updateAutoRenewSchema = z.object({
  auto_renew: z.union([z.literal(0), z.literal(1)], { message: 'auto_renew는 0 또는 1이어야 합니다.' }),
});

export const processPaymentSchema = z.object({
  plan: z.enum(['basic', 'premium', 'enterprise']),
  amount: z.number().positive('결제 금액은 0보다 커야 합니다.'),
  paymentMethod: z.enum(['card', 'bank_transfer', 'kakao_pay', 'naver_pay'], {
    message: '지원하지 않는 결제 수단입니다.',
  }),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
});
