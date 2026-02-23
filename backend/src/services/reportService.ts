/**
 * reportService.ts
 * 사용자별 주간/일간 광고 성과 리포트 생성 및 이메일 발송
 */
import pool from '../config/database';
import { sendEmail } from './emailService';

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
  // 사용자 기본 정보
  const userResult = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
  if (!userResult.rows.length) return null;
  const userName: string = userResult.rows[0].name;

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

  const row = result.rows[0];
  if (!row || !row.totalCost) return null;

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
