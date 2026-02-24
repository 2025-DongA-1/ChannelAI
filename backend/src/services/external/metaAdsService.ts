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
 * Meta (Facebook/Instagram) Ads 실제 API 서비스
 * Facebook Marketing API (Graph API) 사용
 * 
 * 인증 흐름:
 * 1. Facebook OAuth로 단기 토큰 발급 (1시간)
 * 2. 단기 토큰을 장기 토큰으로 교환 (60일)
 * 3. 장기 토큰으로 Marketing API 호출
 */
export class MetaAdsService implements IAdService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string = 'https://graph.facebook.com';

  constructor() {
    this.appId = process.env.META_APP_ID || '';
    this.appSecret = process.env.META_APP_SECRET || '';
    this.apiVersion = process.env.META_API_VERSION || 'v21.0';
  }

  /**
   * Facebook OAuth URL 생성
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state,
      scope: 'ads_read',
      response_type: 'code'
    });

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * OAuth 콜백 처리 — 실제 토큰 교환
   * 1. code → 단기 access_token
   * 2. 단기 → 장기 access_token (60일)
   */
  async handleCallback(code: string, redirectUri: string): Promise<OAuthCredentials> {
    console.log('[Meta Ads] OAuth callback, redirectUri:', redirectUri);

    try {
      // 1단계: code → 단기 토큰
      const tokenResponse = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: redirectUri,
            code
          }
        }
      );

      const shortLivedToken = tokenResponse.data.access_token;
      console.log('[Meta Ads] 단기 토큰 발급 성공');

      // 2단계: 단기 → 장기 토큰 (60일)
      const longLivedResponse = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken
          }
        }
      );

      const longLivedToken = longLivedResponse.data.access_token;
      const expiresIn = longLivedResponse.data.expires_in || 5184000; // 기본 60일
      console.log('[Meta Ads] 장기 토큰 교환 성공, 만료:', expiresIn, '초');

      return {
        accessToken: longLivedToken,
        refreshToken: longLivedToken, // Meta는 장기 토큰을 refresh token처럼 사용
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      };
    } catch (error: any) {
      const errDetail = error?.response?.data?.error || error?.response?.data || error.message;
      console.error('[Meta Ads] OAuth 토큰 교환 오류:', JSON.stringify(errDetail).slice(0, 500));
      throw new Error('Meta OAuth 토큰 교환에 실패했습니다.');
    }
  }

  /**
   * 토큰 갱신 — 장기 토큰 재교환
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthCredentials> {
    console.log('[Meta Ads] 토큰 갱신 시도');

    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: refreshToken
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.access_token,
        expiresAt: new Date(Date.now() + (response.data.expires_in || 5184000) * 1000)
      };
    } catch (error: any) {
      console.error('[Meta Ads] 토큰 갱신 오류:', error?.response?.data || error.message);
      throw new Error('Meta 토큰 갱신에 실패했습니다.');
    }
  }

  /**
   * 광고 계정 목록 조회
   * GET /me/adaccounts
   */
  async getAccounts(accessToken: string): Promise<AdAccount[]> {
    console.log('[Meta Ads] 계정 목록 조회');

    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/me/adaccounts`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,currency,timezone_name,account_status,amount_spent',
            limit: 100
          }
        }
      );

      const accounts = response.data.data || [];
      console.log('[Meta Ads] 광고 계정:', accounts.length, '개');

      return accounts.map((acc: any) => ({
        id: acc.id, // 형식: act_XXXXXXXXXX
        name: acc.name || `Meta Ads ${acc.id}`,
        currency: acc.currency || 'KRW',
        timezone: acc.timezone_name || 'Asia/Seoul',
        status: acc.account_status === 1 ? 'active' : 'inactive'
      }));
    } catch (error: any) {
      const errDetail = error?.response?.data?.error || error?.response?.data || error.message;
      console.error('[Meta Ads] 계정 목록 조회 오류:', JSON.stringify(errDetail).slice(0, 500));
      return [];
    }
  }

  /**
   * 캠페인 목록 조회
   * GET /{ad_account_id}/campaigns
   */
  async getCampaigns(accessToken: string, accountId: string): Promise<AdCampaign[]> {
    console.log('[Meta Ads] 캠페인 조회, accountId:', accountId);

    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/${accountId}/campaigns`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time',
            limit: 100
          }
        }
      );

      const campaigns = response.data.data || [];
      console.log(`[Meta Ads] ${campaigns.length}개 캠페인 발견`);

      return campaigns.map((camp: any) => ({
        id: camp.id,
        name: camp.name || 'Unnamed Campaign',
        status: this.mapCampaignStatus(camp.status),
        objective: camp.objective || '',
        budget: {
          daily: camp.daily_budget ? parseInt(camp.daily_budget) / 100 : 0,
          total: camp.lifetime_budget ? parseInt(camp.lifetime_budget) / 100 : 0
        },
        startDate: camp.start_time ? camp.start_time.split('T')[0] : '',
        endDate: camp.stop_time ? camp.stop_time.split('T')[0] : ''
      }));
    } catch (error: any) {
      const errDetail = error?.response?.data?.error || error?.response?.data || error.message;
      console.error('[Meta Ads] 캠페인 조회 오류:', JSON.stringify(errDetail).slice(0, 500));
      return [];
    }
  }

  /**
   * 캠페인 메트릭 + 광고 계정 insights 모두 조회
   */
  async getMetrics(
    accessToken: string,
    accountId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<AdMetrics[]> {
    console.log('[Meta Ads] 메트릭 조회:', { accountId, campaignId, startDate, endDate });

    let metrics: AdMetrics[] = [];

    // 1. 캠페인 insights API 시도
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/${campaignId}/insights`,
        {
          params: {
            access_token: accessToken,
            time_range: JSON.stringify({ since: startDate, until: endDate }),
            time_increment: 1,
            fields: 'impressions,clicks,spend',
            level: 'campaign',
            limit: 500
          }
        }
      );
      if (response.data.error) {
        console.error('[Meta Ads][DEBUG] insights API error:', JSON.stringify(response.data.error, null, 2));
      }
      const results = response.data.data || [];
      if (results.length > 0) {
        console.log(`[Meta Ads] 캠페인 insights ${results.length}개 row 수신`);
        metrics = metrics.concat(results.map((row: any) => ({
          campaignId,
          date: row.date_start || startDate,
          impressions: parseInt(row.impressions || '0'),
          clicks: parseInt(row.clicks || '0'),
          conversions: 0,
          cost: parseFloat(row.spend || '0'),
          revenue: 0,
          ctr: 0,
          cpc: 0,
          roas: 0
        })));
      }
    } catch (error: any) {
      console.error('[Meta Ads] 캠페인 insights API 오류:', error?.response?.data || error.message);
    }

    // 2. 광고 계정 insights API
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/${accountId}/insights`,
        {
          params: {
            access_token: accessToken,
            time_range: JSON.stringify({ since: startDate, until: endDate }),
            time_increment: 1,
            fields: 'impressions,clicks,spend',
            level: 'account',
            limit: 500
          }
        }
      );
      if (response.data.error) {
        console.error('[Meta Ads][DEBUG] account insights API error:', JSON.stringify(response.data.error, null, 2));
      }
      const results = response.data.data || [];
      if (results.length > 0) {
        console.log(`[Meta Ads] 광고 계정 insights ${results.length}개 row 수신`);
        metrics = metrics.concat(results.map((row: any) => ({
          campaignId: `meta_account_${accountId}`,
          date: row.date_start || startDate,
          impressions: parseInt(row.impressions || '0'),
          clicks: parseInt(row.clicks || '0'),
          conversions: 0,
          cost: parseFloat(row.spend || '0'),
          revenue: 0,
          ctr: 0,
          cpc: 0,
          roas: 0
        })));
      }
    } catch (error: any) {
      console.error('[Meta Ads] 광고 계정 insights API 오류:', error?.response?.data || error.message);
    }

    // 3. 둘 다 누적 반환
    return metrics;
  }

  /**
   * actions 배열에서 전환 수 추출
   * Meta는 전환을 actions[] 배열에 action_type별로 분류
   */
  private extractConversions(actions: any[] | undefined): number {
    if (!actions || !Array.isArray(actions)) return 0;

    // 전환으로 카운트할 action_type 목록
    const conversionTypes = [
      'purchase',
      'lead',
      'complete_registration',
      'add_to_cart',
      'initiate_checkout',
      'offsite_conversion.fb_pixel_purchase',
      'offsite_conversion.fb_pixel_lead',
      'onsite_conversion.messaging_conversation_started_7d'
    ];

    let total = 0;
    for (const action of actions) {
      if (conversionTypes.includes(action.action_type)) {
        total += parseInt(action.value || '0');
      }
    }
    return total;
  }

  /**
   * actions + ROAS에서 매출 추출
   */
  private extractRevenue(actions: any[] | undefined, purchaseRoas: any[] | undefined): number {
    // purchase_roas가 있으면 사용
    if (purchaseRoas && Array.isArray(purchaseRoas) && purchaseRoas.length > 0) {
      const roas = parseFloat(purchaseRoas[0].value || '0');
      // roas 값 자체가 반환되므로 spend * roas로 계산 필요 → 여기서는 action_values 사용
    }

    // action_values에서 purchase 금액 추출 시도
    if (actions && Array.isArray(actions)) {
      const purchaseAction = actions.find(
        (a: any) => a.action_type === 'purchase' || 
                     a.action_type === 'offsite_conversion.fb_pixel_purchase'
      );
      if (purchaseAction && purchaseAction.value) {
        return parseFloat(purchaseAction.value);
      }
    }

    return 0;
  }

  /**
   * 캠페인 상태 매핑
   */
  private mapCampaignStatus(status: string): 'active' | 'paused' | 'completed' | 'draft' {
    switch (status) {
      case 'ACTIVE': return 'active';
      case 'PAUSED': return 'paused';
      case 'DELETED':
      case 'ARCHIVED': return 'completed';
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
    console.log('[Meta Ads] 캠페인 생성 (미구현):', campaign.name);
    return {
      id: `meta-camp-${Date.now()}`,
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
export const metaAdsService = new MetaAdsService();
