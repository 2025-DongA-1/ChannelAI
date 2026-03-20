/**
 * reportService.ts
 * 사용자별 주간/일간 광고 성과 리포트 생성 및 이메일 발송
 *
 * [2단계 구조]
 *  1단계 - generateAndSaveReportFiles(): Puppeteer로 PDF 생성 → 파일 저장 → DB 경로 저장
 *  2단계 - sendMonthlyReports(): DB에서 파일 경로 조회 → 파일 읽어 이메일 첨부 발송 (Puppeteer 없음)
 */
import pool from '../config/database';
import { sendEmail } from './emailService';
import { generateMonthlyInsightsForUser } from './aiInsightService';
import puppeteer from 'puppeteer';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// ── 타입 ──────────────────────────────────────────────────────────────────
interface ReportData {
  userName: string;
  period: { start: string; end: string };
  totalCost: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  roas: number;
  topCampaign: string;
  recommendations: { priority: string; message: string }[];
}

// ── 날짜 유틸 ─────────────────────────────────────────────────────────────
const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// ── DB에서 사용자 리포트 데이터 수집 ──────────────────────────────────────
const gatherReportData = async (userId: number, startDate: string, endDate: string): Promise<ReportData | null> => {
  // [2026-03-11 11:48] name은 user_profiles 테이블에 있으므로 JOIN 필요 (ER_BAD_FIELD_ERROR 수정)
  const userResult = await pool.query(
    'SELECT up.name FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?',
    [userId]
  );
  if (!userResult.rows.length) return null;
  const userName: string = userResult.rows[0].name || '사용자';

  // 광고 성과 집계
  const result = await pool.query(
    `SELECT
       SUM(cm.cost)         AS totalCost,
       SUM(cm.impressions)  AS totalImpressions,
       SUM(cm.clicks)       AS totalClicks,
       SUM(cm.conversions)  AS totalConversions,
       SUM(cm.revenue)      AS totalRevenue,
       (SELECT c2.campaign_name
        FROM campaign_metrics cm2
        JOIN campaigns c2           ON cm2.campaign_id = c2.id
        JOIN marketing_accounts ma2 ON c2.marketing_account_id = ma2.id
        WHERE ma2.user_id = ?
          AND cm2.metric_date BETWEEN ? AND ?
        GROUP BY c2.id
        ORDER BY SUM(cm2.conversions) DESC
        LIMIT 1) AS topCampaign
     FROM campaign_metrics cm
     JOIN campaigns c           ON cm.campaign_id = c.id
     JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
     WHERE ma.user_id = ?
       AND cm.metric_date BETWEEN ? AND ?`,
    [userId, startDate, endDate, userId, startDate, endDate]
  );

  const row = result.rows[0] || {};

  const totalCost        = parseFloat(row.totalCost)        || 0;
  const totalImpressions = parseFloat(row.totalImpressions) || 0;
  const totalClicks      = parseFloat(row.totalClicks)      || 0;
  const totalConversions = parseFloat(row.totalConversions) || 0;
  const totalRevenue     = parseFloat(row.totalRevenue)     || 0;
  const roas = totalCost > 0 ? +(totalRevenue / totalCost).toFixed(2) : 0;

  // 간단한 AI 추천 생성
  const recommendations: { priority: string; message: string }[] = [];
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  if (roas < 1)          recommendations.push({ priority: '긴급', message: 'ROAS가 1 미만입니다. 예산 배분을 재검토하세요.' });
  if (ctr < 0.5)         recommendations.push({ priority: '보통', message: `CTR이 ${ctr.toFixed(2)}%로 낮습니다. 광고 소재 점검이 필요합니다.` });
  if (totalConversions === 0) recommendations.push({ priority: '낮음', message: '분석 기간 전환이 0건입니다. 랜딩페이지를 확인해보세요.' });
  if (recommendations.length === 0) recommendations.push({ priority: '정상', message: '이번 기간 광고 성과가 양호합니다! 🎉' });

  return {
    userName, period: { start: startDate, end: endDate },
    totalCost, totalImpressions, totalClicks, totalConversions, roas,
    topCampaign: row.topCampaign || '-', recommendations,
  };
};

