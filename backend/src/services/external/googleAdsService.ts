import {
  IAdService,
  AdAccount,
  AdCampaign,
  AdMetrics,
  OAuthCredentials,
  AdServiceUtils
} from './baseAdService';

/**
 * Google Ads API Mock 서비스
 * 
 * 실제 API로 교체 시:
 * 1. google-ads-api npm 패키지 설치
 * 2. OAuth2 클라이언트 설정
 * 3. 이 클래스의 메서드 내용만 실제 API 호출로 변경
 */
export class GoogleAdsService implements IAdService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly developerToken: string;

  constructor() {
    // 환경 변수에서 실제 값 로드 (현재는 Mock)
    this.clientId = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'mock-google-secret';
    this.developerToken = process.env.GOOGLE_DEVELOPER_TOKEN || 'mock-developer-token';
  }

  /**
   * OAuth 인증 URL 생성
   * 실제: https://accounts.google.com/o/oauth2/v2/auth
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
   * OAuth 콜백 처리
   * Mock: 더미 토큰 반환
   * 실제: Google OAuth2 토큰 교환 API 호출
   */
  async handleCallback(code: string, redirectUri: string): Promise<OAuthCredentials> {
    console.log('[Google Ads Mock] OAuth callback:', { code, redirectUri });

    // Mock 구현: 더미 토큰 반환
    return {
      accessToken: `google_mock_access_${Date.now()}`,
      refreshToken: `google_mock_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000) // 1시간 후
    };

    /* 실제 구현 예시:
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
    */
  }

  /**
   * 액세스 토큰 갱신
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthCredentials> {
    console.log('[Google Ads Mock] Refresh token:', refreshToken);

    // Mock 구현
    return {
      accessToken: `google_mock_access_${Date.now()}`,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000)
    };

    /* 실제 구현:
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
    */
  }

  /**
   * 광고 계정 목록 조회
   * Mock: 더미 계정 2개 반환
   * 실제: Google Ads API customers.listAccessibleCustomers 호출
   */
  async getAccounts(accessToken: string): Promise<AdAccount[]> {
    console.log('[Google Ads Mock] Get accounts');

    // Mock 데이터
    return [
      {
        id: '123-456-7890',
        name: 'Google Ads 메인 계정',
        currency: 'KRW',
        timezone: 'Asia/Seoul',
        status: 'active'
      },
      {
        id: '987-654-3210',
        name: 'Google Ads 테스트 계정',
        currency: 'KRW',
        timezone: 'Asia/Seoul',
        status: 'active'
      }
    ];

    /* 실제 구현:
    const customer = new GoogleAdsApi({ 
      client_id: this.clientId,
      client_secret: this.clientSecret,
      developer_token: this.developerToken
    });
    
    customer.setCredentials({ access_token: accessToken });
    const accounts = await customer.listAccessibleCustomers();
    return accounts.map(acc => ({
      id: acc.resource_name,
      name: acc.descriptive_name,
      currency: acc.currency_code,
      timezone: acc.time_zone
    }));
    */
  }

  /**
   * 캠페인 목록 조회
   * Mock: 더미 캠페인 3개 반환
   */
  async getCampaigns(accessToken: string, accountId: string): Promise<AdCampaign[]> {
    console.log('[Google Ads Mock] Get campaigns:', accountId);

    // Mock 데이터
    return [
      {
        id: 'ggl-camp-001',
        name: 'Google 검색광고 - 브랜드',
        status: 'active',
        objective: 'SEARCH',
        budget: {
          daily: 100000,
          total: 3000000
        },
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      {
        id: 'ggl-camp-002',
        name: 'YouTube 동영상 광고',
        status: 'active',
        objective: 'VIDEO',
        budget: {
          daily: 150000,
          total: 5000000
        },
        startDate: '2024-02-01',
        endDate: '2024-12-31'
      },
      {
        id: 'ggl-camp-003',
        name: 'Display 광고 - 리타게팅',
        status: 'paused',
        objective: 'DISPLAY',
        budget: {
          daily: 80000,
          total: 2000000
        },
        startDate: '2024-01-15',
        endDate: '2024-06-30'
      }
    ];

    /* 실제 구현:
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status.toLowerCase(),
      objective: row.campaign.advertising_channel_type,
      budget: {
        daily: row.campaign_budget.amount_micros / 1000000
      }
    }));
    */
  }

  /**
   * 캠페인 메트릭 조회
   * Mock: 날짜별 더미 메트릭 생성
   */
  async getMetrics(
    accessToken: string,
    accountId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<AdMetrics[]> {
    console.log('[Google Ads Mock] Get metrics:', { accountId, campaignId, startDate, endDate });

    // Mock: 날짜 범위의 각 날짜별 메트릭 생성
    const dates = AdServiceUtils.getDateRange(startDate, endDate);
    return dates.map(date => AdServiceUtils.generateMockMetrics(campaignId, date));

    /* 실제 구현:
    const query = `
      SELECT 
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.id = '${campaignId}'
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      campaignId,
      date: row.segments.date,
      impressions: row.metrics.impressions,
      clicks: row.metrics.clicks,
      conversions: row.metrics.conversions,
      cost: row.metrics.cost_micros / 1000000,
      revenue: row.metrics.conversions_value
    }));
    */
  }

  /**
   * 캠페인 생성 (선택사항)
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaign: Partial<AdCampaign>
  ): Promise<AdCampaign> {
    console.log('[Google Ads Mock] Create campaign:', campaign);

    // Mock: 생성된 캠페인 반환
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
