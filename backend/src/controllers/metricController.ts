import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';

// 전체 메트릭(Raw 데이터) 조회
export const getAllMetrics = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    
    const query = `
      SELECT 
        cm.*,
        c.campaign_name,
        c.platform,
        ma.account_name
      FROM campaign_metrics cm
      JOIN campaigns c ON cm.campaign_id = c.id
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE ma.user_id = ?
      ORDER BY cm.metric_date DESC, cm.id DESC
      LIMIT 1000
    `;
    
    const result = await client.query(query, [userId]);
    
    res.json({
      metrics: result.rows,
    });
  } catch (error) {
    console.error('Get all metrics error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '메트릭 목록 조회 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 메트릭 데이터 수정
export const updateMetric = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    const { impressions, clicks, cost, conversions, revenue } = req.body;
    
    // 권한 확인
    const authCheck = await client.query(
      `SELECT cm.id FROM campaign_metrics cm
       JOIN campaigns c ON cm.campaign_id = c.id
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE cm.id = ? AND ma.user_id = ?`,
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'METRIC_NOT_FOUND',
        message: '메트릭 데이터를 찾을 수 없습니다.',
      });
    }
    
    await client.query(
      `UPDATE campaign_metrics SET
        impressions = COALESCE(?, impressions),
        clicks = COALESCE(?, clicks),
        cost = COALESCE(?, cost),
        conversions = COALESCE(?, conversions),
        revenue = COALESCE(?, revenue),
        updated_at = NOW()
      WHERE id = ?`,
      [impressions, clicks, cost, conversions, revenue, id]
    );
    
    res.json({
      message: '데이터가 수정되었습니다.',
    });
  } catch (error) {
    console.error('Update metric error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '메트릭 수정 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 메트릭 데이터 삭제
export const deleteMetric = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    
    // 권한 확인
    const authCheck = await client.query(
      `SELECT cm.id FROM campaign_metrics cm
       JOIN campaigns c ON cm.campaign_id = c.id
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE cm.id = ? AND ma.user_id = ?`,
      [id, userId]
    );
    
    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'METRIC_NOT_FOUND',
        message: '메트릭 데이터를 찾을 수 없습니다.',
      });
    }
    
    await client.query('DELETE FROM campaign_metrics WHERE id = ?', [id]);
    
    res.json({
      message: '데이터가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete metric error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '메트릭 삭제 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};

// 메트릭 데이터 일괄 삭제
export const deleteBulkMetrics = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const userId = (req as AuthRequest).user?.id;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: '삭제할 데이터 ID 목록이 없습니다.',
      });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    const queryParams = [...ids, userId];
    
    const authCheck = await client.query(
      `SELECT cm.id FROM campaign_metrics cm
       JOIN campaigns c ON cm.campaign_id = c.id
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE cm.id IN (${placeholders}) AND ma.user_id = ?`,
      queryParams
    );
    
    const validIds = authCheck.rows.map((row: any) => row.id);
    
    if (validIds.length === 0) {
      return res.status(404).json({
        error: 'METRIC_NOT_FOUND',
        message: '삭제 가능한 데이터를 찾을 수 없습니다.',
      });
    }
    
    const validPlaceholders = validIds.map(() => '?').join(',');
    await client.query(`DELETE FROM campaign_metrics WHERE id IN (${validPlaceholders})`, validIds);
    
    res.json({
      message: `${validIds.length}개의 데이터가 성공적으로 삭제되었습니다.`,
    });
  } catch (error) {
    console.error('Delete bulk generic metrics error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '메트릭 일괄 삭제 중 오류가 발생했습니다.',
    });
  } finally {
    client.release();
  }
};