// ── HTML 이메일 템플릿 ────────────────────────────────────────────────────
const buildEmailHtml = (data: ReportData): string => {
  const priorityColor = (p: string) =>
    p === '긴급' ? '#ef4444' : p === '보통' ? '#f59e0b' : p === '낮음' ? '#3b82f6' : '#10b981';

  const recRows = data.recommendations.map(r => `
    <tr>
      <td style="padding:8px 12px;">
        <span style="background:${priorityColor(r.priority)};color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;">${r.priority}</span>
      </td>
      <td style="padding:8px 12px;color:#374151;font-size:14px;">${r.message}</td>
    </tr>`).join('');

  const metrics = [
    ['💰 총 광고 지출', `${data.totalCost.toLocaleString()}원`],
    ['👁 총 노출수',    `${data.totalImpressions.toLocaleString()}회`],
    ['🖱 클릭수',       `${data.totalClicks.toLocaleString()}회`],
    ['📈 전환수',       `${data.totalConversions.toLocaleString()}건`],
    ['🎯 ROAS',         `${data.roas}배`],
    ['🏆 주요 캠페인',  data.topCampaign],
  ].map(([label, value]) => `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">${label}</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#111827;">${value}</p>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Apple SD Gothic Neo',Malgun Gothic,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">📊 ChannelAI 광고 성과 리포트</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${data.period.start} ~ ${data.period.end}</p>
    </div>
    <div style="padding:24px 32px 0;">
      <p style="color:#374151;font-size:15px;margin:0;">안녕하세요, <strong>${data.userName}</strong>님 👋<br>지난 기간 광고 성과를 정리해 드렸습니다.</p>
    </div>
    <div style="padding:24px 32px;">
      <h2 style="font-size:13px;color:#6b7280;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">핵심 지표</h2>
      ${metrics}
    </div>
    <div style="padding:0 32px 32px;">
      <h2 style="font-size:13px;color:#6b7280;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">💡 AI 최적화 추천</h2>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tbody>${recRows}</tbody>
      </table>
    </div>
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">이 이메일은 ChannelAI에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>`;
};

// ── 단일 사용자에게 리포트 발송 ────────────────────────────────────────────
const sendReportToUser = async (userId: number, email: string, startDate: string, endDate: string, label: string): Promise<void> => {
  const data = await gatherReportData(userId, startDate, endDate);
  if (!data) { console.log(`  ⏩ userId=${userId} - 데이터 없음, 스킵`); return; }
  const subject = `📊 [ChannelAI] ${label} 광고 성과 리포트 (${data.period.start} ~ ${data.period.end})`;
  await sendEmail(email, subject, buildEmailHtml(data));
  console.log(`  ✅ 발송 완료: ${email}`);
};

// ── 전체 사용자 일간 리포트 ────────────────────────────────────────────────
export const sendDailyReports = async (): Promise<void> => {
  console.log('📧 [일간 리포트] 발송 시작...');
  const result = await pool.query("SELECT id, email FROM users WHERE email IS NOT NULL AND email != '' ORDER BY id");
  for (const user of result.rows) {
    try { await sendReportToUser(user.id, user.email, toDateStr(daysAgo(1)), toDateStr(new Date()), '일간'); }
    catch (e) { console.error(`  ❌ ${user.email} 발송 실패:`, e); }
  }
  console.log('📧 [일간 리포트] 완료');
};

// ── 공통 Puppeteer PDF 생성 헬퍼 ─────────────────────────────────────────────
// reportController의 generatePdfFromPage, sendPdfByEmail, generateAndSaveReportFiles 에서 공유
export const generatePdfWithPuppeteer = async (
  month: string,
  userId: number,
  type: string = 'monthly',
  originUrl?: string,
  userEmail?: string,
  userName?: string,
): Promise<Buffer> => {
  const tempToken = jwt.sign(
    { id: userId, email: userEmail || 'pdf-generator@internal' },
    process.env.JWT_SECRET || 'channel_ai_secret_key_2024',
    { expiresIn: '1h' }
  );

  const frontendUrl = originUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const reportUrl = type === 'insights'
    ? `${frontendUrl}/insights?month=${month}&pdfMode=true`
    : `${frontendUrl}/monthly-report?month=${month}&pdfMode=true`;
  console.log(`  🌐 [PDF] 접속: ${reportUrl}`);

  let browser;
  try {
    const proxyServer = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        ...(proxyServer ? [`--proxy-server=${proxyServer}`] : []),
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });

    // frontendUrl 먼저 접속 후 localStorage에 인증 정보 주입 (WAS: evaluateOnNewDocument 미작동)
    await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate((token: string, uid: number, email: string, name: string) => {
      (globalThis as any).localStorage.setItem('token', token);
      (globalThis as any).localStorage.setItem('auth-storage', JSON.stringify({
        state: { user: { id: uid, email, name, role: 'admin' }, token, isAuthenticated: true },
        version: 0,
      }));
    }, tempToken, userId, userEmail || 'pdf-generator@internal', userName || 'PDF Generator');

    await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 45000 });

    try {
      await page.waitForSelector('.recharts-responsive-container, .bg-white.border.border-gray-100', { timeout: 15000 });
      console.log('  ✅ [PDF] 렌더링 확인됨');
    } catch {
      console.warn('  ⚠️ [PDF] 렌더링 대기 초과 (계속 진행)');
    }

    // 불필요한 UI 숨김 + 레이아웃 교정 CSS
    await page.addStyleTag({
      content: `
        nav, .floating-tutorial-button, [class*="tutorial"], .pdf-header-container,
        button[class*="download"], button[class*="email"],
        [class*="sticky"][class*="top-0"] { display: none !important; }
        .flex.gap-1.bg-gray-100 { display: none !important; }
        tr, .bg-white.border { page-break-inside: avoid !important; break-inside: avoid !important; }
        svg text { dominant-baseline: central !important; }
        td, th { vertical-align: middle !important; }
        .flex.items-center svg { vertical-align: middle !important; margin-bottom: 2px !important; }
        .flex.items-center span, .flex.items-center p, .flex.items-center div { vertical-align: middle !important; }
      `
    });

    await page.emulateMediaType('screen');
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const headerTitle = type === 'insights' ? '인사이트 리포트' : '월별 통합 성과 보고서';
    const pdf = await page.pdf({
      width: '1280px',
      height: '1810px',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;border-bottom:2px solid #2563eb;margin:0 40px;padding-bottom:15px;display:flex;justify-content:space-between;align-items:flex-end;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;">
          <span style="font-size:24px;font-weight:bold;color:#1e3a8a;">ChannelAI <span style="font-weight:normal;color:#3b82f6;">${headerTitle}</span></span>
          <span style="font-size:18px;font-weight:bold;color:#3b82f6;">${month}</span>
        </div>`,
      footerTemplate: `
        <div style="width:100%;text-align:center;font-size:14px;color:#9ca3af;font-family:sans-serif;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
      margin: { top: '100px', bottom: '80px', left: '0px', right: '0px' },
    });

    const pdfBuffer = Buffer.from(pdf);
    console.log(`  📎 [PDF] 생성 완료 (${pdfBuffer.length} bytes)`);
    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
};

