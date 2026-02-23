/**
 * reportController.ts
 * 리포트 이메일 수동 발송 API (관리자/테스트용)
 */
import { Request, Response } from 'express';
import { sendWeeklyReports, sendDailyReports } from '../services/reportService';
import { AuthRequest } from '../middlewares/auth';

/** 주간 리포트 수동 발송 (POST /api/v1/report/weekly) */
export const triggerWeeklyReport = async (req: Request, res: Response) => {
  try {
    // 백그라운드에서 발송 시작 (await 없이 즉시 응답 반환)
    sendWeeklyReports().catch(err => console.error('주간 리포트 오류:', err));
    res.json({
      success: true,
      message: '주간 리포트 발송을 시작했습니다. 잠시 후 이메일을 확인하세요.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '리포트 발송 실패' });
  }
};

/** 일간 리포트 수동 발송 (POST /api/v1/report/daily) */
export const triggerDailyReport = async (req: Request, res: Response) => {
  try {
    sendDailyReports().catch(err => console.error('일간 리포트 오류:', err));
    res.json({
      success: true,
      message: '일간 리포트 발송을 시작했습니다. 잠시 후 이메일을 확인하세요.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '리포트 발송 실패' });
  }
};

/** 나에게만 테스트 발송 (POST /api/v1/report/test) */
export const triggerTestReport = async (req: AuthRequest, res: Response) => {
  try {
    const { sendWeeklyReports: send } = await import('../services/reportService');
    send().catch(err => console.error('테스트 리포트 오류:', err));
    res.json({
      success: true,
      message: '테스트 리포트를 내 이메일로 발송했습니다.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '테스트 발송 실패' });
  }
};
