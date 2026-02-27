import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { spawn } from 'child_process'; // Python 스크립트 호출용
import path from 'path';               // 스크립트 경로 계산용
import dotenv from 'dotenv';
import { AIAnalysisService } from '../services/ai/aiAnalysisService';
dotenv.config();

const aiAnalysisService = new AIAnalysisService();

/**
 * AI 마케팅 에이전트 컨트롤러
 * 사용자의 실제 광고 데이터를 분석하여 예산 배분 및 집행 액션을 추천
 */

interface PlatformAnalysis {
  platform: string;
  currentBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  roas: number;
  cpa: number;
  campaigns: number;
}

interface AgentRecommendation {
  platform: string;
  action: 'increase' | 'decrease' | 'pause' | 'maintain';
  currentBudget: number;
  recommendedBudget: number;
  budgetChange: number;
  budgetChangePercent: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: string;
}

/**
 * AI 마케팅 에이전트 분석 실행
 * POST /api/v1/ai/agent/analyze
 */
export const analyzeAndRecommend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { totalBudget, period = 30 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }

    // 1. 사용자의 플랫폼별 광고 데이터 조회
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const platformDataQuery = `
      SELECT 
        ma.channel_code AS platform,
        COUNT(DISTINCT c.id) as campaign_count,
        COALESCE(SUM(c.daily_budget), 0) as total_daily_budget,
        COALESCE(SUM(c.total_budget), 0) as total_budget,
        COALESCE(SUM(cm.impressions), 0) as impressions,
        COALESCE(SUM(cm.clicks), 0) as clicks,
        COALESCE(SUM(cm.conversions), 0) as conversions,
        COALESCE(SUM(cm.cost), 0) as cost,
        COALESCE(SUM(cm.revenue), 0) as revenue,
        CASE WHEN SUM(cm.impressions) > 0 
          THEN ROUND(SUM(cm.clicks) / SUM(cm.impressions) * 100, 4) ELSE 0 END as ctr,
        CASE WHEN SUM(cm.clicks) > 0 
          THEN ROUND(SUM(cm.cost) / SUM(cm.clicks), 2) ELSE 0 END as cpc,
        CASE WHEN SUM(cm.cost) > 0 
          THEN ROUND(SUM(cm.revenue) / SUM(cm.cost), 4) ELSE 0 END as roas,
        CASE WHEN SUM(cm.conversions) > 0 
          THEN ROUND(SUM(cm.cost) / SUM(cm.conversions), 2) ELSE 0 END as cpa
      FROM marketing_accounts ma
      LEFT JOIN campaigns c ON c.marketing_account_id = ma.id AND c.status = 'active'
      LEFT JOIN campaign_metrics cm ON cm.campaign_id = c.id 
        AND cm.metric_date >= ? AND cm.metric_date <= ?
      WHERE ma.user_id = ?
      GROUP BY ma.channel_code
      ORDER BY COALESCE(SUM(cm.cost), 0) DESC
    `;

    const platformResult = await pool.query(platformDataQuery, [startDate, endDate, userId]);
    const platformData: PlatformAnalysis[] = platformResult.rows.map((row: any) => ({
      platform: row.platform,
      currentBudget: Number(row.total_budget) || 0,
      spent: Number(row.cost) || 0,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
      revenue: Number(row.revenue) || 0,
      ctr: Number(row.ctr) || 0,
      cpc: Number(row.cpc) || 0,
      roas: Number(row.roas) || 0,
      cpa: Number(row.cpa) || 0,
      campaigns: Number(row.campaign_count) || 0,
    }));

    // 2. 일별 트렌드 데이터 조회 (최근 변화 감지용)
    const trendQuery = `
      SELECT 
        cm.metric_date AS date,
        ma.channel_code AS platform,
        COALESCE(SUM(cm.impressions), 0) as impressions,
        COALESCE(SUM(cm.clicks), 0) as clicks,
        COALESCE(SUM(cm.conversions), 0) as conversions,
        COALESCE(SUM(cm.cost), 0) as cost,
        COALESCE(SUM(cm.revenue), 0) as revenue
      FROM campaign_metrics cm
      JOIN campaigns c ON cm.campaign_id = c.id
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ? AND cm.metric_date >= ? AND cm.metric_date <= ?
      GROUP BY cm.metric_date, ma.channel_code
      ORDER BY cm.metric_date DESC
    `;

    const trendResult = await pool.query(trendQuery, [userId, startDate, endDate]);

    // 3. AI 에이전트 분석 로직
    const userTotalBudget = totalBudget || platformData.reduce((sum, p) => sum + p.currentBudget, 0);
    const totalSpent = platformData.reduce((sum, p) => sum + p.spent, 0);
    const recommendations = generateRecommendations(platformData, userTotalBudget, trendResult.rows);

    // 4. 종합 인사이트 생성
    const overallInsight = generateOverallInsight(platformData, userTotalBudget, totalSpent);

    return res.json({
      success: true,
      data: {
        analysis: {
          period: { startDate, endDate, days: period },
          totalBudget: userTotalBudget,
          totalSpent,
          budgetUtilization: userTotalBudget > 0 ? Math.round((totalSpent / userTotalBudget) * 100) : 0,
          platformCount: platformData.length,
        },
        platforms: platformData,
        recommendations,
        overallInsight,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI 에이전트 분석 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'AI 분석 중 오류가 발생했습니다.',
      message: error.message,
    });
  }
};

