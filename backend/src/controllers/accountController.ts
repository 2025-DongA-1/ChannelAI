import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { encrypt, decrypt } from '../utils/crypto';
import { ERROR_CODES, createErrorResponse } from '../constants/errorCodes';

/**
 * 마케팅 계정 목록 조회
 * GET /api/v1/accounts
 */
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { platform } = req.query;
    
    // DB 스키마 동기화에 따라 auth_token -> access_token으로 변경됨
    let query = `
      SELECT 
        ma.id, ma.user_id, ma.channel_code AS platform,
        ma.external_account_id AS account_id, ma.account_name,
        ma.access_token, ma.refresh_token,
        ma.connection_status AS is_connected,
        (SELECT COUNT(*) FROM campaigns WHERE marketing_account_id = ma.id) as campaign_count,
        (SELECT MAX(completed_at) FROM data_sync_logs WHERE marketing_account_id = ma.id) as last_sync_at
      FROM marketing_accounts ma
      WHERE ma.user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (platform) {
      query += ` AND ma.channel_code = ?`;
      params.push(platform);
    }
    
    query += ` ORDER BY ma.id DESC`;
    
    const { rows } = await pool.query(query, params);

    const decryptedRows = rows.map((row: any) => ({
      ...row,
      access_token: decrypt(row.access_token),
      refresh_token: decrypt(row.refresh_token),
    }));

    res.json({
      accounts: decryptedRows,
    });
  } catch (error: any) {
    console.error('Get accounts error:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.ACCOUNT.SERVER_ERROR, error.message));
  }
};

/**
 * 마케팅 계정 상세 조회
 * GET /api/v1/accounts/:id
 */
export const getAccountById = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    
    const { rows } = await pool.query(
      `SELECT ma.id, ma.user_id, ma.channel_code AS platform,
        ma.external_account_id AS account_id, ma.account_name,
        ma.external_account_id AS account_id, ma.account_name,
        ma.access_token, ma.refresh_token,
        ma.connection_status AS is_connected
      FROM marketing_accounts ma
      WHERE ma.id = ? AND ma.user_id = ?`,
      [id, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json(createErrorResponse(ERROR_CODES.ACCOUNT.NOT_FOUND));
    }

    const row = rows[0];
    res.json({
      account: {
        ...row,
        access_token: decrypt(row.access_token),
        refresh_token: decrypt(row.refresh_token),
      },
    });
  } catch (error: any) {
    console.error('Get account error:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.ACCOUNT.SERVER_ERROR, error.message));
  }
};

/**
 * 마케팅 계정 연결 (수동)
 * POST /api/v1/accounts
 */
export const createAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const {
      platform,
      account_name,
      account_id,
      access_token,
      refresh_token,
    } = req.body;
    
    if (!platform || !account_name || !account_id) {
      return res.status(400).json(createErrorResponse(ERROR_CODES.ACCOUNT.INVALID_INPUT));
    }

    // 중복 확인
    const { rows: existingAccount } = await pool.query(
      'SELECT id FROM marketing_accounts WHERE user_id = ? AND channel_code = ? AND external_account_id = ?',
      [userId, platform, account_id]
    );

    if (existingAccount.length > 0) {
      return res.status(409).json(createErrorResponse(ERROR_CODES.ACCOUNT.EXISTS));
    }
    
    const result = await pool.query(
      `INSERT INTO marketing_accounts (
        user_id, channel_code, account_name, external_account_id,
        access_token, refresh_token, connection_status
      )
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [userId, platform, account_name, account_id, encrypt(access_token), encrypt(refresh_token)]
    );
    
    const { rows } = await pool.query(
      `SELECT id, user_id, channel_code AS platform, account_name,
        external_account_id AS account_id, connection_status AS is_connected
      FROM marketing_accounts WHERE id = ?`,
      [result.insertId]
    );
    
    res.status(201).json({
      account: rows[0],
    });
  } catch (error: any) {
    console.error('Create account error:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.ACCOUNT.SERVER_ERROR, error.message));
  }
};

/**
 * 마케팅 계정 정보 수정
 * PATCH /api/v1/accounts/:id
 */
export const updateAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    const {
      account_name,
      access_token,
      refresh_token,
      is_connected,
    } = req.body;
    
    const { rows: authCheck } = await pool.query(
      'SELECT id FROM marketing_accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (authCheck.length === 0) {
      return res.status(404).json(createErrorResponse(ERROR_CODES.ACCOUNT.NOT_FOUND));
    }

    await pool.query(
      `UPDATE marketing_accounts SET
        account_name = COALESCE(?, account_name),
        access_token = COALESCE(?, access_token),
        refresh_token = COALESCE(?, refresh_token),
        connection_status = COALESCE(?, connection_status)
      WHERE id = ?`,
      [account_name, access_token ? encrypt(access_token) : null, refresh_token ? encrypt(refresh_token) : null, is_connected, id]
    );
    
    const { rows } = await pool.query(
      `SELECT id, user_id, channel_code AS platform, account_name,
        external_account_id AS account_id, connection_status AS is_connected
      FROM marketing_accounts WHERE id = ?`,
      [id]
    );
    
    res.json({
      account: rows[0],
    });
  } catch (error: any) {
    console.error('Update account error:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.ACCOUNT.SERVER_ERROR, error.message));
  }
};

/**
 * 마케팅 계정 삭제
 * DELETE /api/v1/accounts/:id
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    
    const { rows: authCheck } = await pool.query(
      'SELECT id FROM marketing_accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (authCheck.length === 0) {
      return res.status(404).json(createErrorResponse(ERROR_CODES.ACCOUNT.NOT_FOUND));
    }

    const { rows: campaignCheck } = await pool.query(
      'SELECT COUNT(*) as count FROM campaigns WHERE marketing_account_id = ?',
      [id]
    );
    
    if (parseInt(campaignCheck[0].count) > 0) {
      return res.status(400).json(createErrorResponse(ERROR_CODES.ACCOUNT.HAS_CAMPAIGNS));
    }
    
    await pool.query('DELETE FROM marketing_accounts WHERE id = ?', [id]);
    
    res.json({
      message: '계정이 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json(createErrorResponse(ERROR_CODES.ACCOUNT.SERVER_ERROR, error.message));
  }
};
