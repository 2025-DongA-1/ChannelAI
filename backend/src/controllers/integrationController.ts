import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import pool from '../config/database';
import { googleAdsService } from '../services/external/googleAdsService';
import { metaAdsService } from '../services/external/metaAdsService';
import { naverAdsService, NaverAdsService } from '../services/external/naverAdsService';
import KarrotAdsService from '../services/external/karrotAdsService';
import { IAdService } from '../services/external/baseAdService';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import * as iconv from 'iconv-lite';

/**
 * 플랫폼별 서비스 매핑
 */
const serviceMap: Record<string, IAdService> = {
  google: googleAdsService,
  meta: metaAdsService,
  naver: naverAdsService,
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

    // 계정 정보를 DB에 저장 (계정이 없어도 OAuth 연결은 저장)
    if (accounts.length > 0) {
      const account = accounts[0];
      
      await pool.query(`
        INSERT INTO marketing_accounts (
          user_id, channel_code, external_account_id, account_name,
          access_token, refresh_token, connection_status
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          access_token = VALUES(access_token),
          refresh_token = VALUES(refresh_token),
          connection_status = 1
      `, [
        userId,
        platform,
        account.id,
        account.name,
        credentials.accessToken,
        credentials.refreshToken
      ]);
    } else {
      // 계정 목록은 못 가져왔지만 OAuth 인증은 성공 → 연결 저장
      console.log(`[${platform}] 계정 목록 0개, OAuth 연결만 저장`);
      await pool.query(`
        INSERT INTO marketing_accounts (
          user_id, channel_code, external_account_id, account_name,
          access_token, refresh_token, connection_status
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          access_token = VALUES(access_token),
          refresh_token = VALUES(refresh_token),
          connection_status = 1
      `, [
        userId,
        platform,
        'oauth_connected',
        `${platform.charAt(0).toUpperCase() + platform.slice(1)} Ads (OAuth)`,
        credentials.accessToken,
        credentials.refreshToken
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
      'SELECT * FROM marketing_accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: '계정을 찾을 수 없습니다.' });
    }

    const account = accountResult.rows[0];
    const service = serviceMap[account.channel_code];

    if (!service) {
      return res.status(400).json({ error: '지원하지 않는 플랫폼입니다.' });
    }

    // 캠페인 목록 가져오기
    const campaigns = await service.getCampaigns(account.access_token, account.external_account_id);

    let syncedCount = 0;
    let newCount = 0;

    // 캠페인 DB 저장
    for (const campaign of campaigns) {
      // 기존 캠페인 확인
      const existing = await pool.query(
        'SELECT id FROM campaigns WHERE marketing_account_id = ? AND external_campaign_id = ?',
        [accountId, campaign.id]
      );

      if (existing.rows.length > 0) {
        // 기존 캠페인 업데이트
        await pool.query(`
          UPDATE campaigns SET
            campaign_name = ?, status = ?,
            daily_budget = ?, total_budget = ?
          WHERE marketing_account_id = ? AND external_campaign_id = ?
        `, [
          campaign.name, campaign.status,
          campaign.budget?.daily || 0, campaign.budget?.total || 0,
          accountId, campaign.id
        ]);
      } else {
        // 새 캠페인 삽입
        await pool.query(`
          INSERT INTO campaigns (
            marketing_account_id, external_campaign_id, campaign_name,
            status, daily_budget, total_budget
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          accountId, campaign.id, campaign.name,
          campaign.status,
          campaign.budget?.daily || 0, campaign.budget?.total || 0
        ]);
        newCount++;
      }
      syncedCount++;
    }

    // 동기화 로그 저장
    await pool.query(`
      INSERT INTO data_sync_logs (
        marketing_account_id, sync_type, status, records_synced, started_at, completed_at
      ) VALUES (?, 'campaign_sync', 'success', ?, NOW(), NOW())
    `, [accountId, syncedCount]);

    res.json({
      success: true,
      platform: account.channel_code,
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
      SELECT c.*, ma.access_token, ma.external_account_id AS account_id, ma.channel_code AS platform
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      WHERE c.id = ? AND ma.user_id = ?
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
      campaign.external_campaign_id,
      startDate,
      endDate
    );

    let syncedCount = 0;

    // 메트릭 DB 저장
    for (const metric of metrics) {
      const existing = await pool.query(
        'SELECT id FROM campaign_metrics WHERE campaign_id = ? AND metric_date = ?',
        [campaignId, metric.date]
      );

      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE campaign_metrics
          SET impressions = ?, clicks = ?, conversions = ?,
              cost = ?, revenue = ?
          WHERE campaign_id = ? AND metric_date = ?
        `, [
          metric.impressions, metric.clicks, metric.conversions,
          metric.cost, metric.revenue || 0,
          campaignId, metric.date
        ]);
      } else {
        await pool.query(`
          INSERT INTO campaign_metrics (
            campaign_id, metric_date, impressions, clicks, conversions,
            cost, revenue
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          campaignId, metric.date,
          metric.impressions, metric.clicks, metric.conversions,
          metric.cost, metric.revenue || 0
        ]);
      }
      syncedCount++;
    }

    // 동기화 로그 저장
    await pool.query(`
      INSERT INTO data_sync_logs (
        marketing_account_id, sync_type, status, records_synced, started_at, completed_at
      ) VALUES (?, 'metric_sync', 'success', ?, NOW(), NOW())
    `, [campaign.marketing_account_id, syncedCount]);

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
    let accountQuery = 'SELECT * FROM marketing_accounts WHERE user_id = ?';
    const accountParams: any[] = [userId];
    
    if (platform) {
      accountQuery += ' AND channel_code = ?';
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
      const service = serviceMap[account.channel_code];
      if (!service) continue;

      try {
        // 캠페인 가져오기
        console.log(`[Sync All] ${account.channel_code} 캠페인 가져오는 중...`);
        const campaigns = await service.getCampaigns(account.access_token, account.external_account_id);
        console.log(`[Sync All] ${campaigns.length}개 캠페인 발견`);
        
        let syncedCampaigns = 0;
        let syncedMetrics = 0;

        for (const campaign of campaigns) {
          // 캠페인 저장
          const existingCampaign = await pool.query(
            'SELECT id FROM campaigns WHERE marketing_account_id = ? AND external_campaign_id = ?',
            [account.id, campaign.id]
          );

          let dbCampaignId: number;

          if (existingCampaign.rows.length > 0) {
            await pool.query(`
              UPDATE campaigns
              SET campaign_name = ?, status = ?, daily_budget = ?, 
                  total_budget = ?
              WHERE id = ?
            `, [
              campaign.name, campaign.status, campaign.budget?.daily,
              campaign.budget?.total,
              existingCampaign.rows[0].id
            ]);
            dbCampaignId = existingCampaign.rows[0].id;
          } else {
            const insertResult = await pool.query(`
              INSERT INTO campaigns (
                marketing_account_id, external_campaign_id,
                campaign_name, status, daily_budget, total_budget
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
              account.id, campaign.id,
              campaign.name, campaign.status, campaign.budget?.daily,
              campaign.budget?.total
            ]);
            dbCampaignId = insertResult.insertId!;
            syncedCampaigns++;
          }

          // 메트릭 가져오기 및 저장
          const metrics = await service.getMetrics(
            account.access_token,
            account.external_account_id,
            campaign.id,
            startDate,
            endDate
          );

          console.log(`[Sync All] ${campaign.name}: ${metrics.length}개 메트릭 가져옴`);

          for (const metric of metrics) {
            const existing = await pool.query(
              'SELECT id FROM campaign_metrics WHERE campaign_id = ? AND metric_date = ?',
              [dbCampaignId, metric.date]
            );

            if (existing.rows.length > 0) {
              await pool.query(`
                UPDATE campaign_metrics
                SET impressions = ?, clicks = ?, conversions = ?,
                    cost = ?, revenue = ?
                WHERE campaign_id = ? AND metric_date = ?
              `, [
                metric.impressions, metric.clicks, metric.conversions,
                metric.cost, metric.revenue || 0,
                dbCampaignId, metric.date
              ]);
            } else {
              await pool.query(`
                INSERT INTO campaign_metrics (
                  campaign_id, metric_date, impressions, clicks, conversions,
                  cost, revenue
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                dbCampaignId, metric.date,
                metric.impressions, metric.clicks, metric.conversions,
                metric.cost, metric.revenue || 0
              ]);
            }
            syncedMetrics++;
          }
        }

        totalCampaigns += campaigns.length;
        totalMetrics += syncedMetrics;

        console.log(`[Sync All] ${account.channel_code} 완료: 캠페인 ${campaigns.length}, 메트릭 ${syncedMetrics}`);

        results.push({
          platform: account.channel_code,
          account: account.account_name,
          campaigns: campaigns.length,
          newCampaigns: syncedCampaigns,
          metrics: syncedMetrics
        });
      } catch (error) {
        console.error(`[Sync All] ${account.channel_code} 오류:`, error);
        results.push({
          platform: account.channel_code,
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
 * API 키 기반 플랫폼 연동 (네이버 등 OAuth 미지원 플랫폼)
 * POST /api/v1/integration/connect/:platform
 * 
 * 플랫폼별 인증 방식:
 * - naver: API Key + Secret Key + Customer ID (수동 입력)
 * - google/meta: OAuth (기존 /auth/:platform 사용)
 * - kakao: 추후 결정
 * 
 * 기존 marketing_accounts 컬럼 활용:
 * - access_token: JSON 형태의 API 인증 정보 {"type":"api_key","apiKey":"...","secretKey":"..."}
 * - external_account_id: 플랫폼 고객 ID (네이버 Customer ID 등)
 * - channel_code: 플랫폼 코드 ('naver')
 * - account_name: 사용자 지정 계정명
 */
export const connectPlatform = async (req: AuthRequest, res: Response) => {
  try {
    const { platform } = req.params;
    const userId = req.user?.id;

    if (platform === 'naver') {
      const { apiKey, secretKey, customerId, accountName } = req.body;

      if (!apiKey || !secretKey || !customerId) {
        return res.status(400).json({
          error: 'MISSING_CREDENTIALS',
          message: 'API Key, Secret Key, Customer ID를 모두 입력해주세요.'
        });
      }

      // 1. API 자격증명 유효성 검증 (실제 네이버 API 호출)
      try {
        const validation = await naverAdsService.validateCredentials(apiKey, secretKey, customerId);
        console.log('[Connect Naver] 인증 성공, 캠페인 수:', validation.campaignCount);
      } catch (error: any) {
        const errDetail = error?.response?.data || error.message;
        console.error('[Connect Naver] 인증 실패:', errDetail);
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'API 인증에 실패했습니다. 입력한 키를 확인해주세요.',
          details: typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail
        });
      }

      // 2. access_token에 JSON 형태로 인증 정보 저장
      const authData = JSON.stringify({
        type: 'api_key',
        apiKey,
        secretKey
      });

      // 3. 기존 계정 확인 (같은 user + naver + customerId)
      const existing = await pool.query(
        'SELECT id FROM marketing_accounts WHERE user_id = ? AND channel_code = ? AND external_account_id = ?',
        [userId, platform, customerId]
      );

      let accountId: number;
      const displayName = accountName || '네이버 검색광고';

      if (existing.rows.length > 0) {
        // 기존 계정 업데이트
        await pool.query(
          'UPDATE marketing_accounts SET access_token = ?, account_name = ?, connection_status = 1 WHERE id = ?',
          [authData, displayName, existing.rows[0].id]
        );
        accountId = existing.rows[0].id;
        console.log('[Connect Naver] 기존 계정 업데이트:', accountId);
      } else {
        // 새 계정 생성
        const result = await pool.query(
          `INSERT INTO marketing_accounts (user_id, channel_code, external_account_id, account_name, access_token, connection_status)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [userId, platform, customerId, displayName, authData]
        );
        accountId = result.insertId!;
        console.log('[Connect Naver] 새 계정 생성:', accountId);
      }

      return res.json({
        success: true,
        message: '네이버 검색광고 계정이 연동되었습니다.',
        data: {
          accountId,
          platform,
          customerId,
          accountName: displayName
        }
      });
    }

    // 다른 플랫폼 (kakao 등)은 추후 추가
    return res.status(400).json({
      error: 'UNSUPPORTED_PLATFORM',
      message: `${platform}은(는) API 키 연동을 지원하지 않습니다. OAuth를 사용해주세요.`
    });
  } catch (error) {
    console.error('플랫폼 연동 오류:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: '플랫폼 연동 중 오류가 발생했습니다.',
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
      'SELECT id FROM marketing_accounts WHERE user_id = ? AND channel_code = ?',
      [userId, platform]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: '연동된 계정을 찾을 수 없습니다.' });
    }

    const accountId = accountResult.rows[0].id;

    // 관련 데이터 삭제 (캠페인 메트릭, 캠페인, 계정 순서)
    await pool.query('DELETE FROM campaign_metrics WHERE campaign_id IN (SELECT id FROM campaigns WHERE marketing_account_id = ?)', [accountId]);
    await pool.query('DELETE FROM campaigns WHERE marketing_account_id = ?', [accountId]);
    await pool.query('DELETE FROM marketing_accounts WHERE id = ?', [accountId]);

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

/**
 * CSV 파일 업로드 및 데이터 저장 (Ported from Ad-Mate)
 * POST /api/v1/integration/upload/csv
 */
export const uploadCSV = async (req: AuthRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ error: '파일이 없습니다.' });
  }

  const userId = req.user?.id;
  const filePath = file.path;
  const startTime = new Date();
  let firstAccountId: number | null = null;

  try {
    const buffer = fs.readFileSync(filePath);
    let content = iconv.decode(buffer, 'utf-8').replace(/^\uFEFF/, '');
    
    const hasHeader = (txt: string) => (txt.includes('날짜') || txt.includes('date')) && (txt.includes('매체') || txt.includes('platform'));

    if (!hasHeader(content)) {
      content = iconv.decode(buffer, 'cp949');
    }

    const lines = content.split(/\r?\n/);
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        if (hasHeader(lines[i])) {
            headerRowIndex = i;
            break;
        }
    }

    const cleanContent = lines.slice(headerRowIndex).join('\n');
    const tempPath = filePath + '_clean.csv';
    fs.writeFileSync(tempPath, cleanContent, 'utf-8');

    const results: any[] = [];
    
    // CSV 파싱 스트림
    await new Promise((resolve, reject) => {
      fs.createReadStream(tempPath)
        .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    const mapPlatformName = (rawPlatform: string) => {
        if (!rawPlatform) return 'other';
        const p = rawPlatform.toLowerCase().trim();
        if (p.includes('facebook') || p.includes('페이스북') || p.includes('insta')) return 'meta';
        if (p.includes('google') || p.includes('구글') || p.includes('youtube')) return 'google';
        if (p.includes('kakao') || p.includes('카카오')) return 'kakao';
        if (p.includes('naver') || p.includes('네이버')) return 'naver';
        if (p.includes('tiktok') || p.includes('틱톡')) return 'tiktok';
        if (p.includes('karrot') || p.includes('당근')) return 'karrot';
        return 'other';
    };

    const parseNumber = (val: any) => {
        if (!val) return 0;
        let cleanStr = val.toString().replace(/["\s,]/g, '').trim();
        if (cleanStr === '-' || cleanStr === '') return 0;
        const num = parseFloat(cleanStr);
        return isNaN(num) ? 0 : num;
    };

    let processedCount = 0;

    for (const row of results) {
        const getVal = (keywords: string[]) => {
            const key = Object.keys(row).find(k => 
                keywords.some(kw => k === kw || k.toLowerCase().includes(kw.toLowerCase()))
            );
            return key ? row[key]?.trim() : null;
        };

        const rawDate = getVal(['날짜', 'date']);
        if (!rawDate) continue;

        const rawPlatform = getVal(['매체', 'platform', 'source']) || '기타';
        const platform = rawPlatform.trim();
        const campaignName = getVal(['캠페인', 'campaign']) || 'Imported Campaign';
        
        const impressions = parseNumber(getVal(['노출', 'impressions']));
        const clicks = parseNumber(getVal(['클릭', 'clicks']));
        const spend = parseNumber(getVal(['비용', 'spend', 'cost', '집행금액']));
        const conversions = parseNumber(getVal(['설치', 'conversions', '전환', 'installs']));
        const sales = parseNumber(getVal(['매출', 'sales', 'revenue']));

        // 0. 채널 정보 보장 (규격화 제거로 인해 새로운 매체명이 들어올 수 있음)
        // DB 스키마: name(UNI, NN), channel_code(YES), display_name(NN)
        try {
            await pool.query(
                'INSERT IGNORE INTO channels (name, channel_code, display_name) VALUES (?, ?, ?)',
                [platform, platform, platform]
            );
        } catch (e) {
            // 채널 삽입 실패시 무시 (이미 존재하거나 다른 에러)
            console.warn('Channel insertion warning:', e);
        }

        // 1. 마케팅 계정 처리
        const externalAccountId = `imported_${platform}_${userId}`; // 유저별 고유 계정 아이디 생성
        const { rows: accounts } = await pool.query(
            'SELECT id FROM marketing_accounts WHERE user_id = ? AND channel_code = ? AND external_account_id = ?',
            [userId, platform, externalAccountId]
        );

        let accountId: number;
        if (accounts.length === 0) {
            const result = await pool.query(
                'INSERT INTO marketing_accounts (user_id, channel_code, external_account_id, account_name, connection_status) VALUES (?, ?, ?, ?, 1)',
                [userId, platform, externalAccountId, `${platform}_계정_${userId}`]
            );
            // database.ts wrapper에서 insertId는 결과 객체 바로 아래에 있습니다.
            accountId = result.insertId!;
        } else {
            accountId = accounts[0].id;
        }

        if (!firstAccountId) firstAccountId = accountId;

        // 2. 캠페인 처리
        // external_campaign_id는 CSV 내 캠페인명 + userid 조합 등을 사용해 유니크하게 생성
        const externalCampaignId = `csv_${campaignName}_${userId}`;
        
        let campaignId: number;
        // platform 컬럼 명시적 추가
        const campResult = await pool.query(
            `
            INSERT INTO campaigns (marketing_account_id, external_campaign_id, campaign_name, status, platform)
            VALUES (?, ?, ?, 'active', ?)
            ON DUPLICATE KEY UPDATE campaign_name = VALUES(campaign_name)
            `,
            [accountId, externalCampaignId, campaignName, platform]
        );
        const { rows: campaigns } = await pool.query(
            'SELECT id FROM campaigns WHERE marketing_account_id = ? AND external_campaign_id = ?',
            [accountId, externalCampaignId]
        );
        
        if (campaigns.length === 0) continue;
        campaignId = campaigns[0].id;

        // 3. 지표 처리
        // 날짜 형식이 2024.01.01, 2024/01/01 형태일 경우 DB 입력을 위해 2024-01-01로 보정
        const formattedDate = rawDate.replace(/[\.\/]/g, '-');

        await pool.query(`
            INSERT INTO campaign_metrics (campaign_id, metric_date, impressions, clicks, cost, conversions, revenue)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                impressions = VALUES(impressions),
                clicks = VALUES(clicks),
                cost = VALUES(cost),
                conversions = VALUES(conversions),
                revenue = VALUES(revenue)
        `, [campaignId, formattedDate, impressions, clicks, spend, conversions, sales]);

        processedCount++;
    }

    // 4. 로그 기록
    if (firstAccountId) {
        await pool.query(`
            INSERT INTO data_sync_logs (
                marketing_account_id, sync_type, status, records_synced, started_at, completed_at
            )
            VALUES (?, 'csv_upload', 'success', ?, ?, NOW())
        `, [firstAccountId, processedCount, startTime]);
    }

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.json({
        success: true,
        message: `${processedCount}개의 데이터가 성공적으로 업로드되었습니다.`,
        count: processedCount
    });

  } catch (error: any) {
    console.error('CSV 업로드 오류:', error);
    
    // [디버깅] 상세 에러 로그 파일 기록 (백엔드 콘솔을 볼 수 없는 환경 대비)
    try {
        const logPath = path.join(__dirname, '../../error.log');
        const logContent = `\n[${new Date().toISOString()}] CSV Upload Error:\nMessage: ${error.message}\nSQL: ${error.sql || 'N/A'}\nStack: ${error.stack}\n-------------------\n`;
        fs.appendFileSync(logPath, logContent);
    } catch (logErr) {
        console.error('로그 파일 쓰기 실패:', logErr);
    }

    res.status(500).json({ 
        error: 'CSV_UPLOAD_ERROR', 
        message: 'CSV 처리 중 오류가 발생했습니다. (서버 관리자에게 문의하세요)',
        details: error.message,
        sql: error.sql,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