// ── [1단계] 월간 리포트 PDF 생성 → 파일 저장 → DB 경로 저장 ─────────────────
// app.ts cron: 매월 1일 새벽 1시 (0 1 1 * *)
// targetMonth: 'YYYY-MM' 형식 (없으면 지난달 자동 계산)
export const generateAndSaveReportFiles = async (targetMonth?: string): Promise<void> => {
  console.log('📄 [PDF 생성] 시작...');

  let lastMonthStr: string;
  let lastMonth: Date;
  if (targetMonth) {
    lastMonthStr = targetMonth;
    const [y, m] = targetMonth.split('-').map(Number);
    lastMonth = new Date(y, m - 1, 1);
  } else {
    const now = new Date();
    lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  }
  console.log(`  📅 대상 기간: ${lastMonthStr}`);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // 저장 디렉토리 생성
  const reportsDir = path.join(process.cwd(), 'uploads', 'reports', lastMonthStr);
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const result = await pool.query(
    "SELECT u.id, u.email, up.name, up.plan FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.email IS NOT NULL AND u.email != '' ORDER BY u.id"
  );

  if (!result.rows.length) {
    console.warn('  ⚠️ 대상 유저 없음. DB에 이메일이 등록된 유저가 있는지 확인하세요.');
    return;
  }

  const startDate = `${lastMonthStr}-01`;
  const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
    .toISOString().split('T')[0];
  const title = `${lastMonthStr} 월별 광고 성과 보고서`;

  for (const user of result.rows) {
    try {
      const userName = user.name || '사용자';

      // 이미 파일이 존재하면 스킵
      const existing = await pool.query(
        "SELECT file_path FROM reports WHERE user_id = ? AND report_type = 'monthly' AND DATE_FORMAT(start_date, '%Y-%m') = ? ORDER BY created_at DESC LIMIT 1",
        [user.id, lastMonthStr]
      );
      if (existing.rows.length > 0 && existing.rows[0].file_path) {
        const existPath = path.join(process.cwd(), existing.rows[0].file_path);
        if (fs.existsSync(existPath)) {
          console.log(`  ⏩ userId=${user.id} - 이미 존재, 스킵`);
          continue;
        }
      }

      // ── PRO 유저: PDF 생성 전 AI 분석 먼저 실행 ──────────────────────────
      if (user.plan === 'PRO') {
        try {
          await generateMonthlyInsightsForUser(user.id, lastMonthStr);
        } catch (aiErr) {
          console.error(`  ⚠️ userId=${user.id} AI 분석 실패 (PDF 생성은 계속):`, aiErr);
        }
      }

      // ── PDF 생성 (공통 헬퍼 사용 - PDF 저장 버튼과 동일한 품질) ───────────
      let pdfBuffer: Buffer | null = null;
      try {
        pdfBuffer = await generatePdfWithPuppeteer(
          lastMonthStr, user.id, 'monthly', frontendUrl, user.email, userName
        );
      } catch (pdfErr) {
        console.error(`  ❌ userId=${user.id} PDF 생성 실패:`, pdfErr);
      }

      // PDF 실패 시 DB 저장 안 함
      if (!pdfBuffer) {
        console.error(`  ❌ userId=${user.id} PDF 없음 - DB 저장 건너뜀`);
        continue;
      }

      // ── PDF 성공 → 파일 저장 → DB 저장 ──────────────────────────────
      const filename = `report_${user.id}_${lastMonthStr}.pdf`;
      const relativePath = `uploads/reports/${lastMonthStr}/${filename}`;
      fs.writeFileSync(path.join(process.cwd(), relativePath), pdfBuffer);

      const settings = JSON.stringify({ month: lastMonthStr, size: pdfBuffer.length });
      if (existing.rows.length > 0) {
        await pool.query(
          "UPDATE reports SET file_path = ?, settings = ? WHERE user_id = ? AND report_type = 'monthly' AND DATE_FORMAT(start_date, '%Y-%m') = ?",
          [relativePath, settings, user.id, lastMonthStr]
        );
      } else {
        await pool.query(
          "INSERT INTO reports (user_id, title, report_type, start_date, end_date, file_path, settings) VALUES (?, ?, 'monthly', ?, ?, ?, ?)",
          [user.id, title, startDate, endDate, relativePath, settings]
        );
      }
      console.log(`  ✅ 저장 완료: ${relativePath}`);

    } catch (e) {
      console.error(`  ❌ userId=${user.id} 오류:`, e);
    }
  }
  console.log('📄 [PDF 생성] 완료');

  // 생성 완료 후 오래된 리포트 정리 (-2달보다 오래된 것 삭제)
  await cleanupOldReports();
};

