import {
  IAdService,
  AdAccount,
  AdCampaign,
  AdMetrics,
  OAuthCredentials,
  AdServiceUtils
} from './baseAdService';

/**
 * Meta (Facebook/Instagram) Ads API Mock 서비스
 * 
 * 실제 API로 교체 시:
 * 1. Facebook Marketing API SDK 설치
 * 2. App ID/Secret 설정
 * 3. Business Manager 계정 연동
 */
export class MetaAdsService implements IAdService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly apiVersion: string;

  constructor() {
    this.appId = process.env.META_APP_ID || 'mock-meta-app-id';
    this.appSecret = process.env.META_APP_SECRET || 'mock-meta-secret';
    this.apiVersion = process.env.META_API_VERSION || 'v18.0';
  }

  /**
   * Facebook OAuth URL 생성
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state,
      scope: 'ads_read,ads_management,business_management'
    });

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * OAuth 콜백 처리
   */
  async handleCallback(code: string, redirectUri: string): Promise<OAuthCredentials> {
    console.log('[Meta Ads Mock] OAuth callback:', { code, redirectUri });

    // Mock 구현
    return {
      accessToken: `meta_mock_access_${Date.now()}`,
      refreshToken: `meta_mock_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 5184000 * 1000) // 60일 후
    };

    /* 실제 구현:
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`,
      {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: redirectUri,
          code
        }
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: '', // Meta는 장기 토큰 사용
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
    */
  }

  /**
   * 토큰 갱신
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthCredentials> {
    console.log('[Meta Ads Mock] Refresh token');

    // Mock 구현
    return {
      accessToken: `meta_mock_access_${Date.now()}`,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 5184000 * 1000)
    };
  }

  /**
   * 광고 계정 목록 조회
   */
  async getAccounts(accessToken: string): Promise<AdAccount[]> {
    console.log('[Meta Ads Mock] Get accounts');

    // Mock 데이터
    return [
      {
        id: 'act_1234567890',
        name: 'Facebook 광고 계정',
        currency: 'KRW',
        timezone: 'Asia/Seoul',
        status: 'active'
      },
      {
        id: 'act_0987654321',
        name: 'Instagram 광고 계정',
        currency: 'KRW',
        timezone: 'Asia/Seoul',
        status: 'active'
      }
    ];

    /* 실제 구현:
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/me/adaccounts`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,currency,timezone_name,account_status'
        }
      }
    );

    return response.data.data.map(acc => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      timezone: acc.timezone_name,
      status: acc.account_status === 1 ? 'active' : 'inactive'
    }));
    */
  }

  /**
   * 캠페인 목록 조회
   */
  async getCampaigns(accessToken: string, accountId: string): Promise<AdCampaign[]> {
    console.log('[Meta Ads Mock] Get campaigns:', accountId);

    // Mock 데이터
    return [
      {
        id: 'meta-camp-001',
        name: 'Facebook 브랜드 인지도',
        status: 'active',
        objective: 'BRAND_AWARENESS',
        budget: {
          daily: 200000,
          total: 6000000
        },
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      {
        id: 'meta-camp-002',
        name: 'Instagram 리드 생성',
        status: 'active',
        objective: 'LEAD_GENERATION',
        budget: {
          daily: 150000,
          total: 4500000
        },
        startDate: '2024-02-01',
        endDate: '2024-12-31'
      },
      {
        id: 'meta-camp-003',
        name: 'Facebook 전환 캠페인',
        status: 'paused',
        objective: 'CONVERSIONS',
        budget: {
          daily: 100000,
          total: 3000000
        },
        startDate: '2024-01-15',
        endDate: '2024-06-30'
      }
    ];

    /* 실제 구현:
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/${accountId}/campaigns`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time'
        }
      }
    );

    return response.data.data.map(camp => ({
      id: camp.id,
      name: camp.name,
      status: camp.status.toLowerCase(),
      objective: camp.objective,
      budget: {
        daily: camp.daily_budget ? camp.daily_budget / 100 : undefined,
        total: camp.lifetime_budget ? camp.lifetime_budget / 100 : undefined
      },
      startDate: camp.start_time,
      endDate: camp.stop_time
    }));
    */
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
    console.log('[Meta Ads Mock] Get metrics:', { accountId, campaignId, startDate, endDate });

    // Mock: 날짜별 메트릭 생성
    const dates = AdServiceUtils.getDateRange(startDate, endDate);
    return dates.map(date => AdServiceUtils.generateMockMetrics(campaignId, date));

    /* 실제 구현:
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/${campaignId}/insights`,
      {
        params: {
          access_token: accessToken,
          time_range: JSON.stringify({ since: startDate, until: endDate }),
          time_increment: 1,
          fields: 'impressions,clicks,actions,spend,purchase_roas',
          level: 'campaign'
        }
      }
    );

    return response.data.data.map(row => {
      const conversions = row.actions?.find(a => a.action_type === 'purchase')?.value || 0;
      const revenue = row.actions?.find(a => a.action_type === 'purchase')?.value * 
                      (row.purchase_roas?.[0]?.value || 0);

      return {
        campaignId,
        date: row.date_start,
        impressions: parseInt(row.impressions),
        clicks: parseInt(row.clicks),
        conversions: parseFloat(conversions),
        cost: parseFloat(row.spend),
        revenue: revenue
      };
    });
    */
  }

  /**
   * 캠페인 생성
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaign: Partial<AdCampaign>
  ): Promise<AdCampaign> {
    console.log('[Meta Ads Mock] Create campaign:', campaign);

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
