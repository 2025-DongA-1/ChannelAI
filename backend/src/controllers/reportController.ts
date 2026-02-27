/**
 * reportController.ts
 * 리포트 이메일 수동 발송 API (관리자/테스트용)
 */
import { Response } from 'express';
import { sendWeeklyReports, sendDailyReports, sendTestToEmail } from '../services/reportService';
import { AuthRequest } from '../middlewares/auth';

/** 주간 리포트 수동 발송 (POST /api/v1/report/weekly) */
export const triggerWeeklyReport = async (req: AuthRequest, res: Response) => {
  try {
    sendWeeklyReports().catch(err => console.error('주간 리포트 오류:', err));
    res.json({ success: true, message: '주간 리포트 발송을 시작했습니다. 잠시 후 이메일을 확인하세요.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '리포트 발송 실패' });
  }
};

/** 일간 리포트 수동 발송 (POST /api/v1/report/daily) */
export const triggerDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    sendDailyReports().catch(err => console.error('일간 리포트 오류:', err));
    res.json({ success: true, message: '일간 리포트 발송을 시작했습니다. 잠시 후 이메일을 확인하세요.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '리포트 발송 실패' });
  }
};

/** 나에게만 테스트 발송 (POST /api/v1/report/test) */
export const triggerTestReport = async (req: AuthRequest, res: Response) => {
  try {
    sendWeeklyReports().catch(err => console.error('테스트 리포트 오류:', err));
    res.json({ success: true, message: '테스트 리포트를 발송했습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '테스트 발송 실패' });
  }
};

/** 입력한 이메일로 테스트 발송 (POST /api/v1/report/send-to) */
export const triggerSendToEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: '이메일 주소를 입력하세요.' });
    }
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: '올바른 이메일 형식이 아닙니다.' });
    }
    const userId = req.user?.id || 1;
    sendTestToEmail(email, userId).catch(err => console.error('이메일 발송 오류:', err));
    res.json({ success: true, message: `${email}로 테스트 리포트를 발송합니다. 잠시 후 확인하세요.` });
  } catch (error) {
    res.status(500).json({ success: false, message: '이메일 발송 실패' });
  }
};