/**
 * AI 에이전트 상태 조회
 * GET /api/v1/ai/agent/status
 */
export const getAgentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // 사용자 광고 데이터 존재 여부 확인
    const dataCheckQuery = `
      SELECT 
        COUNT(DISTINCT ma.id) as account_count,
        COUNT(DISTINCT c.id) as campaign_count,
        COUNT(DISTINCT cm.id) as metrics_count
      FROM marketing_accounts ma
      LEFT JOIN campaigns c ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON cm.campaign_id = c.id
      WHERE ma.user_id = ?
    `;

    const result = await pool.query(dataCheckQuery, [userId]);
    const stats = result.rows[0];

    const hasData = Number(stats.metrics_count) > 0;
    const hasAccounts = Number(stats.account_count) > 0;
    const hasCampaigns = Number(stats.campaign_count) > 0;

    return res.json({
      success: true,
      data: {
        ready: hasData,
        accounts: Number(stats.account_count),
        campaigns: Number(stats.campaign_count),
        dataPoints: Number(stats.metrics_count),
        message: hasData
          ? 'AI 마케팅 에이전트가 분석할 준비가 되었습니다.'
          : !hasAccounts
          ? '광고 계정을 먼저 연동해주세요.'
          : !hasCampaigns
          ? '활성 캠페인이 없습니다. 캠페인을 생성해주세요.'
          : '광고 성과 데이터가 아직 수집되지 않았습니다. 캠페인 실행 후 다시 확인해주세요.',
      },
    });
  } catch (error: any) {
    console.error('AI 에이전트 상태 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: '상태 조회 중 오류가 발생했습니다.',
    });
  }
};

/**
 * 고급 모델 테스트 - 매체별 최우수/최하위 캠페인 분석 리포트
 * GET /api/v1/ai/agent/advanced-metrics
 * 쿼리 파라미터: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD) - 없으면 전체 기간
 */
