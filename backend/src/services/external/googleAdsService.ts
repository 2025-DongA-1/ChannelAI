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
 * Google Ads API 서비스 (REST API)
 * 
 * 인증 흐름:
 * 1. OAuth 2.0으로 사용자 동의 → access_token 발급
 * 2. access_token + developer_token으로 Google Ads API 호출
 * 
 * 액세스 수준:
 * - 테스트 계정: MCC 하위 테스트 계정만 접근 가능
 * - 기본/표준: 모든 사용자의 실제 광고 계정 접근 가능 (Google 심사 후)
 */
export class GoogleAdsService implements IAdService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly developerToken: string;
  private readonly mccId: string;
  private apiVersion: string;
  private readonly baseUrl: string = 'https://googleads.googleapis.com';
  // 최신부터 순서대로 시도
  private readonly versionFallbacks: string[] = ['v20', 'v19', 'v18', 'v17', 'v16'];

  constructor() {
    this.clientId = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
    this.mccId = process.env.GOOGLE_ADS_MCC_ID || '';
    this.apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v20';
  }

  /**
   * OAuth 인증 URL 생성
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * OAuth 콜백 처리 — 실제 토큰 교환
   */
  async handleCallback(code: string, redirectUri: string): Promise<OAuthCredentials> {
    console.log('[Google Ads] OAuth callback, redirectUri:', redirectUri);

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      console.log('[Google Ads] 토큰 교환 성공');

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
      };
    } catch (error: any) {
      const errDetail = error?.response?.data || error.message;
      console.error('[Google Ads] OAuth 토큰 교환 오류:', errDetail);
      throw new Error('Google OAuth 토큰 교환에 실패했습니다.');
    }
  }

  /**
   * 액세스 토큰 갱신
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthCredentials> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token'
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
      };
    } catch (error: any) {
      console.error('[Google Ads] 토큰 갱신 오류:', error?.response?.data || error.message);
      throw new Error('Google 토큰 갱신에 실패했습니다.');
    }
  }

  /**
   * Google Ads API 공통 헤더 생성
   * @param accessToken OAuth access token
   * @param includeLoginCustomerId login-customer-id 포함 여부 (listAccessibleCustomers에는 불필요)
   */
  private getApiHeaders(accessToken: string, includeLoginCustomerId: boolean = true) {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': this.developerToken,
      'Content-Type': 'application/json'
    };

    if (includeLoginCustomerId && this.mccId) {
      headers['login-customer-id'] = this.mccId;
    }

    return headers;
  }

  /**
   * 접근 가능한 광고 계정 목록 조회
   * REST: GET /vXX/customers:listAccessibleCustomers
   * API 버전이 sunset된 경우 자동으로 다른 버전을 시도
   */
  async getAccounts(accessToken: string): Promise<AdAccount[]> {
    console.log('[Google Ads] 계정 목록 조회');
    console.log('[Google Ads] accessToken:', accessToken ? `${accessToken.substring(0, 15)}...` : 'EMPTY');
    console.log('[Google Ads] developerToken:', this.developerToken ? `${this.developerToken.substring(0, 8)}...` : 'EMPTY');
    console.log('[Google Ads] mccId:', this.mccId || 'EMPTY');

    // 먼저 현재 설정된 버전으로 시도, 실패 시 폴백 버전들 시도
    const versionsToTry = [this.apiVersion, ...this.versionFallbacks.filter(v => v !== this.apiVersion)];
    let lastError: any = null;

    for (const version of versionsToTry) {
      try {
        console.log(`[Google Ads] API 버전 ${version} 시도 중...`);
        // listAccessibleCustomers에는 login-customer-id 헤더 불필요
        const listResponse = await axios.get(
          `${this.baseUrl}/${version}/customers:listAccessibleCustomers`,
          { headers: this.getApiHeaders(accessToken, false) }
        );

        // 성공하면 이 버전을 기억
        if (version !== this.apiVersion) {
          console.log(`[Google Ads] API 버전 ${version} 사용 (기존 ${this.apiVersion}에서 변경)`);
          this.apiVersion = version;
        }

        const resourceNames: string[] = listResponse.data.resourceNames || [];
        console.log('[Google Ads] 접근 가능 계정:', resourceNames.length, '개');

        const accounts: AdAccount[] = [];

        for (const resourceName of resourceNames) {
          const customerId = resourceName.replace('customers/', '');
          try {
            const detailResponse = await axios.post(
              `${this.baseUrl}/${this.apiVersion}/customers/${customerId}/googleAds:search`,
              {
                query: `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.status FROM customer LIMIT 1`
              },
              { headers: this.getApiHeaders(accessToken) }
            );

            const result = detailResponse.data.results?.[0]?.customer;
            if (result) {
              accounts.push({
                id: result.id?.toString() || customerId,
                name: result.descriptiveName || `Google Ads ${customerId}`,
                currency: result.currencyCode || 'KRW',
                timezone: result.timeZone || 'Asia/Seoul',
                status: result.status === 'ENABLED' ? 'active' : 'inactive'
              });
            }
          } catch (detailErr: any) {
            console.warn(`[Google Ads] 계정 ${customerId} 상세 조회 실패:`, detailErr?.response?.status);
            accounts.push({
              id: customerId,
              name: `Google Ads ${customerId}`,
              currency: 'KRW',
              timezone: 'Asia/Seoul',
              status: 'active'
            });
          }
        }

        return accounts;
      } catch (error: any) {
        const status = error?.response?.status;
        const errData = error?.response?.data;
        lastError = error;

        // 버전 관련 에러(401/404/400+UNSUPPORTED)는 다음 버전으로 계속 시도
        const errStr = typeof errData === 'object' ? JSON.stringify(errData) : String(errData || '');
        const isVersionError = status === 404 || status === 401 ||
          (status === 400 && errStr.includes('UNSUPPORTED_VERSION'));
        
        if (isVersionError) {
          console.warn(`[Google Ads] API ${version} → ${status} 에러, 다음 버전 시도...`);
          continue;
        }

        // 그 외 에러(403 권한 등)는 즉시 반환
        console.error('[Google Ads] 계정 목록 조회 오류:', errStr.slice(0, 500));
        return [];
      }
    }

    // 모든 버전이 실패한 경우
    console.error('[Google Ads] 모든 API 버전 시도 실패. Google Cloud Console에서 Google Ads API를 활성화했는지 확인하세요.');
    console.error('[Google Ads] 마지막 에러:', lastError?.response?.status, typeof lastError?.response?.data === 'string' ? lastError.response.data.slice(0, 200) : '');
    return [];
  }

  /**
   * 캠페인 목록 조회
   * GAQL: SELECT campaign fields FROM campaign
   */
  async getCampaigns(accessToken: string, accountId: string): Promise<AdCampaign[]> {
    console.log('[Google Ads] 캠페인 조회, accountId:', accountId);

    try {
      const customerId = accountId.replace(/-/g, '');

      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/customers/${customerId}/googleAds:search`,
        {
          query: `
            SELECT
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.advertising_channel_type,
              campaign_budget.amount_micros,
              campaign.start_date,
              campaign.end_date
            FROM campaign
            WHERE campaign.status != 'REMOVED'
            ORDER BY campaign.name
          `
        },
        { headers: this.getApiHeaders(accessToken) }
      );

      const results = response.data.results || [];
      console.log(`[Google Ads] ${results.length}개 캠페인 발견`);

      return results.map((row: any) => {
        const camp = row.campaign || {};
        const budget = row.campaignBudget || {};

        return {
          id: camp.id?.toString() || '',
          name: camp.name || 'Unnamed Campaign',
          status: this.mapCampaignStatus(camp.status),
          objective: camp.advertisingChannelType || 'SEARCH',
          budget: {
            daily: budget.amountMicros ? parseInt(budget.amountMicros) / 1_000_000 : 0,
            total: 0
          },
          startDate: camp.startDate || '',
          endDate: camp.endDate || ''
        };
      });
    } catch (error: any) {
      const errDetail = error?.response?.data?.error || error?.response?.data || error.message;
      console.error('[Google Ads] 캠페인 조회 오류:', JSON.stringify(errDetail).slice(0, 500));
      return [];
    }
  }

  /**
   * 캠페인 메트릭 조회
   * GAQL: SELECT metrics FROM campaign WHERE segments.date BETWEEN ...
   */
  async getMetrics(
    accessToken: string,
    accountId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<AdMetrics[]> {
    console.log('[Google Ads] 메트릭 조회:', { accountId, campaignId, startDate, endDate });

    try {
      const customerId = accountId.replace(/-/g, '');

      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/customers/${customerId}/googleAds:search`,
        {
          query: `
            SELECT
              segments.date,
              metrics.impressions,
              metrics.clicks,
              metrics.conversions,
              metrics.cost_micros,
              metrics.conversions_value
            FROM campaign
            WHERE campaign.id = ${campaignId}
              AND segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY segments.date
          `
        },
        { headers: this.getApiHeaders(accessToken) }
      );

      const results = response.data.results || [];
      console.log(`[Google Ads] ${results.length}개 메트릭 row 수신`);

      return results.map((row: any) => {
        const m = row.metrics || {};
        const date = row.segments?.date || '';
        const impressions = parseInt(m.impressions || '0');
        const clicks = parseInt(m.clicks || '0');
        const conversions = parseFloat(m.conversions || '0');
        const cost = parseInt(m.costMicros || '0') / 1_000_000;
        const revenue = parseFloat(m.conversionsValue || '0');

        return {
          campaignId,
          date,
          impressions,
          clicks,
          conversions: Math.round(conversions),
          cost,
          revenue,
          ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
          cpc: clicks > 0 ? Math.round(cost / clicks) : 0,
          roas: cost > 0 ? parseFloat((revenue / cost).toFixed(2)) : 0
        };
      });
    } catch (error: any) {
      const errDetail = error?.response?.data?.error || error?.response?.data || error.message;
      console.error('[Google Ads] 메트릭 조회 오류:', JSON.stringify(errDetail).slice(0, 500));
      return [];
    }
  }

  /**
   * 캠페인 상태 매핑
   */
  private mapCampaignStatus(status: string): 'active' | 'paused' | 'completed' | 'draft' {
    switch (status) {
      case 'ENABLED': return 'active';
      case 'PAUSED': return 'paused';
      case 'REMOVED': return 'completed';
      default: return 'draft';
    }
  }

  /**
   * 캠페인 생성 (미구현)
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaign: Partial<AdCampaign>
  ): Promise<AdCampaign> {
    console.log('[Google Ads] 캠페인 생성 (미구현):', campaign.name);
    return {
      id: `ggl-camp-${Date.now()}`,
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
export const googleAdsService = new GoogleAdsService();
