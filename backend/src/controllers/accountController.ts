import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';

// 마케팅 계정 목록 조회
export const getAccounts = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { platform } = req.query;
    
    let query = `
      SELECT 
        ma.*,
        (SELECT COUNT(*) FROM campaigns WHERE marketing_account_id = ma.id) as campaign_count
      FROM marketing_accounts ma
      WHERE ma.user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (platform) {
      query += ` AND ma.platform = $2`;
      params.push(platform);
    }
    
    query += ` ORDER BY ma.created_at DESC`;
    
    const result = await client.query(query, params);
    
    res.json({
      accounts: result.rows,
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '계정 목록 조회 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 마케팅 계정 상세 조회
export const getAccountById = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    
    const result = await client.query(
      `SELECT ma.*
      FROM marketing_accounts ma
      WHERE ma.id = $1 AND ma.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: '계정을 찾을 수 없습니다.',
      });
    }
    
    res.json({
      account: result.rows[0],
    });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '계정 조회 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 마케팅 계정 연결
export const createAccount = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const {
      platform,
      account_name,
      account_id,
      access_token,
      refresh_token,
      token_expires_at,
    } = req.body;
    
    // 입력 검증
    if (!platform || !account_name || !account_id) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '필수 항목을 입력해주세요.',
      });
    }
    
    // 중복 확인
    const existingAccount = await client.query(
      'SELECT id FROM marketing_accounts WHERE user_id = $1 AND platform = $2 AND account_id = $3',
      [userId, platform, account_id]
    );
    
    if (existingAccount.rows.length > 0) {
      return res.status(409).json({
        error: 'ACCOUNT_EXISTS',
        message: '이미 연결된 계정입니다.',
      });
    }
    
    const result = await client.query(
      `INSERT INTO marketing_accounts (
        user_id, platform, account_name, account_id,
        access_token, refresh_token, token_expires_at, is_connected
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, user_id, platform, account_name, account_id, is_connected, created_at`,
      [
        userId,
        platform,
        account_name,
        account_id,
        access_token,
        refresh_token,
        token_expires_at,
      ]
    );
    
    res.status(201).json({
      account: result.rows[0],
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '계정 연결 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 마케팅 계정 수정
export const updateAccount = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    const {
      account_name,
      access_token,
      refresh_token,
      token_expires_at,
      is_connected,
    } = req.body;
    
    // 권한 확인
    const authCheck = await client.query(
      'SELECT id FROM marketing_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: '계정을 찾을 수 없습니다.',
      });
    }
    
    const result = await client.query(
      `UPDATE marketing_accounts SET
        account_name = COALESCE($1, account_name),
        access_token = COALESCE($2, access_token),
        refresh_token = COALESCE($3, refresh_token),
        token_expires_at = COALESCE($4, token_expires_at),
        is_connected = COALESCE($5, is_connected),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, user_id, platform, account_name, account_id, is_connected, created_at, updated_at`,
      [account_name, access_token, refresh_token, token_expires_at, is_connected, id]
    );
    
    res.json({
      account: result.rows[0],
    });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '계정 수정 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 마케팅 계정 삭제
export const deleteAccount = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    
    // 권한 확인
    const authCheck = await client.query(
      'SELECT id FROM marketing_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: '계정을 찾을 수 없습니다.',
      });
    }
    
    // 연결된 캠페인이 있는지 확인
    const campaignCheck = await client.query(
      'SELECT COUNT(*) FROM campaigns WHERE marketing_account_id = $1',
      [id]
    );
    
    if (parseInt(campaignCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'ACCOUNT_HAS_CAMPAIGNS',
        message: '연결된 캠페인이 있는 계정은 삭제할 수 없습니다. 먼저 캠페인을 삭제해주세요.',
      });
    }
    
    await client.query('DELETE FROM marketing_accounts WHERE id = $1', [id]);
    
    res.json({
      message: '계정이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '계정 삭제 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};
