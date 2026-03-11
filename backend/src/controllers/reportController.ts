/**
 * reportController.ts
 * 리포트 이메일 수동 발송 API (관리자/테스트용)
 */
import { Response } from 'express';
import { sendWeeklyReports, sendDailyReports, sendTestToEmail } from '../services/reportService';
// [2026-03-11 12:02] 월별 보고서 이메일 발송을 위해 sendEmail 직접 import // 트리거
import { sendEmail } from '../services/emailService';
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

/** 입력한 이메일로 월별 보고서 + PDF 첨부 발송 (POST /api/v1/report/send-to) */
// [2026-03-11 12:02] 월별 보고서 내용과 PDF를 함께 이메일로 전달하도록 수정
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
    res.json({ success: true, message: `${email}로 월별 보고서를 발송합니다. 잠시 후 확인하세요.` });

    // 비동기 발송 처리
    (async () => {
      try {
        // 1. 월별 데이터 조회 (최근 6개월)
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const startMonth = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
        const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const { rows: summaryRows } = await pool.query(`
          SELECT
            DATE_FORMAT(cm.metric_date, '%Y-%m') AS month,
            SUM(cm.impressions) AS impressions,
            SUM(cm.clicks) AS clicks,
            SUM(cm.cost) AS cost,
            SUM(cm.conversions) AS conversions,
            SUM(cm.revenue) AS revenue
          FROM campaign_metrics cm
          INNER JOIN campaigns c ON cm.campaign_id = c.id
          INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
          WHERE ma.user_id = ? AND DATE_FORMAT(cm.metric_date, '%Y-%m') BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(cm.metric_date, '%Y-%m')
          ORDER BY month ASC
        `, [userId, startMonth, endMonth]);

        const { rows: platformRows } = await pool.query(`
          SELECT
            DATE_FORMAT(cm.metric_date, '%Y-%m') AS month,
            ma.channel_code AS platform,
            SUM(cm.cost) AS spend,
            SUM(cm.impressions) AS impressions,
            SUM(cm.clicks) AS clicks,
            SUM(cm.conversions) AS conversions
          FROM campaign_metrics cm
          INNER JOIN campaigns c ON cm.campaign_id = c.id
          INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
          WHERE ma.user_id = ? AND DATE_FORMAT(cm.metric_date, '%Y-%m') BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(cm.metric_date, '%Y-%m'), ma.channel_code
          ORDER BY month ASC
        `, [userId, startMonth, endMonth]);

        // 2. 사용자 이름 조회
        const userResult = await pool.query(
          'SELECT up.name FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?',
          [userId]
        );
        const userName = userResult.rows[0]?.name || '사용자';

        // 3. 이메일 HTML 생성 (월별 보고서 내용)
        const fmtNum = (n: number) => n >= 100000000 ? `${(n/100000000).toFixed(1)}억` : n >= 10000 ? `${(n/10000).toFixed(1)}만` : n.toLocaleString();

        // 월별 테이블 행 생성
        let monthlyTableRows = '';
        if (summaryRows.length > 0) {
          for (const row of summaryRows) {
            const cost = Number(row.cost || 0);
            const revenue = Number(row.revenue || 0);
            const roas = cost > 0 ? (revenue / cost * 100).toFixed(0) : '0';
            monthlyTableRows += `
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px;font-weight:600;color:#374151;">${row.month}</td>
                <td style="padding:10px 12px;text-align:right;">${fmtNum(Number(row.impressions || 0))}</td>
                <td style="padding:10px 12px;text-align:right;">${fmtNum(Number(row.clicks || 0))}</td>
                <td style="padding:10px 12px;text-align:right;">₩${fmtNum(cost)}</td>
                <td style="padding:10px 12px;text-align:right;color:#7c3aed;font-weight:600;">${fmtNum(Number(row.conversions || 0))}</td>
                <td style="padding:10px 12px;text-align:right;color:#2563eb;font-weight:600;">₩${fmtNum(revenue)}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;">${roas}%</td>
              </tr>`;
          }
        } else {
          monthlyTableRows = '<tr><td colspan="7" style="padding:20px;text-align:center;color:#9ca3af;">데이터가 없습니다.</td></tr>';
        }

        // 플랫폼별 요약
        const platformMap: Record<string, { spend: number; impressions: number; clicks: number; conversions: number }> = {};
        const platformLabels: Record<string, string> = { meta: 'Meta', google: 'Google', naver: 'Naver', karrot: 'Karrot' };
        const platformColors: Record<string, string> = { meta: '#3b82f6', google: '#ef4444', naver: '#22c55e', karrot: '#f97316' };
        for (const row of platformRows) {
          const p = String(row.platform).toLowerCase();
          if (!platformMap[p]) platformMap[p] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
          platformMap[p].spend += Number(row.spend || 0);
          platformMap[p].impressions += Number(row.impressions || 0);
          platformMap[p].clicks += Number(row.clicks || 0);
          platformMap[p].conversions += Number(row.conversions || 0);
        }

        let platformCards = '';
        for (const [key, data] of Object.entries(platformMap)) {
          const color = platformColors[key] || '#6b7280';
          const label = platformLabels[key] || key;
          platformCards += `
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:${color};">${label}</p>
              <div style="display:flex;justify-content:space-between;margin-top:8px;">
                <span style="font-size:12px;color:#6b7280;">비용: ₩${fmtNum(data.spend)}</span>
                <span style="font-size:12px;color:#6b7280;">클릭: ${fmtNum(data.clicks)}</span>
                <span style="font-size:12px;color:#6b7280;">전환: ${fmtNum(data.conversions)}</span>
              </div>
            </div>`;
        }
        if (!platformCards) platformCards = '<p style="color:#9ca3af;text-align:center;">플랫폼별 데이터가 없습니다.</p>';

        // 전체 합계
        const totalCost = summaryRows.reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
        const totalRevenue = summaryRows.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
        const totalConversions = summaryRows.reduce((s: number, r: any) => s + Number(r.conversions || 0), 0);
        const totalRoas = totalCost > 0 ? (totalRevenue / totalCost * 100).toFixed(0) : '0';

        const emailHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Apple SD Gothic Neo',Malgun Gothic,sans-serif;">
  <div style="max-width:700px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">📊 ChannelAI 월별 광고 성과 보고서</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${startMonth} ~ ${endMonth}</p>
    </div>
    <div style="padding:24px 32px 0;">
      <p style="color:#374151;font-size:15px;margin:0;">안녕하세요, <strong>${userName}</strong>님 👋<br>월별 광고 성과를 정리해 드렸습니다.</p>
    </div>
    <div style="padding:24px 32px;">
      <h2 style="font-size:13px;color:#6b7280;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📈 종합 현황</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#0369a1;">총 비용</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1e40af;">₩${fmtNum(totalCost)}</p>
        </div>
        <div style="flex:1;min-width:120px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#15803d;">총 수익</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#166534;">₩${fmtNum(totalRevenue)}</p>
        </div>
        <div style="flex:1;min-width:120px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#7e22ce;">총 전환</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#7c3aed;">${fmtNum(totalConversions)}건</p>
        </div>
        <div style="flex:1;min-width:120px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#c2410c;">ROAS</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ea580c;">${totalRoas}%</p>
        </div>
      </div>
    </div>
    <div style="padding:0 32px 24px;">
      <h2 style="font-size:13px;color:#6b7280;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📅 월별 상세</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">월</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">노출</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">클릭</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">비용</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">전환</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">수익</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">ROAS</th>
        </tr></thead>
        <tbody>${monthlyTableRows}</tbody>
      </table>
    </div>
    <div style="padding:0 32px 24px;">
      <h2 style="font-size:13px;color:#6b7280;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">🏷️ 플랫폼별 성과</h2>
      ${platformCards}
    </div>
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">이 이메일은 ChannelAI에서 자동 발송되었습니다. 상세 보고서는 첨부 PDF를 확인하세요.</p>
    </div>
  </div>
</body>
</html>`;

        // 4. PDF 생성 (Puppeteer)
        let pdfBuffer: Buffer | null = null;
        try {
          const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
          const page = await browser.newPage();
          await page.setContent(emailHtml, { waitUntil: 'networkidle0' });
          const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
          pdfBuffer = Buffer.from(pdf);
          await browser.close();
          console.log(`  📎 PDF 생성 완료 (${pdfBuffer.length} bytes)`);
        } catch (pdfErr) {
          console.error('  ⚠️ PDF 생성 실패 (이메일은 본문만 발송):', pdfErr);
        }

        // 5. 이메일 발송 (PDF 첨부)
        const subject = `📊 [ChannelAI] 월별 광고 성과 보고서 (${startMonth} ~ ${endMonth})`;
        const attachments = pdfBuffer ? [{ filename: `ChannelAI_월별보고서_${endMonth}.pdf`, content: pdfBuffer }] : undefined;
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
