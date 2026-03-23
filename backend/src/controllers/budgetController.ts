import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ERROR_CODES, createErrorResponse } from '../constants/errorCodes';

/**
 * 예산 요약 조회
 * GET /api/v1/budget/summary
 */
export const getBudgetSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    // 1. budget_settings 테이블에서 전체 목표 예산 정보를 가져옵니다.
    const settingsResult = await pool.query(
      'SELECT total_budget, daily_budget FROM budget_settings WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const userSettings = settingsResult.rows[0] || { total_budget: 0, daily_budget: 0 };

    // 2. 실제 지출 금액(spent)은 중복 방지를 위해 별도로 합산합니다.
    let spentQuery = `
      SELECT COALESCE(SUM(cm.cost), 0) as total_spent
      FROM campaign_metrics cm
      JOIN campaigns c ON cm.campaign_id = c.id
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
    `;
    const spentParams: any[] = [userId];
    if (startDate && endDate) {
      spentQuery += ` AND cm.metric_date >= ? AND cm.metric_date <= ?`;
      spentParams.push(startDate, endDate);
    }
    const spentResult = await pool.query(spentQuery, spentParams);

    // 3. 활성 캠페인 수 조회
    const activeResult = await pool.query(
      `SELECT COUNT(*) as count FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ? AND c.status = 'active'`,
      [userId]
    );

    const totalBudget = parseFloat(userSettings.total_budget);
    const totalSpent = parseFloat(spentResult.rows[0].total_spent);

    res.json({
      summary: {
        totalBudget: totalBudget, // 👈 budget_settings 테이블 값을 사용하여 3.1억 버그 해결!
        totalSpent: totalSpent,
        remaining: totalBudget - totalSpent,
        utilizationRate: totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(2)) : 0,
        dailyBudget: parseFloat(userSettings.daily_budget) || 0,
        activeCampaigns: parseInt(activeResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Budget Summary Error:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.BUDGET.SERVER_ERROR));
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
      dateFilter = `AND cm.metric_date >= ? AND cm.metric_date <= ?`;
      queryParams.push(startDate, endDate);
    }

    const query = `
      SELECT 
        ma.channel_code AS platform,
        COUNT(DISTINCT c.id) as campaign_count,
        COALESCE(SUM(c.daily_budget), 0) as daily_budget,
        COALESCE(SUM(c.total_budget), 0) as total_budget,
        COALESCE(SUM(cm.cost), 0) as spent,
        COALESCE(SUM(cm.revenue), 0) as revenue
      FROM campaigns c
      LEFT JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = ?
        AND c.status = 'active'
        ${dateFilter}
      GROUP BY ma.channel_code
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
    res.status(500).json(createErrorResponse(ERROR_CODES.BUDGET.SERVER_ERROR, error instanceof Error ? error.message : undefined));
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

    if (platform) {
      platformFilter = `AND ma.channel_code = ?`;
      queryParams.push(platform);
    }

    if (startDate && endDate) {
      dateFilter = `AND cm.metric_date >= ? AND cm.metric_date <= ?`;
      queryParams.push(startDate, endDate);
    }

    const query = `
      SELECT 
        c.id,
        c.campaign_name,
        ma.channel_code AS platform,
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
      WHERE ma.user_id = ?
        ${platformFilter}
        ${dateFilter}
      GROUP BY c.id, c.campaign_name, ma.channel_code, c.status, c.daily_budget, c.total_budget
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
    res.status(500).json(createErrorResponse(ERROR_CODES.BUDGET.SERVER_ERROR, error instanceof Error ? error.message : undefined));
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
       WHERE c.id = ? AND ma.user_id = ?`,
      [id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(404).json(createErrorResponse(ERROR_CODES.CAMPAIGN.NOT_FOUND));
    }

    // 예산 업데이트
    await pool.query(
      `UPDATE campaigns
       SET 
        daily_budget = COALESCE(?, daily_budget),
        total_budget = COALESCE(?, total_budget)
       WHERE id = ?`,
      [dailyBudget, totalBudget, id]
    );

    const result = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);

    res.json({
      success: true,
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('예산 수정 오류:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.BUDGET.SERVER_ERROR, error instanceof Error ? error.message : undefined));
  }
};

/**
 * 사용자별 전체 예산 및 일일 예산 설정 저장/수정
 * POST /api/v1/budget/settings
 */
export const updateTotalBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    // 프론트엔드에서 보낼 객체 구조에 맞춰 두 값을 모두 받습니다.
    const { totalBudget, dailyBudget } = req.body;

    // 입력값을 숫자로 강제 변환하여 데이터 형식을 보장합니다.
    const numTotalBudget = parseFloat(totalBudget) || 0;
    const numDailyBudget = parseFloat(dailyBudget) || 0;

    // MySQL Workbench에서 설정한 user_id UNIQUE 제약 조건을 활용합니다.
    // 중복된 user_id가 들어오면 UPDATE 문이 실행됩니다.
    const query = `
      INSERT INTO budget_settings (user_id, total_budget, daily_budget)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        total_budget = VALUES(total_budget),
        daily_budget = VALUES(daily_budget)
    `;
    
    await pool.query(query, [userId, numTotalBudget, numDailyBudget]);

    res.json({ 
      success: true, 
      message: '예산 설정이 성공적으로 저장 및 업데이트되었습니다.' 
    });
  } catch (error) {
    console.error('Update Total Budget Error:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.BUDGET.SERVER_ERROR, error instanceof Error ? error.message : undefined));
  }
};