// ── 오래된 리포트 정리 (-2달 초과분 파일+DB 삭제) ────────────────────────────
// 보관 기준: 현재달, -1달, -2달  /  -3달 이전은 삭제
export const cleanupOldReports = async (): Promise<void> => {
  console.log('🧹 [리포트 정리] 시작...');

  const now = new Date();
  // -2달까지 보관 → -3달 이전 삭제 기준
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
  console.log(`  📅 삭제 기준: ${cutoffStr} 이전 (보관: 현재~-2달)`);

  // 1. 삭제 대상 DB 레코드 조회 (파일 경로 포함)
  const { rows } = await pool.query(
    "SELECT id, file_path FROM reports WHERE report_type = 'monthly' AND DATE_FORMAT(start_date, '%Y-%m') < ?",
    [cutoffStr]
  );

  if (!rows.length) {
    console.log('  ✅ 삭제 대상 없음');
    return;
  }

  // 2. 파일 삭제
  for (const row of rows) {
    if (row.file_path) {
      const absolutePath = path.join(process.cwd(), row.file_path);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log(`  🗑 파일 삭제: ${row.file_path}`);
      }
    }
  }

  // 3. 빈 월별 디렉토리 삭제 (uploads/reports/YYYY-MM/)
  const reportsBaseDir = path.join(process.cwd(), 'uploads', 'reports');
  if (fs.existsSync(reportsBaseDir)) {
    for (const dir of fs.readdirSync(reportsBaseDir)) {
      if (/^\d{4}-\d{2}$/.test(dir) && dir < cutoffStr) {
        const dirPath = path.join(reportsBaseDir, dir);
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`  🗑 디렉토리 삭제: uploads/reports/${dir}/`);
        } catch (e) {
          console.error(`  ❌ 디렉토리 삭제 실패: ${dir}`, e);
        }
      }
    }
  }

  // 4. DB 레코드 삭제
  await pool.query(
    "DELETE FROM reports WHERE report_type = 'monthly' AND DATE_FORMAT(start_date, '%Y-%m') < ?",
    [cutoffStr]
  );
  console.log(`  🗑 DB 레코드 삭제: ${rows.length}건`);
  console.log('🧹 [리포트 정리] 완료');
};

