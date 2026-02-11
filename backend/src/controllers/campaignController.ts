import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';

// 캠페인 목록 조회
export const getCampaigns = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { platform, status, page = 1, limit = 10 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT 
        c.*,
        ma.account_name,
        ma.platform,
        (SELECT COUNT(*) FROM campaign_metrics WHERE campaign_id = c.id) as metrics_count
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;
    
    if (platform) {
      query += ` AND c.platform = $${paramIndex}`;
      params.push(String(platform));
      paramIndex++;
    }
    
    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(String(status));
      paramIndex++;
    }
    
    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);
    
    const result = await client.query(query, params);
    
    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) 
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = $1
      ${platform ? ` AND c.platform = $2` : ''}
      ${status ? ` AND c.status = $${platform ? 3 : 2}` : ''}
    `;
    
    const countParams: any[] = [userId];
    if (platform) countParams.push(String(platform));
    if (status) countParams.push(String(status));
    
    const countResult = await client.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      campaigns: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '캠페인 목록 조회 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 캠페인 상세 조회
export const getCampaignById = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    
    const result = await client.query(
      `SELECT 
        c.*,
        ma.account_name,
        ma.platform,
        ma.account_id as external_account_id
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE c.id = $1 AND ma.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'CAMPAIGN_NOT_FOUND',
        message: '캠페인을 찾을 수 없습니다.',
      });
    }
    
    // 최신 메트릭 조회
    const metricsResult = await client.query(
      `SELECT * FROM campaign_metrics 
       WHERE campaign_id = $1 
       ORDER BY date DESC 
       LIMIT 1`,
      [id]
    );
    
    res.json({
      campaign: result.rows[0],
      latest_metrics: metricsResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '캠페인 조회 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 캠페인 생성
export const createCampaign = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const {
      marketing_account_id,
      platform,
      campaign_name,
      campaign_id: external_campaign_id,
      objective,
      daily_budget,
      total_budget,
      start_date,
      end_date,
      status,
    } = req.body;
    
    // 입력 검증
    if (!marketing_account_id || !platform || !campaign_name || !external_campaign_id) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '필수 항목을 입력해주세요.',
      });
    }
    
    // 마케팅 계정 권한 확인
    const accountCheck = await client.query(
      'SELECT id FROM marketing_accounts WHERE id = $1 AND user_id = $2',
      [marketing_account_id, userId]
    );
    
    if (accountCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: '해당 마케팅 계정에 대한 권한이 없습니다.',
      });
    }
    
    const result = await client.query(
      `INSERT INTO campaigns (
        marketing_account_id, platform, campaign_name, campaign_id, 
        objective, daily_budget, total_budget, start_date, end_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        marketing_account_id,
        platform,
        campaign_name,
        external_campaign_id,
        objective,
        daily_budget || null,
        total_budget || null,
        start_date || null,
        end_date || null,
        status || 'active',
      ]
    );
    
    res.status(201).json({
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '캠페인 생성 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 캠페인 수정
export const updateCampaign = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    const {
      campaign_name,
      objective,
      daily_budget,
      total_budget,
      start_date,
      end_date,
      status,
    } = req.body;
    
    // 권한 확인
    const authCheck = await client.query(
      `SELECT c.id FROM campaigns c
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE c.id = $1 AND ma.user_id = $2`,
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'CAMPAIGN_NOT_FOUND',
        message: '캠페인을 찾을 수 없습니다.',
      });
    }
    
    const result = await client.query(
      `UPDATE campaigns SET
        campaign_name = COALESCE($1, campaign_name),
        objective = COALESCE($2, objective),
        daily_budget = COALESCE($3, daily_budget),
        total_budget = COALESCE($4, total_budget),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        status = COALESCE($7, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [campaign_name, objective, daily_budget, total_budget, start_date, end_date, status, id]
    );
    
    res.json({
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '캠페인 수정 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 캠페인 삭제
export const deleteCampaign = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    
    // 권한 확인
    const authCheck = await client.query(
      `SELECT c.id FROM campaigns c
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE c.id = $1 AND ma.user_id = $2`,
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'CAMPAIGN_NOT_FOUND',
        message: '캠페인을 찾을 수 없습니다.',
      });
    }
    
    await client.query('DELETE FROM campaigns WHERE id = $1', [id]);
    
    res.json({
      message: '캠페인이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '캠페인 삭제 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 캠페인 메트릭 조회
export const getCampaignMetrics = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    const { start_date, end_date, limit = 30 } = req.query;
    
    // 권한 확인
    const authCheck = await client.query(
      `SELECT c.id FROM campaigns c
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE c.id = $1 AND ma.user_id = $2`,
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'CAMPAIGN_NOT_FOUND',
        message: '캠페인을 찾을 수 없습니다.',
      });
    }
    
    let query = `
      SELECT * FROM campaign_metrics
      WHERE campaign_id = $1
    `;
    const params: any[] = [id];
    let paramIndex = 2;
    
    if (start_date) {
      query += ` AND date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += ` ORDER BY date DESC LIMIT $${paramIndex}`;
    params.push(Number(limit));
    
    const result = await client.query(query, params);
    
    res.json({
      metrics: result.rows,
    });
  } catch (error) {
    console.error('Get campaign metrics error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '캠페인 메트릭 조회 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};
