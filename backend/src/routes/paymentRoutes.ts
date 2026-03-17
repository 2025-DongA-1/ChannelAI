import { Router } from 'express';
import { processPayment, getPaymentHistory, cancelPayment } from '../controllers/paymentController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { processPaymentSchema } from '../schemas';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 결제 처리
router.post('/process', validate(processPaymentSchema), processPayment);

// 결제 내역 조회
router.get('/history', getPaymentHistory);

// 결제 취소
router.post('/cancel', cancelPayment);

export default router;