// ── [2단계] 월간 리포트 이메일 발송 - DB에서 파일 경로 읽어서 발송 ─────────────
// app.ts cron: 매일 9시 20분 (20 9 * * *)
// Puppeteer 실행 없음 - 파일만 읽어서 첨부 발송
export const sendMonthlyReports = async (testUserId?: number): Promise<void> => {
  const label = testUserId ? `[월간 리포트 테스트 userId=${testUserId}]` : '[월간 리포트]';
  console.log(`📧 ${label} 발송 시작...`);

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  console.log(`  📅 대상 기간: ${lastMonthStr}`);

  const userFilter = testUserId ? `AND u.id = ${testUserId}` : '';
  const result = await pool.query(
    `SELECT u.id, u.email, up.name, r.file_path
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     LEFT JOIN reports r ON r.user_id = u.id
       AND r.report_type = 'monthly'
       AND DATE_FORMAT(r.start_date, '%Y-%m') = ?
     WHERE u.email IS NOT NULL AND u.email != '' ${userFilter} ORDER BY u.id`,
    [lastMonthStr]
  );

  for (const user of result.rows) {
    try {
      const userName = user.name || '사용자';

      // 파일 존재 확인
      if (!user.file_path) {
        console.warn(`  ⚠️ userId=${user.id} - DB에 파일 경로 없음 (PDF 미생성). 발송 건너뜀`);
        continue;
      }
      const absolutePath = path.join(process.cwd(), user.file_path);
      if (!fs.existsSync(absolutePath)) {
        console.warn(`  ⚠️ userId=${user.id} - 파일 없음: ${user.file_path}. 발송 건너뜀`);
        continue;
      }

      const pdfBuffer = fs.readFileSync(absolutePath);
      console.log(`  📎 파일 로드: ${user.file_path} (${pdfBuffer.length} bytes)`);

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
        <strong>${lastMonthStr}</strong> 성과 보고서가 준비되었습니다.<br>
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

      const subject = `📊 [ChannelAI] ${lastMonthStr} 월별 광고 성과 보고서`;
      await sendEmail(user.email, subject, emailHtml, [
        { filename: `ChannelAI_월별보고서_${lastMonthStr}.pdf`, content: pdfBuffer },
      ]);
      console.log(`  ✅ 발송 완료: ${user.email}`);
    } catch (e) {
      console.error(`  ❌ ${user.email} 발송 실패:`, e);
    }
  }
  console.log('📧 [월간 리포트] 완료');
};

// ── 전체 사용자 주간 리포트 ────────────────────────────────────────────────
export const sendWeeklyReports = async (): Promise<void> => {
  console.log('📧 [주간 리포트] 발송 시작...');
  const result = await pool.query("SELECT id, email FROM users WHERE email IS NOT NULL AND email != '' ORDER BY id");
  for (const user of result.rows) {
    try { await sendReportToUser(user.id, user.email, toDateStr(daysAgo(7)), toDateStr(new Date()), '주간'); }
    catch (e) { console.error(`  ❌ ${user.email} 발송 실패:`, e); }
  }
  console.log('📧 [주간 리포트] 완료');
};

// ── 특정 이메일로 테스트 리포트 발송 ───────────────────────────────────────
export const sendTestToEmail = async (targetEmail: string, userId: number): Promise<void> => {
  console.log(`📧 [테스트 발송] ${targetEmail} 으로 발송 시작...`);
  const startDate = toDateStr(daysAgo(7));
  const endDate   = toDateStr(new Date());
  const data = await gatherReportData(userId, startDate, endDate);

  if (!data) {
    // 데이터 없어도 샘플 리포트 발송
    const sampleData: ReportData = {
      userName: '테스트 사용자',
      period: { start: startDate, end: endDate },
      totalCost: 1500000, totalImpressions: 320000, totalClicks: 6400,
      totalConversions: 128, roas: 2.5, topCampaign: '(샘플) Launch Campaign',
      recommendations: [
        { priority: '정상', message: '이것은 테스트 이메일입니다. 실제 데이터가 있으면 자동 집계됩니다. 🎉' }
      ],
    };
    const subject = `📊 [ChannelAI] 테스트 리포트 (${startDate} ~ ${endDate})`;
    await sendEmail(targetEmail, subject, buildEmailHtml(sampleData));
  } else {
    const subject = `📊 [ChannelAI] 테스트 리포트 (${data.period.start} ~ ${data.period.end})`;
    await sendEmail(targetEmail, subject, buildEmailHtml(data));
  }
  console.log(`  ✅ 테스트 발송 완료: ${targetEmail}`);
};
