import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';

/**
 * 결제 처리
 * POST /api/v1/payment/process
 */
export const processPayment = async (req: AuthRequest, res: Response) => {
  // TODO: 실제 결제 게이트웨이 연동 (토스페이먼츠, KG이니시스 등)
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: '결제 기능은 아직 구현되지 않았습니다.',
  });
};

/**
 * 결제 내역 조회
 * GET /api/v1/payment/history
 */
export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  // TODO: payment_history 테이블 조회
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: '결제 내역 조회 기능은 아직 구현되지 않았습니다.',
  });
};

/**
 * 결제 취소
 * POST /api/v1/payment/cancel
 */
export const cancelPayment = async (req: AuthRequest, res: Response) => {
  // TODO: 결제 게이트웨이 취소 API 연동
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: '결제 취소 기능은 아직 구현되지 않았습니다.',
  });
};