export const getAdvancedMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }

    // 쿼리 파라미터에서 기간 필터 추출 (없으면 전체 기간 조회)
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // 날짜 필터가 있을 경우 WHERE 조건을 동적으로 추가
    const dateFilter = startDate && endDate
      ? `AND cm.metric_date >= ? AND cm.metric_date <= ?`
      : '';

    // 날짜 파라미터 배열 구성 (날짜 필터가 있을 때만 값 추가)
    const queryParams: any[] = startDate && endDate ? [startDate, endDate] : [];

    const rawMetricsQuery = `
      SELECT 
        ma.channel_code AS platform,
        c.campaign_name,
        COALESCE(SUM(cm.conversions), 0) as total_conversions,
        COALESCE(SUM(cm.cost), 0) as total_cost
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      JOIN campaign_metrics cm ON c.id = cm.campaign_id
      ${dateFilter}
      GROUP BY ma.channel_code, c.campaign_name
    `;

    const result = await pool.query(rawMetricsQuery, queryParams);
    
    // JS 레벨에서 그룹핑 및 분석 진행 (MySQL 버전 의존성 제거)
    const groupedData: Record<string, {name: string, efficiency: number}[]> = {};

    for (const row of result.rows) {
      const platform = row.platform;
      // 1원 당 전환 수(효율) 계산 (0으로 나누기 방지를 위해 +1)
      const efficiency = Number(row.total_conversions) / (Number(row.total_cost) + 1);
      
      if (!groupedData[platform]) {
        groupedData[platform] = [];
      }
      groupedData[platform].push({ name: row.campaign_name, efficiency });
    }

    // 효율 기준으로 정렬 후 최우수(best)/최하위(worst) 캠페인 추출
    const campaignRanks = Object.keys(groupedData).map(platform => {
      const camps = groupedData[platform].sort((a, b) => b.efficiency - a.efficiency);
      return {
        media: platform,
        best: camps.length > 0 ? camps[0].name : '-',
        worst: camps.length > 0 ? camps[camps.length - 1].name : '-'
      };
    });

    // AI 전문가 분석 추가 (300자 내외)
    const aiAnalysis = await aiAnalysisService.analyzeCampaignRanks(campaignRanks);

    return res.json({
      success: true,
      data: {
        campaignRanks,
        aiAnalysis, // AI 분석 텍스트 추가
        // 적용된 기간 정보도 함께 반환 (프론트에서 표시용)
        period: startDate && endDate ? { startDate, endDate } : null,
      }
    });

  } catch (error: any) {
    console.error('고급 모델 지표 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: '고급 모델 지표 분석 중 오류가 발생했습니다.',
    });
  }
};


// =============================================================
// 내부 분석 함수 (추후 ML 모델로 교체 예정)
// =============================================================

/**
 * 플랫폼별 추천 액션 생성
 * - 현재는 규칙 + 통계 기반, 추후 ML 모델로 교체 예정
 */
