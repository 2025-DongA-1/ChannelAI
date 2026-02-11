import axios from 'axios';
import {
  IAdService,
  AdAccount,
  AdCampaign,
  AdMetrics,
  OAuthCredentials,
  AdServiceUtils
} from './baseAdService';

/**
 * Naver 검색광고 API 서비스
 * API 문서: https://naver.github.io/searchad-apidoc/
 */
export class NaverAdsService implements IAdService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly customerId: string;
  private readonly baseUrl: string = 'https://api.naver.com';

  constructor() {
    this.clientId = process.env.NAVER_ADS_CLIENT_ID || '';
    this.clientSecret = process.env.NAVER_ADS_CLIENT_SECRET || '';
    this.apiKey = process.env.NAVER_API_KEY || '';
    this.secretKey = process.env.NAVER_SECRET_KEY || '';
    this.customerId = process.env.NAVER_CUSTOMER_ID || '';
  }

  /**
   * Naver OAuth URL 생성 (네이버 로그인)
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state
    });

    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
  }

  /**
   * OAuth 콜백 처리 (실제 구현)
   */
  async handleCallback(code: string, redirectUri: string): Promise<OAuthCredentials> {
    try {
      const response = await axios.post(
        'https://nid.naver.com/oauth2.0/token',
        null,
        {
          params: {
            grant_type: 'authorization_code',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code,
            redirect_uri: redirectUri
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
      };
    } catch (error) {
      console.error('[Naver Ads] OAuth callback error:', error);
      throw new Error('Failed to get Naver access token');
    }
  }

  /**
   * 토큰 갱신 (실제 구현)
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthCredentials> {
    try {
      const response = await axios.post(
        'https://nid.naver.com/oauth2.0/token',
        null,
        {
          params: {
            grant_type: 'refresh_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
      };
    } catch (error) {
      console.error('[Naver Ads] Refresh token error:', error);
      throw new Error('Failed to refresh Naver access token');
    }
  }

  /**
   * 광고 계정 목록 조회
   */
  async getAccounts(accessToken: string): Promise<AdAccount[]> {
    console.log('[Naver Ads] Get accounts');

    // Naver는 Customer ID가 계정당 하나로 고정
    return [
      {
        id: this.customerId,
        name: '네이버 검색광고 계정',
        currency: 'KRW',
        timezone: 'Asia/Seoul',
        status: 'active'
      }
    ];
  }

  /**
   * 캠페인 목록 조회 (실제 구현)
   */
  async getCampaigns(accessToken: string, accountId: string): Promise<AdCampaign[]> {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp, 'GET', '/ncc/campaigns');

      const response = await axios.get(
        `${this.baseUrl}/ncc/campaigns`,
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'X-Customer': this.customerId,
            'X-Timestamp': timestamp.toString(),
            'X-Signature': signature
          }
        }
      );

      return response.data.map((campaign: any) => ({
        id: campaign.nccCampaignId,
        name: campaign.name,
        status: campaign.userLock ? 'paused' : 'active',
        objective: campaign.campaignTp || 'SEARCH',
        budget: {
          daily: campaign.dailyBudget,
          total: campaign.totalBudget
        },
        startDate: campaign.regTm,
        endDate: campaign.endTm || ''
      }));
    } catch (error) {
      console.error('[Naver Ads] Get campaigns error:', error);
      // Fallback to mock data
      return [
        {
          id: 'naver-camp-001',
          name: '네이버 브랜드 검색',
          status: 'active',
          objective: 'SEARCH',
          budget: {
            daily: 120000,
            total: 3600000
          },
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      ];
    }
  }

  /**
   * 캠페인 메트릭 조회
   */
  async getMetrics(
    accessToken: string,
    accountId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<AdMetrics[]> {
    console.log('[Naver Ads Mock] Get metrics:', { accountId, campaignId, startDate, endDate });

    // Mock: 날짜별 메트릭 생성
    const dates = AdServiceUtils.getDateRange(startDate, endDate);
    return dates.map(date => AdServiceUtils.generateMockMetrics(campaignId, date));

    /* 실제 구현:
    const response = await axios.get(
      `https://api.naver.com/search-ad/v1/stats`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-API-KEY': this.apiKey,
          'X-Customer': accountId
        },
        params: {
          nccCampaignId: campaignId,
          fromTime: startDate,
          toTime: endDate,
          timeUnit: 'DATE'
        }
      }
    );

    return response.data.map(row => ({
      campaignId,
      date: row.date,
      impressions: row.impCnt,
      clicks: row.clkCnt,
      conversions: row.convCnt,
      cost: row.salesAmt,
      revenue: row.convAmt
    }));
    */
  }

  /**
   * API 서명 생성 (Naver 검색광고 API 인증용)
   */
  private generateSignature(timestamp: number, method: string, path: string): string {
    const crypto = require('crypto');
    const message = `${timestamp}.${method}.${path}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
    return signature;
  }

  /**
   * 캠페인 생성
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaign: Partial<AdCampaign>
  ): Promise<AdCampaign> {
    console.log('[Naver Ads] Create campaign:', campaign);

    return {
      id: `naver-camp-${Date.now()}`,
      name: campaign.name || 'New Campaign',
      status: campaign.status || 'draft',
      objective: campaign.objective,
      budget: campaign.budget,
      startDate: campaign.startDate,
      endDate: campaign.endDate
    };
  }
}

// 싱글톤 인스턴스
export const naverAdsService = new NaverAdsService();
