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
        ma.id, ma.user_id, ma.channel_code AS platform,
        ma.external_account_id AS account_id, ma.account_name,
        ma.auth_token AS access_token, ma.refresh_token,
        ma.connection_status AS is_connected,
        (SELECT COUNT(*) FROM campaigns WHERE marketing_account_id = ma.id) as campaign_count
      FROM marketing_accounts ma
      WHERE ma.user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (platform) {
      query += ` AND ma.channel_code = ?`;
      params.push(platform);
    }
    
    query += ` ORDER BY ma.id DESC`;
    
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
      `SELECT ma.id, ma.user_id, ma.channel_code AS platform,
        ma.external_account_id AS account_id, ma.account_name,
        ma.auth_token AS access_token, ma.refresh_token,
        ma.connection_status AS is_connected
      FROM marketing_accounts ma
      WHERE ma.id = ? AND ma.user_id = ?`,
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
      'SELECT id FROM marketing_accounts WHERE user_id = ? AND channel_code = ? AND external_account_id = ?',
      [userId, platform, account_id]
    );
    
    if (existingAccount.rows.length > 0) {
      return res.status(409).json({
        error: 'ACCOUNT_EXISTS',
        message: '이미 연결된 계정입니다.',
      });
    }
    
    const insertResult = await client.query(
      `INSERT INTO marketing_accounts (
        user_id, channel_code, account_name, external_account_id,
        auth_token, refresh_token, connection_status
      )
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [userId, platform, account_name, account_id, access_token, refresh_token]
    );
    
    const result = await client.query(
      `SELECT id, user_id, channel_code AS platform, account_name,
        external_account_id AS account_id, connection_status AS is_connected
      FROM marketing_accounts WHERE id = ?`,
      [insertResult.insertId]
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
      is_connected,
    } = req.body;
    
    // 권한 확인
    const authCheck = await client.query(
      'SELECT id FROM marketing_accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: '계정을 찾을 수 없습니다.',
      });
    }
    
    await client.query(
      `UPDATE marketing_accounts SET
        account_name = COALESCE(?, account_name),
        auth_token = COALESCE(?, auth_token),
        refresh_token = COALESCE(?, refresh_token),
        connection_status = COALESCE(?, connection_status)
      WHERE id = ?`,
      [account_name, access_token, refresh_token, is_connected, id]
    );
    
    const result = await client.query(
      `SELECT id, user_id, channel_code AS platform, account_name,
        external_account_id AS account_id, connection_status AS is_connected
      FROM marketing_accounts WHERE id = ?`,
      [id]
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
      'SELECT id FROM marketing_accounts WHERE id = ? AND user_id = ?',
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
      'SELECT COUNT(*) as count FROM campaigns WHERE marketing_account_id = ?',
      [id]
    );
    
    if (parseInt(campaignCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'ACCOUNT_HAS_CAMPAIGNS',
        message: '연결된 캠페인이 있는 계정은 삭제할 수 없습니다. 먼저 캠페인을 삭제해주세요.',
      });
    }
    
    await client.query('DELETE FROM marketing_accounts WHERE id = ?', [id]);
    
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
