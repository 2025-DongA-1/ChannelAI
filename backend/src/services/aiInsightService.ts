/**
 * aiInsightService.ts
 * 월별 AI 분석 서비스 - 컨트롤러 없이 직접 DB 조회 + LLM 분석 + DB 저장
 * reportService.ts의 generateAndSaveReportFiles에서 PRO 유저에게 호출
 */
import pool from '../config/database';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * PRO 유저의 월별 AI 분석을 생성하여 insights 테이블에 저장
 * 이미 해당 월 분석이 존재하면 건너뜀
 */
export const generateMonthlyInsightsForUser = async (userId: number, month: string): Promise<void> => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn(`  ⚠️ [AI Insights] OPENAI_API_KEY 없음 - 건너뜀`);
    return;
  }

  // 이미 분석 결과가 있으면 건너뜀
  const existing = await pool.query(
    `SELECT id FROM insights WHERE user_id = ? AND type = 'monthly_report' AND title = ? LIMIT 1`,
    [userId, month]
  );
  if ((existing as any).rows.length > 0) {
    console.log(`  ⏩ [AI Insights] userId=${userId} ${month} - 이미 존재, 건너뜀`);
    return;
  }

  console.log(`  🤖 [AI Insights] userId=${userId} ${month} 분석 시작...`);

  // ── DB에서 데이터 수집 ──────────────────────────────────────────────────
  const [y, m] = month.split('-').map(Number);
  const sixMonthsAgo = new Date(y, m - 6, 1);
  const startMonth = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

  const [summaryResult, platformResult, campaignResult] = await Promise.all([
    // 최근 6개월 추이
    pool.query(`
      SELECT
        DATE_FORMAT(cm.metric_date, '%Y-%m') AS month,
        SUM(cm.cost) AS cost, SUM(cm.impressions) AS impressions,
        SUM(cm.clicks) AS clicks, SUM(cm.conversions) AS conversions,
        SUM(cm.revenue) AS revenue,
        ROUND(SUM(cm.revenue)/NULLIF(SUM(cm.cost),0)*100, 0) AS roas
      FROM campaign_metrics cm
      INNER JOIN campaigns c ON cm.campaign_id = c.id
      INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ? AND DATE_FORMAT(cm.metric_date, '%Y-%m') BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(cm.metric_date, '%Y-%m')
      ORDER BY month ASC
    `, [userId, startMonth, month]),

    // 선택 월 플랫폼별 성과
    pool.query(`
      SELECT
        ma.channel_code AS platform,
        SUM(cm.cost) AS spend, SUM(cm.impressions) AS impressions,
        SUM(cm.clicks) AS clicks, SUM(cm.conversions) AS conversions,
        SUM(cm.revenue) AS revenue,
        ROUND(SUM(cm.revenue)/NULLIF(SUM(cm.cost),0)*100, 0) AS roas
      FROM campaign_metrics cm
      INNER JOIN campaigns c ON cm.campaign_id = c.id
      INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ? AND DATE_FORMAT(cm.metric_date, '%Y-%m') = ?
      GROUP BY ma.channel_code
    `, [userId, month]),

    // 선택 월 캠페인별 성과
    pool.query(`
      SELECT
        c.id AS campaign_id, c.campaign_name,
        ma.channel_code AS platform, c.status,
        SUM(cm.cost) AS cost, SUM(cm.impressions) AS impressions,
        SUM(cm.clicks) AS clicks, SUM(cm.conversions) AS conversions,
        SUM(cm.revenue) AS revenue,
        ROUND(SUM(cm.clicks)/NULLIF(SUM(cm.impressions),0)*100, 2) AS ctr,
        ROUND(SUM(cm.revenue)/NULLIF(SUM(cm.cost),0)*100, 0) AS roas
      FROM campaign_metrics cm
      INNER JOIN campaigns c ON cm.campaign_id = c.id
      INNER JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ? AND DATE_FORMAT(cm.metric_date, '%Y-%m') = ?
      GROUP BY c.id, c.campaign_name, ma.channel_code, c.status
      ORDER BY SUM(cm.cost) DESC
    `, [userId, month]),
  ]);

  const trendsData = (summaryResult as any).rows;
  const platformData: Record<string, any> = {};
  for (const r of (platformResult as any).rows) platformData[r.platform] = r;
  const campaignData = (campaignResult as any).rows;

  if (!trendsData.length && !campaignData.length) {
    console.warn(`  ⚠️ [AI Insights] userId=${userId} ${month} - 광고 데이터 없음, 건너뜀`);
    return;
  }

  // ── LLM 분석 (5개 프롬프트 병렬 실행) ────────────────────────────────────
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    modelKwargs: { response_format: { type: 'json_object' } },
  });

  const overallPrompt = PromptTemplate.fromTemplate(`
    당신은 마케팅 성과 분석 전문가이자 비즈니스 컨설턴트입니다.
    아래 데이터를 바탕으로 선택 월의 전체 광고 성과를 종합 요약하세요.
    반드시 아래 구조의 JSON 객체 하나만 반환하세요:
    {{"overall": "분석 내용"}}
    - 선택 월: {selectedMonth}
    - 플랫폼 성과: {platforms}
    - 최근 6개월 추이: {trends}
    [가이드라인]
    - 약 300자, 따뜻하고 전문적인 어조
    - 전체 비용/매출/ROAS 수치를 직접 언급할 것
    - 존댓말(해요/합니다) 사용
    - JSON 외 텍스트 금지
    - Karrot은 당근으로 표시해
  `);

  const channelsPrompt = PromptTemplate.fromTemplate(`
    당신은 광고 채널 효율 분석 전문가입니다.
    아래 플랫폼별 성과 데이터를 바탕으로 각 채널을 개별 심층 분석하세요.
    반드시 아래 구조의 JSON 객체 하나만 반환하세요:
    {{
      "channels": {{
        "platform_code": "해당 채널 핵심 성과 분석 (약 100자, 강점·약점·개선 방향 포함). platform_code는 데이터의 platform 필드값(meta, google, naver, karrot)과 정확히 일치"
      }}
    }}
    - 선택 월: {selectedMonth}
    - 플랫폼 성과: {platforms}
    [가이드라인]
    - 각 채널의 광고비·전환수·ROAS 수치를 직접 언급할 것
    - 일반론 금지, 데이터 기반 분석
    - 존댓말(해요/합니다) 사용
    - JSON 외 텍스트 금지
    - Karrot은 당근으로 표시해
  `);

  const trendPrompt = PromptTemplate.fromTemplate(`
    당신은 마케팅 트렌드 분석 전문가입니다.
    아래 6개월 추이 데이터를 바탕으로 성과 흐름을 분석하고 향후 방향을 예측하세요.
    반드시 아래 구조의 JSON 객체 하나만 반환하세요:
    {{"trendSummary": "분석 내용"}}
    - 선택 월: {selectedMonth}
    - 최근 6개월 추이: {trends}
    [가이드라인]
    - 약 300자, 월별 증감 수치를 직접 언급할 것
    - 현재 추세 + 향후 예측 방향 포함
    - 존댓말(해요/합니다) 사용
    - JSON 외 텍스트 금지
    - Karrot은 당근으로 표시해
  `);

  const campaignsPrompt = PromptTemplate.fromTemplate(`
    당신은 광고 캠페인 최적화 전문가입니다.
    아래 캠페인별 성과 데이터를 바탕으로 각 캠페인을 개별 심층 분석하세요.
    반드시 아래 구조의 JSON 객체 하나만 반환하세요:
    {{
      "campaigns": {{
        "여기에_실제_campaign_id값": "성과 원인 분석, 구체적 문제점, 즉각 실행 가능한 최적화 액션 (약 350자)"
      }}
    }}
    ※ 키는 반드시 각 캠페인 데이터의 campaign_id 필드값(문자열)을 그대로 사용할 것.
    - 선택 월: {selectedMonth}
    - 주요 캠페인 성과: {campaigns}
    [가이드라인]
    - ROAS·전환수·CTR 등 수치를 직접 언급할 것
    - 일반론 금지, 실행 가능한 구체적 액션 제시
    - 존댓말(해요/합니다) 사용
    - JSON 외 텍스트 금지
    - Karrot은 당근으로 표시해
  `);

  const channelSummaryPrompt = PromptTemplate.fromTemplate(`
    당신은 마케팅 성과 분석 전문가이자 비즈니스 컨설턴트입니다.
    제공된 월별 성과 데이터와 추이 데이터를 바탕으로 다각도로 분석하여 JSON 형식으로 응답해 주세요.
    - 선택 월: {selectedMonth}
    - 플랫폼 성과: {platforms}
    - 최근 6개월 추이: {trends}
    - 주요 캠페인 성과: {campaigns}
    반드시 아래 구조의 JSON 객체 하나만 반환하세요:
    {{"channelSummary": "전체 채널 간 비교 및 예산 효율 분석 (약 200자)"}}
    [가이드라인]
    - 일반론적인 조언 금지. 수치와 데이터에 기반할 것.
    - 존댓말(해요/합니다) 사용
    - JSON 외 텍스트 금지
    - Karrot은 당근으로 표시해
  `);

  const platformsStr  = JSON.stringify(platformData);
  const trendsStr     = JSON.stringify(trendsData);
  const campaignsStr  = JSON.stringify(campaignData);

  const [overallRes, channelsRes, trendRes, campaignsRes, channelSummaryRes] = await Promise.all([
    model.invoke(await overallPrompt.format({ selectedMonth: month, platforms: platformsStr, trends: trendsStr })),
    model.invoke(await channelsPrompt.format({ selectedMonth: month, platforms: platformsStr })),
    model.invoke(await trendPrompt.format({ selectedMonth: month, trends: trendsStr })),
    model.invoke(await campaignsPrompt.format({ selectedMonth: month, campaigns: campaignsStr })),
    model.invoke(await channelSummaryPrompt.format({ selectedMonth: month, platforms: platformsStr, trends: trendsStr, campaigns: campaignsStr })),
  ]);

  const content = JSON.stringify({
    ...JSON.parse(overallRes.content as string),
    ...JSON.parse(channelsRes.content as string),
    ...JSON.parse(trendRes.content as string),
    ...JSON.parse(campaignsRes.content as string),
    ...JSON.parse(channelSummaryRes.content as string),
  });

  // ── insights 테이블 저장 ──────────────────────────────────────────────────
  await pool.query(
    `DELETE FROM insights WHERE user_id = ? AND type = 'monthly_report' AND title = ?`,
    [userId, month]
  );
  await pool.query(
    `INSERT INTO insights (user_id, type, title, content, metadata, priority, is_read, is_applied)
     VALUES (?, 'monthly_report', ?, ?, ?, 3, 0, 0)`,
    [userId, month, content, JSON.stringify({ generated_from: 'gpt-4o-mini', timestamp: Date.now() })]
  );
  console.log(`  ✅ [AI Insights] userId=${userId} ${month} 분석 완료`);
};
