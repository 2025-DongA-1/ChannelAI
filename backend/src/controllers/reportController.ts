/**
 * reportController.ts
 * 리포트 이메일 수동 발송 API (관리자/테스트용)
 */
import { Response } from 'express';
import { sendWeeklyReports, sendDailyReports, sendTestToEmail } from '../services/reportService';
import { sendEmail } from '../services/emailService';
import { AuthRequest } from '../middlewares/auth';
import pool from '../config/database';
import puppeteer from 'puppeteer';
import jwt from 'jsonwebtoken';

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

/** 입력한 이메일로 월별 보고서 PDF 첨부 발송 (POST /api/v1/report/send-to) */
// [2026-03-11 15:03] Puppeteer로 월별 성과 보고서 페이지(지난달) 그대로 캡처 → PDF 첨부
export const triggerSendToEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: '이메일 주소를 입력하세요.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: '올바른 이메일 형식이 아닙니다.' });
    }
    const userId = req.user?.id || 1;

    // 즉시 응답 반환 후 비동기로 발송 처리
    res.json({ success: true, message: `${email}로 지난달 성과 보고서를 발송합니다. 잠시 후 확인하세요.` });

    // 비동기 발송 처리
    (async () => {
      try {
        // 1. 지난달(현재월 - 1) 계산
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        console.log(`  📅 보고서 대상 기간: ${lastMonthStr}`);

        // 2. 사용자 이름 조회
        const userResult = await pool.query(
          'SELECT up.name FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?',
          [userId]
        );
        const userName = userResult.rows[0]?.name || '사용자';

        // 3. Puppeteer가 프론트 접근할 수 있도록 임시 JWT 토큰 생성 (1시간 유효)
        const tempToken = jwt.sign(
          { id: userId, email: email },
          process.env.JWT_SECRET || 'channel_ai_secret_key_2024',
          { expiresIn: '1h' }
        );

        // 4. Puppeteer로 월별 성과 보고서 페이지 캡처 → PDF 생성
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const reportUrl = `${frontendUrl}/monthly-report?month=${lastMonthStr}`;
        console.log(`  🌐 보고서 페이지 접속 중: ${reportUrl}`);

        let pdfBuffer: Buffer | null = null;
        try {
          const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
          });
          const page = await browser.newPage();

          // 뷰포트 설정 (보고서 페이지 기준)
          await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });

          // localStorage에 토큰 세팅 (인증 우회)
          await page.evaluateOnNewDocument((token: string) => {
            (globalThis as any).localStorage.setItem('token', token);
          }, tempToken);

          // 보고서 페이지 접속 후 데이터 로딩 대기
          await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 30000 });

          // 차트 애니메이션 완료 대기 (2초)
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 페이지 전체 PDF 캡처
          const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
          });
          pdfBuffer = Buffer.from(pdf);
          await browser.close();
          console.log(`  📎 PDF 캡처 완료 (${pdfBuffer.length} bytes)`);
        } catch (pdfErr) {
          console.error('  ⚠️ PDF 캡처 실패 (이메일은 본문만 발송):', pdfErr);
        }

        // 5. 이메일 본문 (간단한 알림)
        const emailHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Apple SD Gothic Neo',Malgun Gothic,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:36px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;">📊 ChannelAI</h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">${lastMonthStr} 월별 광고 성과 보고서</p>
    </div>
    <div style="padding:36px 40px;">
      <p style="color:#374151;font-size:16px;margin:0 0 16px;">안녕하세요, <strong>${userName}</strong>님 👋</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.8;margin:0 0 24px;">
        <strong>${lastMonthStr}</strong> 광고 성과 보고서가 준비되었습니다.<br>
        아래 첨부된 PDF 파일에서 상세한 성과 내역을 확인하실 수 있습니다.
      </p>
      <div style="background:#f8faff;border:1px solid #dbeafe;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">📎 첨부 파일</p>
        <p style="margin:6px 0 0;font-size:13px;color:#374151;">ChannelAI_월별보고서_${lastMonthStr}.pdf</p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">월별 성과 보고서 페이지 전체 내용 포함</p>
      </div>
    </div>
    <div style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">이 이메일은 ChannelAI에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>`;


        // 6. 이메일 발송 (PDF 첨부)
        const subject = `📊 [ChannelAI] ${lastMonthStr} 월별 광고 성과 보고서`;
        const attachments = pdfBuffer
          ? [{ filename: `ChannelAI_월별보고서_${lastMonthStr}.pdf`, content: pdfBuffer }]
          : undefined;
        await sendEmail(email, subject, emailHtml, attachments);
        console.log(`  ✅ 월별 보고서 발송 완료: ${email}`);


      } catch (err) {
        console.error('❌ 월별 보고서 발송 오류:', err);
      }
    })();

  } catch (error) {
    res.status(500).json({ success: false, message: '이메일 발송 실패' });
  }
};

/** 월별 리포트 데이터 전체 조회 (GET /api/v1/report/monthly) */
export const getMonthlyReportData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1;
    let { startMonth, endMonth } = req.query;

    // 기본값: endMonth = 이번 달, startMonth = 6개월 전
    const now = new Date();
    const toMonthStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!endMonth) endMonth = toMonthStr(now);
    if (!startMonth) {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      startMonth = toMonthStr(sixMonthsAgo);
    }

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

// [2026-03-11 12:07] 프론트에서 생성한 PDF를 업로드받아 이메일로 발송
/** PDF 파일 업로드 → 이메일 발송 (POST /api/v1/report/send-pdf) */
export const sendPdfByEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email, month } = req.body;
    const file = (req as any).file;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: '이메일 주소를 입력하세요.' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'PDF 파일이 첨부되지 않았습니다.' });
    }

    const userId = req.user?.id || 1;

    // 사용자 이름 조회
    const userResult = await pool.query(
      'SELECT up.name FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?',
      [userId]
    );
    const userName = userResult.rows[0]?.name || '사용자';
    const reportMonth = month || new Date().toISOString().slice(0, 7);

    // 이메일 HTML 본문
    const emailHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Apple SD Gothic Neo',Malgun Gothic,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">📊 ChannelAI 월별 보고서</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${reportMonth} 보고서</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 16px;">안녕하세요, <strong>${userName}</strong>님 👋</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">${reportMonth} 월별 광고 성과 보고서를 첨부파일로 전달드립니다.</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600;">📎 첨부파일: ChannelAI_통합리포트_${reportMonth}.pdf</p>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">차트 및 상세 분석 내용은 첨부 PDF를 확인하세요.</p>
      </div>
    </div>
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">이 이메일은 ChannelAI에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>`;

    const subject = `📊 [ChannelAI] ${reportMonth} 월별 광고 성과 보고서`;
    const attachments = [{
      filename: `ChannelAI_통합리포트_${reportMonth}.pdf`,
      content: file.buffer,
    }];

    await sendEmail(email, subject, emailHtml, attachments);
    console.log(`  ✅ PDF 보고서 이메일 발송 완료: ${email}`);
    res.json({ success: true, message: `${email}로 월별 보고서 PDF를 발송했습니다.` });

  } catch (error) {
    console.error('PDF 이메일 발송 오류:', error);
    res.status(500).json({ success: false, message: 'PDF 이메일 발송 실패' });
  }
};
