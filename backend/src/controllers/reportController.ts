/**
 * reportController.ts
 * 리포트 이메일 수동 발송 API (관리자/테스트용)
 */
import { Response } from 'express';
import { sendWeeklyReports, sendDailyReports, sendTestToEmail } from '../services/reportService';
import { AuthRequest } from '../middlewares/auth';
import pool from '../config/database';
import puppeteer from 'puppeteer';

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

/** 월별 리포트 데이터 전체 조회 (GET /api/v1/report/monthly) */
export const getMonthlyReportData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1;
    let { startMonth, endMonth } = req.query;

    if (!startMonth) startMonth = '2025-08';
    if (!endMonth) endMonth = '2026-03';

    // 1. 월별 종합 데이터
    const { rows: summaryRows } = await pool.query(`
      SELECT
        DATE_FORMAT(cm.metric_date, '%Y-%m')                              AS month,
        SUM(cm.impressions)                                               AS impressions,
        SUM(cm.clicks)                                                    AS clicks,
        SUM(cm.cost)                                                      AS cost,
        SUM(cm.conversions)                                               AS conversions,
        SUM(cm.revenue)                                                   AS revenue,
        ROUND(SUM(cm.clicks) / NULLIF(SUM(cm.impressions),0) * 100, 2)    AS ctr,
        ROUND(SUM(cm.cost)   / NULLIF(SUM(cm.clicks),0), 0)               AS cpc,
        ROUND(SUM(cm.revenue)/ NULLIF(SUM(cm.cost),0) * 100, 0)           AS roas
      FROM campaign_metrics cm
      INNER JOIN campaigns c         ON cm.campaign_id = c.id
      INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
        AND DATE_FORMAT(cm.metric_date, '%Y-%m') BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(cm.metric_date, '%Y-%m')
      ORDER BY month ASC
    `, [userId, startMonth, endMonth]);

    // 2. 월별/플랫폼별 데이터
    const { rows: platformRows } = await pool.query(`
      SELECT
        DATE_FORMAT(cm.metric_date, '%Y-%m')  AS month,
        ma.channel_code                       AS platform,
        SUM(cm.cost)                          AS spend,
        SUM(cm.impressions)                   AS impressions,
        SUM(cm.clicks)                        AS clicks,
        SUM(cm.conversions)                   AS conversions
      FROM campaign_metrics cm
      INNER JOIN campaigns c         ON cm.campaign_id = c.id
      INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
        AND DATE_FORMAT(cm.metric_date, '%Y-%m') BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(cm.metric_date, '%Y-%m'), ma.channel_code
      ORDER BY month ASC
    `, [userId, startMonth, endMonth]);

    // 3. 더미 데이터와 동일한 구조로 조립
    const monthlyData: Record<string, any> = {};

    for (const row of summaryRows) {
      monthlyData[row.month] = {
        impressions:  Number(row.impressions || 0),
        clicks:       Number(row.clicks || 0),
        cost:         Number(row.cost || 0),
        conversions:  Number(row.conversions || 0),
        revenue:      Number(row.revenue || 0),
        ctr:          Number(row.ctr || 0),
        cpc:          Number(row.cpc || 0),
        roas:         Number(row.roas || 0),
        platforms: {
          meta: { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
          google: { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
          naver: { spend: 0, impressions: 0, clicks: 0, conversions: 0 },
          karrot: { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
        }
      };
    }

    for (const row of platformRows) {
      if (!monthlyData[row.month]) continue;
      const p = String(row.platform).toLowerCase();
      if (!monthlyData[row.month].platforms[p]) {
          monthlyData[row.month].platforms[p] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      }
      monthlyData[row.month].platforms[p] = {
        spend:       Number(row.spend || 0),
        impressions: Number(row.impressions || 0),
        clicks:      Number(row.clicks || 0),
        conversions: Number(row.conversions || 0),
      };
    }

    return res.json({ success: true, data: monthlyData });
  } catch (error) {
    console.error('월별 리포트 데이터 조회 오류:', error);
    res.status(500).json({ success: false, message: '리포트 데이터 조회 실패' });
  }
};

/** HTML 문자열을 PDF로 변환하여 반환 (POST /api/v1/report/pdf) */
export const generatePdfFromHtml = async (req: AuthRequest, res: Response) => {
  let browser;
  try {
    const { htmlContent, filename } = req.body;
    if (!htmlContent) {
      return res.status(400).json({ success: false, message: 'HTML 내용이 없습니다.' });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // PDF 생성
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    console.log('[Puppeteer] PDF generated, size: ' + pdfBuffer.length);
    require('fs').writeFileSync('test-downloaded.pdf', pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename || 'report.pdf')}`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({ success: false, message: 'PDF 생성 실패' });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
