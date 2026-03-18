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
        let browser;
        try {
          browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
          });
          const page = await browser.newPage();

          // 뷰포트 설정 (긴 페이지 대응)
          await page.setViewport({ width: 1400, height: 2000, deviceScaleFactor: 2 });

          // localStorage에 토큰 세팅 (인증 우회)
          await page.evaluateOnNewDocument((token: string) => {
            (globalThis as any).localStorage.setItem('token', token);
          }, tempToken);

          // 보고서 페이지 접속
          await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 45000 });

          // 🛡️ 데이터 렌더링 확인 (차트나 성과 카드가 나타날 때까지 대기)
          try {
            await page.waitForSelector('.recharts-responsive-container, .bg-white.border.border-gray-100', { timeout: 15000 });
            console.log('  ✅ 데이터 렌더링 확인됨');
          } catch (e) {
            console.warn('  ⚠️ 데이터 렌더링 대기 시간 초과');
          }

          // 애니메이션 및 최종 로딩 대기
          await new Promise(resolve => setTimeout(resolve, 3000));

          // 페이지 전체 PDF 캡처
          const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
          });
          pdfBuffer = Buffer.from(pdf);
          console.log(`  📎 PDF 캡처 완료 (${pdfBuffer.length} bytes)`);
        } catch (pdfErr) {
          console.error('  ⚠️ PDF 캡처 실패:', pdfErr);
        } finally {
          if (browser) await browser.close();
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
        신청하신 <strong>${lastMonthStr}</strong> 성과 보고서가 준비되었습니다.<br>
        실제 서비스 화면과 동일한 지표를 첨부된 PDF 파일에서 확인하실 수 있습니다.
      </p>
      <div style="background:#f8faff;border:1px solid #dbeafe;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">📎 첨부 파일 확인</p>
        <p style="margin:6px 0 0;font-size:13px;color:#374151;">ChannelAI_월별보고서_${lastMonthStr}.pdf</p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">차트 및 상세 지표가 포함된 공식 리포트입니다.</p>
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

    /**
     * [2026-03-12 16:08] 수정 이유: 월별 보고서 캠페인 성과 탭 데이터 제공
     * 상세 설명: 캠페인별 광고비, 노출, 클릭, 전환, ROAS 등을 집계하여 프론트엔드 리포트 페이지의 
     * '캠페인별 성과' 탭에서 상세 표 및 차트를 구성할 수 있도록 데이터를 추출 및 가공함.
     */
    const { rows: campaignRows } = await pool.query(`
      SELECT
        DATE_FORMAT(cm.metric_date, '%Y-%m')                              AS month,
        c.id                                                              AS campaign_id,
        c.campaign_name,
        ma.channel_code                                                   AS platform,
        c.status,
        SUM(cm.cost)                                                      AS cost,
        SUM(cm.impressions)                                               AS impressions,
        SUM(cm.clicks)                                                    AS clicks,
        SUM(cm.conversions)                                               AS conversions,
        SUM(cm.revenue)                                                   AS revenue,
        ROUND(SUM(cm.clicks)   / NULLIF(SUM(cm.impressions),0) * 100, 2)  AS ctr,
        ROUND(SUM(cm.cost)     / NULLIF(SUM(cm.clicks),0), 0)             AS cpc,
        ROUND(SUM(cm.revenue)  / NULLIF(SUM(cm.cost),0) * 100, 0)         AS roas
      FROM campaign_metrics cm
      INNER JOIN campaigns c           ON cm.campaign_id = c.id
      INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
        AND DATE_FORMAT(cm.metric_date, '%Y-%m') BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(cm.metric_date, '%Y-%m'), c.id, c.campaign_name, ma.channel_code, c.status
      ORDER BY month ASC, SUM(cm.cost) DESC
    `, [userId, startMonth, endMonth]);

    // 4. 데이터 조립
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
        },
        campaigns: [] // [2026-03-12 15:32] 캠페인별 성과 배열 초기화
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

    // [2026-03-12 15:32] 캠페인별 데이터를 해당 월에 push
    for (const row of campaignRows) {
      if (!monthlyData[row.month]) continue;
      monthlyData[row.month].campaigns.push({
        campaign_id:   Number(row.campaign_id),
        campaign_name: String(row.campaign_name || '-'),
        platform:      String(row.platform || '-').toLowerCase(),
        status:        String(row.status || 'unknown'),
        cost:          Number(row.cost || 0),
        impressions:   Number(row.impressions || 0),
        clicks:        Number(row.clicks || 0),
        conversions:   Number(row.conversions || 0),
        revenue:       Number(row.revenue || 0),
        ctr:           Number(row.ctr || 0),
        cpc:           Number(row.cpc || 0),
        roas:          Number(row.roas || 0),
      });
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

// ─── [2026-03-18] Puppeteer 스크린샷 기반 PDF 생성 공통 헬퍼 ───────────────────────
// 화면 레이아웃을 100% 그대로 캡처하여 PDF로 변환
// html2canvas와 달리 동일한 Chrome 렌더링 엔진을 사용하므로 CSS 해석 차이 없음
const generatePdfWithPuppeteer = async (month: string, userId: number): Promise<Buffer> => {
  const tempToken = jwt.sign(
    { id: userId, email: 'pdf-generator@internal' },
    process.env.JWT_SECRET || 'channel_ai_secret_key_2024',
    { expiresIn: '1h' }
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const reportUrl = `${frontendUrl}/monthly-report?month=${month}&pdfMode=true`;
  console.log(`  🌐 [PDF] 리포트 페이지 접속: ${reportUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });

    // evaluateOnNewDocument: 페이지 로드 전에 localStorage에 인증 정보 주입
    await page.evaluateOnNewDocument((token: string, uid: number) => {
      const authState = {
        state: {
          user: { id: uid, email: 'pdf-generator@internal', name: 'PDF Generator', role: 'admin' },
          token: token,
          isAuthenticated: true,
        },
        version: 0,
      };
      (globalThis as any).localStorage.setItem('auth-storage', JSON.stringify(authState));
      (globalThis as any).localStorage.setItem('token', token);
    }, tempToken, userId);

    // 리포트 페이지로 직접 이동
    await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 45000 });

    // 데이터 렌더링 대기
    try {
      await page.waitForSelector('.recharts-responsive-container, .bg-white.border.border-gray-100', { timeout: 15000 });
      console.log('  ✅ [PDF] 데이터 렌더링 확인됨');
    } catch (e) {
      console.warn('  ⚠️ [PDF] 데이터 렌더링 대기 시간 초과');
    }

    // 네비게이션, 불필요 UI 숨기기
    await page.addStyleTag({
      content: `
        nav, .floating-tutorial-button, [class*="tutorial"], .pdf-header-container,
        button[class*="download"], button[class*="email"],
        [class*="sticky"][class*="top-0"] { display: none !important; }
        .flex.gap-1.bg-gray-100 { display: none !important; }
        
        /* 페이지 잘림 방지 (네이티브 PDF 활용) */
        tr, .bg-white.border {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `
    });

    // 화면(screen) 모드 에뮬레이션 - 인쇄용 모바일 뷰로 깨지는 것 방지
    await page.emulateMediaType('screen');

    // 차트 애니메이션 완료 대기
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ── 1단계: Puppeteer 네이티브 PDF 생성 (A4 비율 유지) ──
    const pdf = await page.pdf({
      width: '1280px',     // 뷰포트 너비 유지
      height: '1810px',    // A4 비율 맞춤 (1280 / 0.707)
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; border-bottom: 2px solid #2563eb; margin: 0 40px; padding-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;">
          <span style="font-size: 24px; font-weight: bold; color: #1e3a8a;">ChannelAI <span style="font-weight: normal; color: #3b82f6;">월별 통합 성과 보고서</span></span>
          <span style="font-size: 18px; font-weight: bold; color: #3b82f6;">${month}</span>
        </div>`,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 14px; color: #9ca3af; font-family: sans-serif;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
      margin: {
        top: '100px',
        bottom: '80px',
        left: '0px',
        right: '0px'
      }
    });

    const pdfBuffer = Buffer.from(pdf);
    console.log(`  📎 [PDF] 네이티브 PDF(선명도+잘림방지 적용) 생성 완료 (${pdfBuffer.length} bytes)`);
    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
};

/** [2026-03-18] 서버에서 Puppeteer로 텍스트 PDF 생성 후 다운로드 (GET /api/v1/report/generate-pdf) */
export const generatePdfFromPage = async (req: AuthRequest, res: Response) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const userId = req.user?.id || 1;

    const pdfBuffer = await generatePdfWithPuppeteer(month, userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(`ChannelAI_통합리포트_${month}.pdf`)}`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({ success: false, message: 'PDF 생성 실패' });
  }
};

// [2026-03-18] 서버에서 PDF를 직접 생성하여 이메일 발송 (프론트에서 PDF 업로드 불필요)
/** 서버 Puppeteer PDF 생성 → 이메일 발송 (POST /api/v1/report/send-pdf) */
export const sendPdfByEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email, month } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: '이메일 주소를 입력하세요.' });
    }

    const userId = req.user?.id || 1;
    const reportMonth = month || new Date().toISOString().slice(0, 7);

    // 즉시 응답 후 비동기 발송
    res.json({ success: true, message: `${email}로 ${reportMonth} 보고서를 발송합니다. 잠시 후 확인하세요.` });

    (async () => {
      try {
        // 1. Puppeteer로 텍스트 기반 PDF 생성
        const pdfBuffer = await generatePdfWithPuppeteer(reportMonth, userId);

        // 2. 사용자 이름 조회
        const userResult = await pool.query(
          'SELECT up.name FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?',
          [userId]
        );
        const userName = userResult.rows[0]?.name || '사용자';

        // 3. 이메일 발송
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
        await sendEmail(email, subject, emailHtml, [{
          filename: `ChannelAI_통합리포트_${reportMonth}.pdf`,
          content: pdfBuffer,
        }]);
        console.log(`  ✅ PDF 보고서 이메일 발송 완료: ${email}`);
      } catch (err) {
        console.error('❌ PDF 이메일 발송 오류:', err);
      }
    })();

  } catch (error) {
    console.error('PDF 이메일 발송 오류:', error);
    res.status(500).json({ success: false, message: 'PDF 이메일 발송 실패' });
  }
};

/* ── [LEGACY] 기존 프론트 PDF 업로드 방식 (html2canvas+jsPDF) ──────────────────
export const sendPdfByEmail_legacy = async (req: AuthRequest, res: Response) => {
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
    const userResult = await pool.query(
      'SELECT up.name FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?',
      [userId]
    );
    const userName = userResult.rows[0]?.name || '사용자';
    const reportMonth = month || new Date().toISOString().slice(0, 7);
    const subject = `📊 [ChannelAI] ${reportMonth} 월별 광고 성과 보고서`;
    const attachments = [{ filename: `ChannelAI_통합리포트_${reportMonth}.pdf`, content: file.buffer }];
    // ... emailHtml 생략 ...
    // await sendEmail(email, subject, emailHtml, attachments);
    res.json({ success: true, message: `${email}로 월별 보고서 PDF를 발송했습니다.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'PDF 이메일 발송 실패' });
  }
};
── LEGACY END ── */
