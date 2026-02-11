import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import pool from '../config/database';
import { googleAdsService } from '../services/external/googleAdsService';
import { metaAdsService } from '../services/external/metaAdsService';
import { naverAdsService } from '../services/external/naverAdsService';
import KarrotAdsService from '../services/external/karrotAdsService';
import { IAdService } from '../services/external/baseAdService';

/**
 * 플랫폼별 서비스 매핑
 */
const serviceMap: Record<string, IAdService> = {
  google: googleAdsService,
  meta: metaAdsService,
  naver: naverAdsService,
  // karrot은 동적 생성 필요 (계정별 access token)
};

/**
 * OAuth 인증 URL 생성
 * GET /api/v1/integration/auth/:platform
 */
export const getAuthUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { platform } = req.params;
    const userId = req.user?.id;

    const service = serviceMap[platform];
    if (!service) {
      return res.status(400).json({ error: '지원하지 않는 플랫폼입니다.' });
    }

    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/integration/callback/${platform}`;
    const state = Buffer.from(JSON.stringify({ userId, platform })).toString('base64');

    const authUrl = service.getAuthUrl(redirectUri, state);

    return res.json({
      success: true,
      data: {
        platform,
        authUrl,
        redirectUri,
        state
      }
    });
  } catch (error) {
    console.error('OAuth URL 생성 오류:', error);
    res.status(500).json({ 
      error: 'OAuth URL 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * OAuth 콜백 처리
 * GET /api/v1/integration/callback/:platform
 */
export const handleOAuthCallback = async (req: AuthRequest, res: Response) => {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: '인증 코드가 없습니다.' });
    }

    const service = serviceMap[platform];
    if (!service) {
      return res.status(400).json({ error: '지원하지 않는 플랫폼입니다.' });
    }

    // State 검증
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = stateData.userId;

    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/integration/callback/${platform}`;

    // 토큰 교환
    const credentials = await service.handleCallback(code as string, redirectUri);

    // 계정 정보 조회
    const accounts = await service.getAccounts(credentials.accessToken);

    // 첫 번째 계정을 DB에 저장
    if (accounts.length > 0) {
      const account = accounts[0];
      
      await pool.query(`
        INSERT INTO marketing_accounts (
          user_id, platform, account_id, account_name,
          access_token, refresh_token, token_expires_at, is_connected
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (user_id, platform, account_id)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          is_connected = true,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId,
        platform,
        account.id,
        account.name,
        credentials.accessToken,
        credentials.refreshToken,
        credentials.expiresAt
      ]);
    }

    // 프론트엔드로 리디렉트
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/integration?success=true&platform=${platform}&accounts=${accounts.length}`);
  } catch (error) {
    console.error('OAuth 콜백 처리 오류:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/integration?error=${encodeURIComponent(error instanceof Error ? error.message : '인증 실패')}`);
  }
};

/**
 * 캠페인 동기화
 * POST /api/v1/integration/sync/campaigns/:accountId
 */
