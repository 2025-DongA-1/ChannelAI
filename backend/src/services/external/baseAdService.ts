/**
 * 외부 광고 플랫폼 API 공통 인터페이스
 * 실제 API로 교체 시 이 인터페이스를 구현하면 됩니다
 */

export interface AdAccount {
  id: string;
  name: string;
  currency?: string;
  timezone?: string;
  status?: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  objective?: string;
  budget?: {
    daily?: number;
    total?: number;
  };
  startDate?: string;
  endDate?: string;
}

export interface AdMetrics {
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue?: number;
  ctr?: number;
  cpc?: number;
  roas?: number;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * 모든 광고 플랫폼 서비스가 구현해야 하는 기본 인터페이스
 */
export interface IAdService {
  /**
   * OAuth 인증 URL 생성
   */
  getAuthUrl(redirectUri: string, state: string): string;

  /**
   * OAuth 콜백 처리 및 토큰 교환
   */
  handleCallback(code: string, redirectUri: string): Promise<OAuthCredentials>;

  /**
   * 액세스 토큰 갱신
   */
  refreshAccessToken(refreshToken: string): Promise<OAuthCredentials>;

  /**
   * 연결된 광고 계정 목록 조회
   */
  getAccounts(accessToken: string): Promise<AdAccount[]>;

  /**
   * 특정 계정의 캠페인 목록 조회
   */
  getCampaigns(accessToken: string, accountId: string): Promise<AdCampaign[]>;

  /**
   * 캠페인 메트릭 조회
   */
  getMetrics(
    accessToken: string,
    accountId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<AdMetrics[]>;

  /**
   * 캠페인 생성 (선택사항)
   */
  createCampaign?(
    accessToken: string,
    accountId: string,
    campaign: Partial<AdCampaign>
  ): Promise<AdCampaign>;

  /**
   * 캠페인 수정 (선택사항)
   */
  updateCampaign?(
    accessToken: string,
    accountId: string,
    campaignId: string,
    updates: Partial<AdCampaign>
  ): Promise<AdCampaign>;
}

/**
 * 공통 유틸리티
 */
export class AdServiceUtils {
  /**
   * 날짜 문자열을 YYYY-MM-DD 형식으로 변환
   */
  static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  /**
   * 랜덤 메트릭 생성 (Mock 데이터용)
   */
  static generateMockMetrics(campaignId: string, date: string): AdMetrics {
    const impressions = Math.floor(Math.random() * 50000) + 10000;
    const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
    const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02));
    const cost = Math.floor(clicks * (Math.random() * 500 + 200));
    const revenue = Math.floor(conversions * (Math.random() * 50000 + 30000));

    return {
      campaignId,
      date,
      impressions,
      clicks,
      conversions,
      cost,
      revenue,
      ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
      cpc: parseFloat((cost / clicks).toFixed(2)),
      roas: cost > 0 ? parseFloat((revenue / cost).toFixed(2)) : 0
    };
  }

  /**
   * 날짜 범위 생성
   */
  static getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    while (start <= end) {
      dates.push(this.formatDate(start));
      start.setDate(start.getDate() + 1);
    }

    return dates;
  }
}
