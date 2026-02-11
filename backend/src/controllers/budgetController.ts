import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';

/**
 * 예산 요약 조회
 * GET /api/v1/budget/summary
 */
export const getBudgetSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const queryParams: any[] = [userId];

    if (startDate && endDate) {
      dateFilter = `AND cm.date >= $2 AND cm.date <= $3`;
      queryParams.push(startDate, endDate);
    }

    // 전체 예산 및 지출 현황
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(c.daily_budget), 0) as total_daily_budget,
        COALESCE(SUM(c.total_budget), 0) as total_budget,
        COALESCE(SUM(cm.cost), 0) as total_spent,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_campaigns
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = $1
        ${dateFilter}
    `;

    const summaryResult = await pool.query(summaryQuery, queryParams);
    const summary = summaryResult.rows[0];

    const totalBudget = parseFloat(summary.total_budget) || 0;
    const totalSpent = parseFloat(summary.total_spent) || 0;
    const remaining = totalBudget - totalSpent;
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    res.json({
      summary: {
        totalBudget,
        totalSpent,
        remaining,
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
        dailyBudget: parseFloat(summary.total_daily_budget) || 0,
        activeCampaigns: parseInt(summary.active_campaigns),
      },
    });
  } catch (error) {
    console.error('예산 요약 조회 오류:', error);
    res.status(500).json({
      error: '예산 요약을 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
};

/**
 * 플랫폼별 예산 조회
 * GET /api/v1/budget/by-platform
 */
export const getBudgetByPlatform = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const queryParams: any[] = [userId];

    if (startDate && endDate) {
      dateFilter = `AND cm.date >= $2 AND cm.date <= $3`;
      queryParams.push(startDate, endDate);
    }

    const query = `
      SELECT 
        c.platform,
        COUNT(DISTINCT c.id) as campaign_count,
        COALESCE(SUM(c.daily_budget), 0) as daily_budget,
        COALESCE(SUM(c.total_budget), 0) as total_budget,
        COALESCE(SUM(cm.cost), 0) as spent,
        COALESCE(SUM(cm.revenue), 0) as revenue
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = $1
        AND c.status = 'active'
        ${dateFilter}
      GROUP BY c.platform
      ORDER BY spent DESC
    `;

    const result = await pool.query(query, queryParams);

    const platforms = result.rows.map((row) => ({
      platform: row.platform,
      campaignCount: parseInt(row.campaign_count),
      dailyBudget: parseFloat(row.daily_budget),
      totalBudget: parseFloat(row.total_budget),
      spent: parseFloat(row.spent),
      revenue: parseFloat(row.revenue),
      remaining: parseFloat(row.total_budget) - parseFloat(row.spent),
      roas: parseFloat(row.spent) > 0 ? parseFloat(row.revenue) / parseFloat(row.spent) : 0,
    }));

    res.json({ platforms });
  } catch (error) {
    console.error('플랫폼별 예산 조회 오류:', error);
    res.status(500).json({
      error: '플랫폼별 예산을 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
};

/**
 * 캠페인별 예산 상세 조회
 * GET /api/v1/budget/by-campaign
 */
export const getBudgetByCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { platform, startDate, endDate } = req.query;

    let platformFilter = '';
    let dateFilter = '';
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (platform) {
      platformFilter = `AND c.platform = $${paramIndex}`;
      queryParams.push(platform);
      paramIndex++;
    }

    if (startDate && endDate) {
      dateFilter = `AND cm.date >= $${paramIndex} AND cm.date <= $${paramIndex + 1}`;
      queryParams.push(startDate, endDate);
    }

    const query = `
      SELECT 
        c.id,
        c.campaign_name,
        c.platform,
        c.status,
        c.daily_budget,
        c.total_budget,
        COALESCE(SUM(cm.cost), 0) as spent,
        COALESCE(SUM(cm.revenue), 0) as revenue,
        COALESCE(SUM(cm.impressions), 0) as impressions,
        COALESCE(SUM(cm.clicks), 0) as clicks
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = $1
        ${platformFilter}
        ${dateFilter}
      GROUP BY c.id, c.campaign_name, c.platform, c.status, c.daily_budget, c.total_budget
      ORDER BY spent DESC
    `;

    const result = await pool.query(query, queryParams);

    const campaigns = result.rows.map((row) => ({
      id: row.id,
      name: row.campaign_name,
      platform: row.platform,
      status: row.status,
      dailyBudget: parseFloat(row.daily_budget) || 0,
      totalBudget: parseFloat(row.total_budget) || 0,
      spent: parseFloat(row.spent),
      revenue: parseFloat(row.revenue),
      remaining: (parseFloat(row.total_budget) || 0) - parseFloat(row.spent),
      utilizationRate:
        parseFloat(row.total_budget) > 0
          ? (parseFloat(row.spent) / parseFloat(row.total_budget)) * 100
          : 0,
      roas: parseFloat(row.spent) > 0 ? parseFloat(row.revenue) / parseFloat(row.spent) : 0,
      impressions: parseInt(row.impressions),
      clicks: parseInt(row.clicks),
    }));

    res.json({ campaigns });
  } catch (error) {
    console.error('캠페인별 예산 조회 오류:', error);
    res.status(500).json({
      error: '캠페인별 예산을 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
};

/**
 * 캠페인 예산 수정
 * PUT /api/v1/budget/campaign/:id
 */
export const updateCampaignBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { dailyBudget, totalBudget } = req.body;

    // 권한 확인
    const authCheck = await pool.query(
      `SELECT c.id FROM campaigns c
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE c.id = $1 AND ma.user_id = $2`,
      [id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: '캠페인을 찾을 수 없습니다.',
      });
    }

    // 예산 업데이트
    const updateQuery = `
      UPDATE campaigns
      SET 
        daily_budget = COALESCE($1, daily_budget),
        total_budget = COALESCE($2, total_budget),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [dailyBudget, totalBudget, id]);

    res.json({
      success: true,
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('예산 수정 오류:', error);
    res.status(500).json({
      error: '예산을 수정하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
    });
  }
};