export const syncCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.user?.id;

    // 계정 정보 조회
    const accountResult = await pool.query(
      'SELECT * FROM marketing_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: '계정을 찾을 수 없습니다.' });
    }

    const account = accountResult.rows[0];
    const service = serviceMap[account.platform];

    if (!service) {
      return res.status(400).json({ error: '지원하지 않는 플랫폼입니다.' });
    }

    // 캠페인 목록 가져오기
    const campaigns = await service.getCampaigns(account.access_token, account.account_id);

    let syncedCount = 0;
    let newCount = 0;

    // 캠페인 DB 저장
    for (const campaign of campaigns) {
      const result = await pool.query(`
        INSERT INTO campaigns (
          marketing_account_id, platform, campaign_id, campaign_name,
          status, objective, daily_budget, total_budget, start_date, end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (marketing_account_id, campaign_id)
        DO UPDATE SET
          campaign_name = EXCLUDED.campaign_name,
          status = EXCLUDED.status,
          objective = EXCLUDED.objective,
          daily_budget = EXCLUDED.daily_budget,
          total_budget = EXCLUDED.total_budget,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `, [
        accountId,
        account.platform,
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.objective,
        campaign.budget?.daily || 0,
        campaign.budget?.total || 0,
        campaign.startDate || null,
        campaign.endDate || null
      ]);

      syncedCount++;
      if (result.rows[0].inserted) {
        newCount++;
      }
    }

    // 동기화 로그 저장
    await pool.query(`
      INSERT INTO data_sync_logs (
        marketing_account_id, sync_type, status, records_synced,
        started_at, completed_at
      ) VALUES ($1, 'campaigns', 'success', $2, NOW(), NOW())
    `, [
      accountId,
      syncedCount
    ]);

    res.json({
      success: true,
      platform: account.platform,
      totalCampaigns: campaigns.length,
      synced: syncedCount,
      new: newCount,
      campaigns: campaigns.map(c => ({ id: c.id, name: c.name, status: c.status }))
    });
  } catch (error) {
    console.error('캠페인 동기화 오류:', error);
    res.status(500).json({ 
      error: '캠페인 동기화 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * 메트릭 동기화
 * POST /api/v1/integration/sync/metrics/:campaignId
 */
export const syncMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.body;
    const userId = req.user?.id;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: '시작일과 종료일을 지정해주세요.' });
    }

    // 캠페인 및 계정 정보 조회
    const campaignResult = await pool.query(`
      SELECT c.*, ma.access_token, ma.account_id, ma.platform
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE c.id = $1 AND ma.user_id = $2
    `, [campaignId, userId]);

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: '캠페인을 찾을 수 없습니다.' });
    }

    const campaign = campaignResult.rows[0];
    const service = serviceMap[campaign.platform];

    if (!service) {
      return res.status(400).json({ error: '지원하지 않는 플랫폼입니다.' });
    }

    // 메트릭 가져오기
    const metrics = await service.getMetrics(
      campaign.access_token,
      campaign.account_id,
      campaign.campaign_id,
      startDate,
      endDate
    );

    let syncedCount = 0;

    // 메트릭 DB 저장
    for (const metric of metrics) {
      const existing = await pool.query(
        'SELECT id FROM campaign_metrics WHERE campaign_id = $1 AND date = $2',
        [campaignId, metric.date]
      );

      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE campaign_metrics
          SET impressions = $1, clicks = $2, conversions = $3,
              cost = $4, revenue = $5, ctr = $6, cpc = $7, roas = $8,
              updated_at = CURRENT_TIMESTAMP
          WHERE campaign_id = $9 AND date = $10
        `, [
          metric.impressions, metric.clicks, metric.conversions,
          metric.cost, metric.revenue || 0, metric.ctr || 0,
          metric.cpc || 0, metric.roas || 0,
          campaignId, metric.date
        ]);
      } else {
        await pool.query(`
          INSERT INTO campaign_metrics (
            campaign_id, date, impressions, clicks, conversions,
            cost, revenue, ctr, cpc, roas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          campaignId, metric.date,
          metric.impressions, metric.clicks, metric.conversions,
          metric.cost, metric.revenue || 0, metric.ctr || 0,
          metric.cpc || 0, metric.roas || 0
        ]);
      }

      syncedCount++;
    }

    // 동기화 로그 저장
    await pool.query(`
      INSERT INTO data_sync_logs (
        marketing_account_id, sync_type, status, records_synced,
        started_at, completed_at
      ) VALUES ($1, 'metrics', 'success', $2, NOW(), NOW())
    `, [
      campaign.marketing_account_id,
      syncedCount
    ]);

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.campaign_name,
        platform: campaign.platform
      },
      period: { startDate, endDate },
      metricsSynced: syncedCount
    });
  } catch (error) {
    console.error('메트릭 동기화 오류:', error);
    res.status(500).json({ 
      error: '메트릭 동기화 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * 연결된 계정의 모든 캠페인 메트릭 일괄 동기화
 * POST /api/v1/integration/sync/all
 */
export const syncAllMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, platform } = req.body;

    console.log('[Sync All] 동기화 시작:', { userId, startDate, endDate, platform });

    if (!startDate || !endDate) {
      return res.status(400).json({ error: '시작일과 종료일을 지정해주세요.' });
    }

    // 1. 먼저 계정 정보 조회
    let accountQuery = 'SELECT * FROM marketing_accounts WHERE user_id = $1';
    const accountParams: any[] = [userId];
    
    if (platform) {
      accountQuery += ' AND platform = $2';
      accountParams.push(platform);
    }

    const accountsResult = await pool.query(accountQuery, accountParams);
    const accounts = accountsResult.rows;

    console.log('[Sync All] 계정 조회 완료:', accounts.length, '개');

    if (accounts.length === 0) {
      return res.status(404).json({ error: '연동된 계정이 없습니다.' });
    }

    let totalCampaigns = 0;
    let totalMetrics = 0;
    const results: any[] = [];

    // 2. 각 계정별로 캠페인 먼저 동기화
    for (const account of accounts) {
      const service = serviceMap[account.platform];
      if (!service) continue;

      try {
        // 캠페인 가져오기
        console.log(`[Sync All] ${account.platform} 캠페인 가져오는 중...`);
        const campaigns = await service.getCampaigns(account.access_token, account.account_id);
        console.log(`[Sync All] ${campaigns.length}개 캠페인 발견`);
        
        let syncedCampaigns = 0;
        let syncedMetrics = 0;

        for (const campaign of campaigns) {
          // 캠페인 저장
          const existingCampaign = await pool.query(
            'SELECT id FROM campaigns WHERE marketing_account_id = $1 AND campaign_id = $2',
            [account.id, campaign.id]
          );

          let dbCampaignId: number;

          if (existingCampaign.rows.length > 0) {
            await pool.query(`
              UPDATE campaigns
              SET campaign_name = $1, status = $2, daily_budget = $3, 
                  total_budget = $4, start_date = $5, end_date = $6,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $7
            `, [
              campaign.name, campaign.status, campaign.budget?.daily,
              campaign.budget?.total, campaign.startDate, campaign.endDate,
              existingCampaign.rows[0].id
            ]);
            dbCampaignId = existingCampaign.rows[0].id;
          } else {
            const insertResult = await pool.query(`
              INSERT INTO campaigns (
                marketing_account_id, platform, campaign_id,
                campaign_name, status, daily_budget, total_budget,
                start_date, end_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING id
            `, [
              account.id, account.platform, campaign.id,
              campaign.name, campaign.status, campaign.budget?.daily,
              campaign.budget?.total, campaign.startDate, campaign.endDate
            ]);
            dbCampaignId = insertResult.rows[0].id;
            syncedCampaigns++;
          }

          // 메트릭 가져오기 및 저장
          const metrics = await service.getMetrics(
            account.access_token,
            account.account_id,
            campaign.id,
            startDate,
            endDate
          );

          console.log(`[Sync All] ${campaign.name}: ${metrics.length}개 메트릭 가져옴`);

          for (const metric of metrics) {
            const existing = await pool.query(
              'SELECT id FROM campaign_metrics WHERE campaign_id = $1 AND date = $2',
              [dbCampaignId, metric.date]
            );

            if (existing.rows.length > 0) {
              await pool.query(`
                UPDATE campaign_metrics
                SET impressions = $1, clicks = $2, conversions = $3,
                    cost = $4, revenue = $5, ctr = $6, cpc = $7, roas = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE campaign_id = $9 AND date = $10
              `, [
                metric.impressions, metric.clicks, metric.conversions,
                metric.cost, metric.revenue || 0, metric.ctr || 0,
                metric.cpc || 0, metric.roas || 0,
                dbCampaignId, metric.date
              ]);
            } else {
              await pool.query(`
                INSERT INTO campaign_metrics (
                  campaign_id, date, impressions, clicks, conversions,
                  cost, revenue, ctr, cpc, roas
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `, [
                dbCampaignId, metric.date,
                metric.impressions, metric.clicks, metric.conversions,
                metric.cost, metric.revenue || 0, metric.ctr || 0,
                metric.cpc || 0, metric.roas || 0
              ]);
            }
            syncedMetrics++;
          }
        }

        totalCampaigns += campaigns.length;
        totalMetrics += syncedMetrics;

        console.log(`[Sync All] ${account.platform} 완료: 캠페인 ${campaigns.length}, 메트릭 ${syncedMetrics}`);

        results.push({
          platform: account.platform,
          account: account.account_name,
          campaigns: campaigns.length,
          newCampaigns: syncedCampaigns,
          metrics: syncedMetrics
        });
      } catch (error) {
        console.error(`[Sync All] ${account.platform} 오류:`, error);
        results.push({
          platform: account.platform,
          account: account.account_name,
          error: error instanceof Error ? error.message : '동기화 실패'
        });
      }
    }

    console.log('[Sync All] 동기화 완료:', { totalCampaigns, totalMetrics });

    res.json({
      success: true,
      period: { startDate, endDate },
      totalCampaigns,
      totalMetrics,
      results
    });
  } catch (error) {
    console.error('전체 메트릭 동기화 오류:', error);
    res.status(500).json({ 
      error: '메트릭 동기화 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * 계정 연동 해제
 * DELETE /api/v1/integration/disconnect/:platform
 */
export const disconnectAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { platform } = req.params;
    const userId = req.user?.id;

    // 계정 정보 조회
    const accountResult = await pool.query(
      'SELECT id FROM marketing_accounts WHERE user_id = $1 AND platform = $2',
      [userId, platform]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: '연동된 계정을 찾을 수 없습니다.' });
    }

    const accountId = accountResult.rows[0].id;

    // 관련 데이터 삭제 (캠페인 메트릭, 캠페인, 계정 순서)
    await pool.query('DELETE FROM campaign_metrics WHERE campaign_id IN (SELECT id FROM campaigns WHERE marketing_account_id = $1)', [accountId]);
    await pool.query('DELETE FROM campaigns WHERE marketing_account_id = $1', [accountId]);
    await pool.query('DELETE FROM marketing_accounts WHERE id = $1', [accountId]);

    res.json({
      success: true,
      message: `${platform} 계정 연동이 해제되었습니다.`,
      platform
    });
  } catch (error) {
    console.error('계정 연동 해제 오류:', error);
    res.status(500).json({ 
      error: '계정 연동 해제 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};
