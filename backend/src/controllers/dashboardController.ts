import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';

/**
 * 대시보드 요약 통계 조회
 * GET /api/v1/dashboard/summary
 */
export const getSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    // 날짜 필터 조건 추가
    let dateFilter = '';
    const queryParams: any[] = [userId];
    
    if (startDate && endDate) {
      dateFilter = `AND cm.metric_date >= ? AND cm.metric_date <= ?`;
      queryParams.push(startDate, endDate);
    }

    // 전체 캠페인 메트릭 집계
    const metricsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT ma.id) as total_accounts,
        COALESCE(SUM(cm.impressions), 0) as total_impressions,
        COALESCE(SUM(cm.clicks), 0) as total_clicks,
        COALESCE(SUM(cm.conversions), 0) as total_conversions,
        COALESCE(SUM(cm.cost), 0) as total_cost,
        COALESCE(SUM(cm.revenue), 0) as total_revenue,
        CASE 
          WHEN SUM(cm.impressions) > 0 
          THEN ROUND(SUM(cm.clicks) / SUM(cm.impressions) * 100, 2)
          ELSE 0 
        END as avg_ctr,
        CASE 
          WHEN SUM(cm.clicks) > 0 
          THEN ROUND(SUM(cm.cost) / SUM(cm.clicks), 2)
          ELSE 0 
        END as avg_cpc,
        CASE 
          WHEN SUM(cm.cost) > 0 
          THEN ROUND(SUM(cm.revenue) / SUM(cm.cost), 2)
          ELSE 0 
        END as avg_roas
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = ?
        AND c.status = 'active'
        ${dateFilter}
    `;

    const metricsResult = await pool.query(metricsQuery, queryParams);
    const metrics = metricsResult.rows[0];

    // 활성 캠페인 수 (status별)
    const statusQuery = `
      SELECT 
        c.status,
        COUNT(*) as count
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
      GROUP BY c.status
    `;

    const statusResult = await pool.query(statusQuery, [userId]);

    // 예산 현황
    const budgetQuery = `
      SELECT 
        COALESCE(SUM(c.daily_budget), 0) as total_daily_budget,
        COALESCE(SUM(c.total_budget), 0) as total_budget,
        COALESCE(SUM(cm.cost), 0) as total_spent
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = ?
        AND c.status = 'active'
        ${dateFilter}
    `;

    const budgetResult = await pool.query(budgetQuery, queryParams);
    const budget = budgetResult.rows[0];

    res.json({
      period: startDate && endDate ? { startDate, endDate } : null,
      metrics: {
        campaigns: parseInt(metrics.total_campaigns),
        accounts: parseInt(metrics.total_accounts),
        impressions: parseInt(metrics.total_impressions),
        clicks: parseInt(metrics.total_clicks),
        conversions: parseInt(metrics.total_conversions),
        cost: parseFloat(metrics.total_cost),
        revenue: parseFloat(metrics.total_revenue),
        ctr: parseFloat(metrics.avg_ctr),
        cpc: parseFloat(metrics.avg_cpc),
        roas: parseFloat(metrics.avg_roas)
      },
      status: statusResult.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      budget: {
        daily: parseFloat(budget.total_daily_budget),
        total: parseFloat(budget.total_budget),
        spent: parseFloat(budget.total_spent),
        remaining: parseFloat(budget.total_budget) - parseFloat(budget.total_spent),
        utilizationRate: budget.total_budget > 0 
          ? parseFloat((parseFloat(budget.total_spent) / parseFloat(budget.total_budget) * 100).toFixed(2))
          : 0
      }
    });
  } catch (error) {
    console.error('대시보드 요약 조회 오류:', error);
    res.status(500).json({ 
      error: '대시보드 요약을 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * 채널별 성과 조회
 * GET /api/v1/dashboard/channel-performance
 */
export const getChannelPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params: any[] = [userId];

    if (startDate && endDate) {
      dateFilter = `AND cm.metric_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        ma.channel_code AS platform,
        COUNT(DISTINCT c.id) as campaign_count,
        COALESCE(SUM(cm.impressions), 0) as total_impressions,
        COALESCE(SUM(cm.clicks), 0) as total_clicks,
        COALESCE(SUM(cm.conversions), 0) as total_conversions,
        COALESCE(SUM(cm.cost), 0) as total_cost,
        COALESCE(SUM(cm.revenue), 0) as total_revenue,
        CASE 
          WHEN SUM(cm.impressions) > 0 
          THEN ROUND(SUM(cm.clicks) / SUM(cm.impressions) * 100, 2)
          ELSE 0 
        END as avg_ctr,
        CASE 
          WHEN SUM(cm.clicks) > 0 
          THEN ROUND(SUM(cm.cost) / SUM(cm.clicks), 2)
          ELSE 0 
        END as avg_cpc,
        CASE 
          WHEN SUM(cm.cost) > 0 
          THEN ROUND(SUM(cm.revenue) / SUM(cm.cost), 2)
          ELSE 0 
        END as avg_roas
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = ?
        ${dateFilter}
      GROUP BY ma.channel_code
      ORDER BY total_cost DESC
    `;

    const result = await pool.query(query, params);

    const performance = result.rows.map(row => ({
      platform: row.platform,
      campaigns: parseInt(row.campaign_count),
      metrics: {
        impressions: parseInt(row.total_impressions),
        clicks: parseInt(row.total_clicks),
        conversions: parseInt(row.total_conversions),
        cost: parseFloat(row.total_cost),
        revenue: parseFloat(row.total_revenue),
        ctr: parseFloat(row.avg_ctr),
        cpc: parseFloat(row.avg_cpc),
        roas: parseFloat(row.avg_roas)
      }
    }));

    res.json({
      performance,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    console.error('채널별 성과 조회 오류:', error);
    res.status(500).json({ 
      error: '채널별 성과를 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * 최근 인사이트 조회
 * GET /api/v1/dashboard/insights
 */
export const getInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 10, priority } = req.query;

    let filters = '';
    const params: any[] = [userId, limit];

    if (priority) {
      filters += ` AND i.priority = ?`;
      params.push(priority);
    }

    const query = `
      SELECT 
        i.id,
        i.type,
        i.title,
        i.content AS description,
        i.priority,
        i.is_read,
        i.is_applied,
        i.created_at
      FROM insights i
      WHERE i.user_id = ?
        ${filters}
      ORDER BY 
        i.priority ASC,
        i.created_at DESC
      LIMIT ?
    `;

    const result = await pool.query(query, params);

    const insights = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      priority: row.priority,
      isRead: row.is_read,
      isApplied: row.is_applied,
      campaign: null,
      createdAt: row.created_at
    }));

    res.json({
      insights,
      total: insights.length
    });
  } catch (error) {
    console.error('인사이트 조회 오류:', error);
    res.status(500).json({ 
      error: '인사이트를 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * 예산 현황 조회
 * GET /api/v1/dashboard/budget
 */
export const getBudgetStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { groupBy = 'platform' } = req.query;

    if (groupBy === 'platform') {
      const query = `
        SELECT 
          ma.channel_code AS platform,
          COUNT(DISTINCT c.id) as campaign_count,
          COALESCE(SUM(c.daily_budget), 0) as total_daily_budget,
          COALESCE(SUM(c.total_budget), 0) as total_budget,
          COALESCE(SUM(cm.cost), 0) as total_spent,
          COALESCE(SUM(c.total_budget) - SUM(cm.cost), 0) as remaining_budget
        FROM campaigns c
        LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
        LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
        WHERE ma.user_id = ?
          AND c.status = 'active'
        GROUP BY ma.channel_code
        ORDER BY total_budget DESC
      `;

      const result = await pool.query(query, [userId]);

      const budgetByPlatform = result.rows.map(row => ({
        platform: row.platform,
        campaigns: parseInt(row.campaign_count),
        dailyBudget: parseFloat(row.total_daily_budget),
        totalBudget: parseFloat(row.total_budget),
        spent: parseFloat(row.total_spent),
        remaining: parseFloat(row.remaining_budget),
        utilizationRate: row.total_budget > 0 
          ? parseFloat((parseFloat(row.total_spent) / parseFloat(row.total_budget) * 100).toFixed(2))
          : 0,
        status: parseFloat(row.total_spent) / parseFloat(row.total_budget) > 0.9 ? 'warning' :
                parseFloat(row.total_spent) / parseFloat(row.total_budget) > 0.7 ? 'caution' : 'normal'
      }));

      res.json({
        groupBy: 'platform',
        budgets: budgetByPlatform
      });
    } else {
      const query = `
        SELECT 
          c.id,
          c.campaign_name,
          ma.channel_code AS platform,
          c.daily_budget,
          c.total_budget,
          COALESCE(SUM(cm.cost), 0) as total_spent
        FROM campaigns c
        LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
        LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
        WHERE ma.user_id = ?
          AND c.status = 'active'
        GROUP BY c.id, c.campaign_name, ma.channel_code, c.daily_budget, c.total_budget
        ORDER BY c.total_budget DESC
        LIMIT 20
      `;

      const result = await pool.query(query, [userId]);

      const budgetByCampaign = result.rows.map(row => ({
        id: row.id,
        name: row.campaign_name,
        platform: row.platform,
        dailyBudget: parseFloat(row.daily_budget),
        totalBudget: parseFloat(row.total_budget),
        spent: parseFloat(row.total_spent),
        remaining: parseFloat(row.total_budget) - parseFloat(row.total_spent),
        utilizationRate: row.total_budget > 0 
          ? parseFloat((parseFloat(row.total_spent) / parseFloat(row.total_budget) * 100).toFixed(2))
          : 0,
        status: parseFloat(row.total_spent) / parseFloat(row.total_budget) > 0.9 ? 'warning' :
                parseFloat(row.total_spent) / parseFloat(row.total_budget) > 0.7 ? 'caution' : 'normal'
      }));

      res.json({
        groupBy: 'campaign',
        budgets: budgetByCampaign
      });
    }
  } catch (error) {
    console.error('예산 현황 조회 오류:', error);
    res.status(500).json({ 
      error: '예산 현황을 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};