function generateRecommendations(
  platforms: PlatformAnalysis[],
  totalBudget: number,
  trends: any[]
): AgentRecommendation[] {
  if (platforms.length === 0) return [];

  // 소상공인 업종 벤치마크 (사전학습 데이터 기반, 추후 모델에서 동적 생성)
  const benchmarks = {
    ctr: { good: 3.0, average: 1.5, poor: 0.5 },
    roas: { good: 4.0, average: 2.0, poor: 1.0 },
    cpc: { good: 300, average: 800, poor: 1500 },
    cpa: { good: 5000, average: 15000, poor: 30000 },
  };

  // 전체 평균 ROAS 계산
  const totalCost = platforms.reduce((s, p) => s + p.spent, 0);
  const totalRevenue = platforms.reduce((s, p) => s + p.revenue, 0);
  const avgRoas = totalCost > 0 ? totalRevenue / totalCost : 0;

  // 각 플랫폼 점수 계산 (복합 지표 기반)
  const scoredPlatforms = platforms.map((p) => {
    let score = 0;

    // ROAS 점수 (40% 가중치)
    if (p.roas >= benchmarks.roas.good) score += 40;
    else if (p.roas >= benchmarks.roas.average) score += 25;
    else if (p.roas >= benchmarks.roas.poor) score += 10;

    // CTR 점수 (25% 가중치)
    if (p.ctr >= benchmarks.ctr.good) score += 25;
    else if (p.ctr >= benchmarks.ctr.average) score += 15;
    else if (p.ctr >= benchmarks.ctr.poor) score += 5;

    // CPC 효율 점수 (20% 가중치)
    if (p.cpc > 0 && p.cpc <= benchmarks.cpc.good) score += 20;
    else if (p.cpc <= benchmarks.cpc.average) score += 12;
    else if (p.cpc <= benchmarks.cpc.poor) score += 5;

    // 전환 효율 점수 (15% 가중치)
    if (p.cpa > 0 && p.cpa <= benchmarks.cpa.good) score += 15;
    else if (p.cpa <= benchmarks.cpa.average) score += 9;
    else if (p.cpa <= benchmarks.cpa.poor) score += 3;

    return { ...p, score };
  });

  // 점수 기반 예산 배분 계산
  const totalScore = scoredPlatforms.reduce((s, p) => s + p.score, 0);

  return scoredPlatforms.map((p) => {
    const scoreRatio = totalScore > 0 ? p.score / totalScore : 1 / platforms.length;
    const recommendedBudget = Math.round(totalBudget * scoreRatio);
    const budgetChange = recommendedBudget - p.currentBudget;
    const budgetChangePercent = p.currentBudget > 0
      ? Math.round((budgetChange / p.currentBudget) * 100)
      : recommendedBudget > 0 ? 100 : 0;

    // 액션 결정
    let action: AgentRecommendation['action'];
    let priority: AgentRecommendation['priority'];
    let reason: string;
    let expectedImpact: string;

    if (p.score >= 60) {
      // 고성과 플랫폼
      if (budgetChange > 0) {
        action = 'increase';
        priority = 'high';
        reason = `${p.platform}의 ROAS ${p.roas.toFixed(2)}x, CTR ${p.ctr.toFixed(2)}%로 성과가 우수합니다. 예산을 증액하여 더 많은 전환을 확보하세요.`;
        expectedImpact = `예산 ${Math.abs(budgetChangePercent)}% 증액 시, 예상 추가 전환 ${Math.round((p.conversions / (p.spent || 1)) * Math.abs(budgetChange))}건`;
      } else {
        action = 'maintain';
        priority = 'low';
        reason = `${p.platform}의 성과가 좋습니다. 현재 예산 수준을 유지하세요.`;
        expectedImpact = '현재 성과 수준 유지';
      }
    } else if (p.score >= 30) {
      // 보통 성과 플랫폼
      action = budgetChange < 0 ? 'decrease' : 'maintain';
      priority = 'medium';
      reason = `${p.platform}의 성과가 평균 수준입니다. ${
        p.ctr < benchmarks.ctr.average
          ? '클릭률 개선을 위해 광고 소재를 점검하세요.'
          : p.roas < benchmarks.roas.average
          ? 'ROAS 개선을 위해 타겟팅을 재검토하세요.'
          : '전환율 최적화에 집중하세요.'
      }`;
      expectedImpact = budgetChange < 0
        ? `예산 ${Math.abs(budgetChangePercent)}% 감축으로 비효율 비용 절감`
        : '소재 최적화로 CTR 개선 기대';
    } else {
      // 저성과 플랫폼
      if (p.roas < 0.5 && p.spent > 0) {
        action = 'pause';
        priority = 'high';
        reason = `${p.platform}의 ROAS가 ${p.roas.toFixed(2)}x로 매우 낮습니다. 광고 집행을 일시 중단하고 전략을 재수립하세요.`;
        expectedImpact = `집행 중단 시, 월 약 ${Math.round(p.spent).toLocaleString()}원 절감`;
      } else {
        action = 'decrease';
        priority = 'high';
        reason = `${p.platform}의 성과가 기준 미달입니다. 예산을 줄이고 고성과 플랫폼으로 재배분하세요.`;
        expectedImpact = `예산 ${Math.abs(budgetChangePercent)}% 감축, 절감 예산을 고성과 채널에 재배분`;
      }
    }

    return {
      platform: p.platform,
      action,
      currentBudget: p.currentBudget,
      recommendedBudget,
      budgetChange,
      budgetChangePercent,
      reason,
      priority,
      expectedImpact,
    };
  });
}

