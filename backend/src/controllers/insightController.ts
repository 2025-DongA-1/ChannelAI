import { Request, Response } from 'express';
import pool from '../config/database';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// 추세 분석
export const getTrends = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { start_date, end_date, period = 'daily' } = req.query;
    
    // 기본 기간: 최근 30일
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date 
      ? new Date(start_date as string) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 현재 기간 데이터
    const currentPeriodQuery = `
      SELECT 
        DATE(cm.date) as date,
        SUM(cm.impressions) as impressions,
        SUM(cm.clicks) as clicks,
        SUM(cm.conversions) as conversions,
        SUM(cm.cost) as cost,
        SUM(cm.revenue) as revenue
      FROM campaign_metrics cm
      JOIN campaigns c ON cm.campaign_id = c.id
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
        AND cm.date BETWEEN ? AND ?
      GROUP BY DATE(cm.date)
      ORDER BY DATE(cm.date)
    `;
    
    const currentData = await client.query(currentPeriodQuery, [
      userId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]);
    
    // 이전 기간 데이터 (비교용)
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - periodLength * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    
    const previousPeriodQuery = `
      SELECT 
        SUM(cm.impressions) as impressions,
        SUM(cm.clicks) as clicks,
        SUM(cm.conversions) as conversions,
        SUM(cm.cost) as cost,
        SUM(cm.revenue) as revenue
      FROM campaign_metrics cm
      JOIN campaigns c ON cm.campaign_id = c.id
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
        AND cm.date BETWEEN ? AND ?
    `;
    
    const previousData = await client.query(previousPeriodQuery, [
      userId,
      previousStartDate.toISOString().split('T')[0],
      previousEndDate.toISOString().split('T')[0],
    ]);
    
    // 현재 기간 총합
    const currentTotals = currentData.rows.reduce((acc: any, row: any) => ({
      impressions: (acc.impressions || 0) + Number(row.impressions || 0),
      clicks: (acc.clicks || 0) + Number(row.clicks || 0),
      conversions: (acc.conversions || 0) + Number(row.conversions || 0),
      cost: (acc.cost || 0) + Number(row.cost || 0),
      revenue: (acc.revenue || 0) + Number(row.revenue || 0),
    }), {});
    
    const previous = previousData.rows[0] || {};
    
    // 증감률 계산
    const calculateChange = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };
    
    const changes = {
      impressions: calculateChange(currentTotals.impressions, Number(previous.impressions || 0)),
      clicks: calculateChange(currentTotals.clicks, Number(previous.clicks || 0)),
      conversions: calculateChange(currentTotals.conversions, Number(previous.conversions || 0)),
      cost: calculateChange(currentTotals.cost, Number(previous.cost || 0)),
      revenue: calculateChange(currentTotals.revenue, Number(previous.revenue || 0)),
      ctr: calculateChange(
        currentTotals.impressions > 0 ? (currentTotals.clicks / currentTotals.impressions) * 100 : 0,
        Number(previous.impressions || 0) > 0 ? (Number(previous.clicks || 0) / Number(previous.impressions || 0)) * 100 : 0
      ),
      roas: calculateChange(
        currentTotals.cost > 0 ? currentTotals.revenue / currentTotals.cost : 0,
        Number(previous.cost || 0) > 0 ? Number(previous.revenue || 0) / Number(previous.cost || 0) : 0
      ),
    };
    
    res.json({
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      current: currentTotals,
      previous: {
        impressions: Number(previous.impressions || 0),
        clicks: Number(previous.clicks || 0),
        conversions: Number(previous.conversions || 0),
        cost: Number(previous.cost || 0),
        revenue: Number(previous.revenue || 0),
      },
      changes,
      timeline: currentData.rows.map(row => ({
        date: row.date,
        impressions: Number(row.impressions || 0),
        clicks: Number(row.clicks || 0),
        conversions: Number(row.conversions || 0),
        cost: Number(row.cost || 0),
        revenue: Number(row.revenue || 0),
        ctr: Number(row.impressions || 0) > 0 ? (Number(row.clicks || 0) / Number(row.impressions || 0)) * 100 : 0,
        cpc: Number(row.clicks || 0) > 0 ? Number(row.cost || 0) / Number(row.clicks || 0) : 0,
        roas: Number(row.cost || 0) > 0 ? Number(row.revenue || 0) / Number(row.cost || 0) : 0,
      })),
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '추세 분석 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 플랫폼 비교
export const getComparison = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { start_date, end_date } = req.query;
    
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date 
      ? new Date(start_date as string) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const query = `
      SELECT 
        ma.platform,
        COUNT(DISTINCT c.id) as campaign_count,
        SUM(cm.impressions) as impressions,
        SUM(cm.clicks) as clicks,
        SUM(cm.conversions) as conversions,
        SUM(cm.cost) as cost,
        SUM(cm.revenue) as revenue,
        AVG(CASE WHEN cm.impressions > 0 THEN (cm.clicks / cm.impressions) * 100 ELSE 0 END) as avg_ctr,
        AVG(CASE WHEN cm.clicks > 0 THEN cm.cost / cm.clicks ELSE 0 END) as avg_cpc,
        SUM(CASE WHEN cm.cost > 0 THEN cm.revenue / cm.cost ELSE 0 END) as total_roas
      FROM marketing_accounts ma
      JOIN campaigns c ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON cm.campaign_id = c.id
        AND cm.date BETWEEN ? AND ?
      WHERE ma.user_id = ?
      GROUP BY ma.platform
      ORDER BY SUM(cm.cost) DESC
    `;
    
    const result = await client.query(query, [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      userId,
    ]);
    
    const platforms = result.rows.map(row => ({
      platform: row.platform,
      campaign_count: Number(row.campaign_count || 0),
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      conversions: Number(row.conversions || 0),
      cost: Number(row.cost || 0),
      revenue: Number(row.revenue || 0),
      ctr: Number(row.avg_ctr || 0),
      cpc: Number(row.avg_cpc || 0),
      roas: Number(row.total_roas || 0),
    }));
    
    // 전체 합계
    const totals = platforms.reduce((acc, platform) => ({
      impressions: acc.impressions + platform.impressions,
      clicks: acc.clicks + platform.clicks,
      conversions: acc.conversions + platform.conversions,
      cost: acc.cost + platform.cost,
      revenue: acc.revenue + platform.revenue,
    }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 });
    
    // 플랫폼별 점유율 계산
    const platformsWithShare = platforms.map(platform => ({
      ...platform,
      cost_share: totals.cost > 0 ? (platform.cost / totals.cost) * 100 : 0,
      revenue_share: totals.revenue > 0 ? (platform.revenue / totals.revenue) * 100 : 0,
      conversion_share: totals.conversions > 0 ? (platform.conversions / totals.conversions) * 100 : 0,
    }));
    
    res.json({
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      platforms: platformsWithShare,
      totals,
    });
  } catch (error) {
    console.error('Get comparison error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '플랫폼 비교 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// AI 추천
export const getRecommendations = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    
    // 최근 30일 데이터 기반 분석
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 캠페인별 성과 분석
    const campaignQuery = `
      SELECT 
        c.id,
        c.campaign_name,
        c.platform,
        c.status,
        c.daily_budget,
        SUM(cm.impressions) as impressions,
        SUM(cm.clicks) as clicks,
        SUM(cm.conversions) as conversions,
        SUM(cm.cost) as cost,
        SUM(cm.revenue) as revenue,
        AVG(CASE WHEN cm.impressions > 0 THEN (cm.clicks / cm.impressions) * 100 ELSE 0 END) as avg_ctr,
        CASE WHEN SUM(cm.cost) > 0 THEN SUM(cm.revenue) / SUM(cm.cost) ELSE 0 END as roas
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON cm.campaign_id = c.id
        AND cm.date BETWEEN ? AND ?
      WHERE ma.user_id = ?
      GROUP BY c.id, c.campaign_name, c.platform, c.status, c.daily_budget
      HAVING SUM(cm.cost) > 0
      ORDER BY roas DESC
    `;
    
    const campaigns = await client.query(campaignQuery, [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      userId,
    ]);
    
    const recommendations: any[] = [];
    
    // 1. 고성과 캠페인 예산 증액 추천
    const topPerformers = campaigns.rows
      .filter(c => Number(c.roas) > 3 && c.status === 'active')
      .slice(0, 3)
      .map(c => ({
        type: 'budget_increase',
        priority: 'high',
        campaign_id: c.id,
        campaign_name: c.campaign_name,
        platform: c.platform,
        current_budget: Number(c.daily_budget || 0),
        suggested_budget: Number(c.daily_budget || 0) * 1.5,
        reason: `높은 ROAS (${Number(c.roas).toFixed(2)}x)로 예산 증액 시 수익 증대 가능`,
        expected_impact: `일 매출 ${Math.round(Number(c.daily_budget || 0) * 0.5 * Number(c.roas))}원 증가 예상`,
      }));
    
    recommendations.push(...topPerformers);
    
    // 2. 저성과 캠페인 개선 또는 중지 추천
    const poorPerformers = campaigns.rows
      .filter(c => Number(c.roas) < 1 && Number(c.cost) > 10000 && c.status === 'active')
      .slice(0, 3)
      .map(c => ({
        type: 'budget_decrease',
        priority: 'medium',
        campaign_id: c.id,
        campaign_name: c.campaign_name,
        platform: c.platform,
        current_budget: Number(c.daily_budget || 0),
        suggested_budget: Number(c.daily_budget || 0) * 0.5,
        reason: `낮은 ROAS (${Number(c.roas).toFixed(2)}x)로 예산 최적화 필요`,
        expected_impact: `일 손실 ${Math.round(Number(c.cost) / 30 * 0.5)}원 감소`,
      }));
    
    recommendations.push(...poorPerformers);
    
    // 3. CTR 개선 필요 캠페인
    const lowCTR = campaigns.rows
      .filter(c => Number(c.avg_ctr) < 1 && Number(c.impressions) > 1000 && c.status === 'active')
      .slice(0, 2)
      .map(c => ({
        type: 'creative_optimization',
        priority: 'medium',
        campaign_id: c.id,
        campaign_name: c.campaign_name,
        platform: c.platform,
        current_ctr: Number(c.avg_ctr).toFixed(2),
        reason: `낮은 CTR (${Number(c.avg_ctr).toFixed(2)}%)로 광고 소재 개선 필요`,
        expected_impact: 'CTR 2% 개선 시 월 클릭수 증가 예상',
      }));
    
    recommendations.push(...lowCTR);
    
    // 4. 플랫폼 다각화 추천
    const platformQuery = `
      SELECT DISTINCT platform
      FROM marketing_accounts
      WHERE user_id = ?
    `;
    
    const activePlatforms = await client.query(platformQuery, [userId]);
    const platformCount = activePlatforms.rows.length;
    
    if (platformCount < 3) {
      recommendations.push({
        type: 'platform_diversification',
        priority: 'low',
        reason: '현재 사용 중인 플랫폼이 제한적입니다. 다양한 플랫폼 활용으로 리스크 분산 권장',
        suggested_platforms: ['META', 'GOOGLE', 'NAVER'].filter(
          p => !activePlatforms.rows.some(ap => ap.platform === p)
        ),
        expected_impact: '추가 플랫폼 활용으로 도달 범위 30% 확대 가능',
      });
    }
    
    res.json({
      generated_at: new Date().toISOString(),
      analysis_period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      recommendations: recommendations.sort((a, b) => {
        const priority: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (priority[b.priority] || 0) - (priority[a.priority] || 0);
      }),
      summary: {
        total_campaigns: campaigns.rows.length,
        high_performers: topPerformers.length,
        needs_optimization: poorPerformers.length + lowCTR.length,
      },
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'AI 추천 생성 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};