/**
 * 종합 인사이트 생성
 */
function generateOverallInsight(
  platforms: PlatformAnalysis[],
  totalBudget: number,
  totalSpent: number
): {
  summary: string;
  keyFindings: string[];
  actionItems: string[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const findings: string[] = [];
  const actions: string[] = [];
  let riskScore = 0;

  // 전체 ROAS 분석
  const totalRevenue = platforms.reduce((s, p) => s + p.revenue, 0);
  const overallRoas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

  if (overallRoas < 1.0) {
    findings.push(`전체 ROAS가 ${overallRoas.toFixed(2)}x로 투자 대비 수익이 마이너스입니다.`);
    actions.push('저성과 플랫폼의 예산을 즉시 재배분하세요.');
    riskScore += 3;
  } else if (overallRoas < 2.0) {
    findings.push(`전체 ROAS ${overallRoas.toFixed(2)}x로 수익은 나지만 개선 여지가 있습니다.`);
    riskScore += 1;
  } else {
    findings.push(`전체 ROAS ${overallRoas.toFixed(2)}x로 양호한 수준입니다.`);
  }

  // 예산 활용률 분석
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  if (utilization > 90) {
    findings.push(`예산 사용률이 ${utilization.toFixed(0)}%로 거의 소진되었습니다.`);
    actions.push('예산 추가 확보 또는 저성과 캠페인 일시 중단을 검토해주세요.');
    riskScore += 2;
  } else if (utilization < 30) {
    findings.push(`예산 사용률이 ${utilization.toFixed(0)}%로 낮습니다.`);
    actions.push('고성과 캠페인에 예산을 더 적극적으로 투입하세요.');
  }

  // 플랫폼 다각화 분석
  if (platforms.length === 1) {
    findings.push('광고 채널이 1개뿐입니다. 리스크 분산이 필요합니다.');
    actions.push('추가 플랫폼 연동으로 채널 다각화를 추천합니다.');
    riskScore += 1;
  }

  // 비효율 플랫폼 체크
  const inefficient = platforms.filter((p) => p.roas < 1.0 && p.spent > 0);
  if (inefficient.length > 0) {
    findings.push(`${inefficient.map((p) => p.platform).join(', ')} 플랫폼이 손실을 발생시키고 있습니다.`);
    actions.push('해당 플랫폼의 캠페인 전략을 재검토하거나 예산을 재배분하세요.');
    riskScore += inefficient.length;
  }

  // 리스크 레벨 결정
  const riskLevel: 'low' | 'medium' | 'high' = riskScore >= 4 ? 'high' : riskScore >= 2 ? 'medium' : 'low';

  // 종합 요약 생성
  const summary = platforms.length > 0
    ? `${platforms.length}개 플랫폼에서 총 ${totalSpent.toLocaleString()}원이 집행되었으며, 전체 ROAS는 ${overallRoas.toFixed(2)}x입니다. ${
        riskLevel === 'high'
          ? '즉각적인 예산 재배분이 필요합니다.'
          : riskLevel === 'medium'
          ? '일부 플랫폼의 성과 개선이 필요합니다.'
          : '전반적으로 양호한 성과를 보이고 있습니다.'
      }`
    : '연동된 광고 데이터가 없습니다. 광고 플랫폼을 연동한 후 AI 에이전트를 활용해보세요.';

  return {
    summary,
    keyFindings: findings.length > 0 ? findings : ['분석할 광고 데이터가 충분하지 않습니다.'],
    actionItems: actions.length > 0 ? actions : ['광고 성과 데이터가 쌓이면 구체적인 액션을 제안드립니다.'],
    riskLevel,
  };
}

/**
 * 실시간 ML 예측 - XGBoost 전환 예측 + RandomForest 최적 매체 추천
 * GET /api/v1/ai/agent/ml-realtime
 * 쿼리 파라미터: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD) - 없으면 전체 기간
 */
export const getMLRealtime = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // Python 스크립트 절대 경로 (backend/python/ml_predict.py)
    const scriptPath = path.join(__dirname, '../../python/ml_predict.py');

    // Anaconda Python 실행 경로 → 환경변수로 관리 (.env의 PYTHON_PATH)
    // 설정 안 됐을 경우 'python3' 폴백 (Linux 서버 배포 시 자동 동작)
    const pythonPath = process.env.PYTHON_PATH || 'python3';

    // DB 접속 정보를 커맨드라인 인수로 전달 (환경변수 직접 노출 최소화)
    const args = [
      scriptPath,
      `--host=${process.env.DB_HOST}`,
      `--port=${process.env.DB_PORT || 3306}`,
      `--db=${process.env.DB_NAME}`,
      `--user=${process.env.DB_USER}`,
      `--password=${process.env.DB_PASSWORD}`,
    ];

    // 날짜 필터가 있을 때만 인수 추가
    // YYYY-MM-DD 형식만 허용 (SQL Injection / 잘못된 값 방지)
    if (startDate && endDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_DATE_FORMAT',
          message: '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
        });
      }
      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: '시작일이 종료일보다 늦을 수 없습니다.',
        });
      }
      args.push(`--start=${startDate}`);
      args.push(`--end=${endDate}`);
    }

    // Python 프로세스 실행
    // PYTHONIOENCODING=utf-8: Windows에서 Python stdout이 cp949로 출력되는 문제 방지
    const pyProcess = spawn(pythonPath, args, {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });

    let stdout = '';
    let stderr = '';

    // Python이 print(json.dumps(...))로 출력하는 데이터 누적
    pyProcess.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    // Python 에러/경고 메시지 누적
    pyProcess.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    // 프로세스 종료 후 결과 파싱 및 응답 반환
    pyProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('Python 스크립트 오류:', stderr);
        return res.status(500).json({
          success: false,
          error: 'ML 분석 스크립트 실행 오류',
          detail: stderr.slice(0, 500), // 에러 메시지 일부만 노출
        });
      }
      try {
        const mlResult = JSON.parse(stdout.trim()); // stdout을 JSON으로 파싱

        // XGBoost AI 분석 (Random Forest는 모델 확인 용이므로 제외)
        let xgboostAnalysis = '';

        if (mlResult.xgboost?.status === 'success') {
          xgboostAnalysis = await aiAnalysisService.analyzeXGBoost(
            mlResult.xgboost.mae,
            mlResult.xgboost.platformMae,
            mlResult.xgboost.sample
          );
        }

        return res.json({
          success: true,
          data: {
            ...mlResult,
            xgboost: mlResult.xgboost ? { ...mlResult.xgboost, aiAnalysis: xgboostAnalysis } : null,
          },
          period: startDate && endDate ? { startDate, endDate } : null,
        });
      } catch {
        console.error('Python 결과 파싱 실패:', stdout);
        return res.status(500).json({ success: false, error: 'ML 결과 파싱 실패' });
      }
    });

    // Python 프로세스 자체 실행 실패 (파일 없음 등)
    pyProcess.on('error', (err) => {
      console.error('Python 프로세스 실행 실패:', err);
      return res.status(500).json({ success: false, error: `Python 실행 실패: ${err.message}` });
    });

  } catch (error: any) {
    console.error('ML 실시간 예측 오류:', error);
    return res.status(500).json({ success: false, error: 'ML 예측 중 오류가 발생했습니다.' });
  }
};
