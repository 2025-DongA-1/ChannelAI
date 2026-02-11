import axios from 'axios';
import { IAdService, AdCampaign, AdMetrics } from './baseAdService';

// 당근마켓 전용 타입 정의
export interface KarrotCampaign extends AdCampaign {
  targeting?: {
    regions?: string[];
    ageRange?: { min: number; max: number };
    interests?: string[];
  };
}

export interface KarrotMetrics extends AdMetrics {
  cpa?: number;
}

/**
 * 당근마켓 광고 비즈니스 서비스
 * 지역 기반 타겟팅 및 커뮤니티 마케팅 플랫폼
 */
export class KarrotAdsService implements IAdService {
  private accessToken: string;
  private apiBaseUrl: string = 'https://api.daangn.com/v1';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * 당근마켓 API 인증 헤더
   */
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * OAuth URL 생성
   */
  getAuthUrl(redirectUri: string, state: string): string {
    return `https://business.daangn.com/oauth/authorize?client_id=${process.env.KARROT_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}&response_type=code`;
  }

  /**
   * OAuth 콜백 처리 및 토큰 교환
   */
  async handleCallback(code: string, redirectUri: string): Promise<any> {
    // Mock 구현
    return {
      accessToken: `karrot_token_${Date.now()}`,
      refreshToken: `karrot_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  /**
   * 액세스 토큰 갱신
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    // Mock 구현
    return {
      accessToken: `karrot_token_${Date.now()}`,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  /**
   * 계정 정보 조회
   */
  async getAccounts(accessToken: string): Promise<any[]> {
    // Mock 구현
    return [{ id: 'karrot_acc_001', name: '당근마켓 비즈니스 계정' }];
  }

  /**
   * 캠페인 목록 조회
   */
  async getCampaigns(accessToken: string, accountId: string): Promise<KarrotCampaign[]> {
    try {
      // Mock 데이터 (실제 API 구현 시 교체)
      const mockCampaigns: KarrotCampaign[] = [
        {
          id: `karrot_campaign_${Date.now()}_1`,
          name: '강남구 중고거래 프로모션',
          status: 'active' as const,
          objective: 'LOCAL_AWARENESS',
          budget: {
            daily: 50000,
            total: 1500000,
          },
          startDate: new Date('2025-12-01').toISOString(),
          endDate: new Date('2026-01-31').toISOString(),
          targeting: {
            regions: ['서울 강남구', '서울 서초구'],
            ageRange: { min: 20, max: 50 },
            interests: ['중고거래', '생활/가전', '패션의류'],
          },
        },
        {
          id: `karrot_campaign_${Date.now()}_2`,
          name: '부산 해운대 동네가게 홍보',
          status: 'active' as const,
          objective: 'STORE_VISITS',
          budget: {
            daily: 30000,
            total: 900000,
          },
          startDate: new Date('2025-12-15').toISOString(),
          endDate: new Date('2026-02-15').toISOString(),
          targeting: {
            regions: ['부산 해운대구', '부산 수영구'],
            ageRange: { min: 25, max: 60 },
            interests: ['동네소식', '맛집', '생활서비스'],
          },
        },
      ];

      return mockCampaigns;
    } catch (error) {
      console.error('당근마켓 캠페인 조회 실패:', error);
      throw new Error('당근마켓 캠페인을 가져올 수 없습니다.');
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
  ): Promise<KarrotMetrics[]> {
    try {
      // Mock 데이터 (실제 API 구현 시 교체)
      const metrics: KarrotMetrics[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // 지역 기반 플랫폼 특성 반영 (높은 전환율, 낮은 CPC)
        const impressions = Math.floor(Math.random() * 15000) + 8000;
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.03)); // CTR 3-8%
        const conversions = Math.floor(clicks * (Math.random() * 0.15 + 0.10)); // CVR 10-25%
        const cost = clicks * (Math.random() * 200 + 100); // CPC 100-300원
        const revenue = conversions * (Math.random() * 15000 + 10000); // 객단가 1-2.5만원

        metrics.push({
          campaignId,
          date: new Date(d).toISOString().split('T')[0],
          impressions,
          clicks,
          conversions,
          cost,
          revenue,
          ctr: (clicks / impressions) * 100,
          cpc: cost / clicks,
          cpa: cost / conversions,
          roas: revenue / cost,
        });
      }

      return metrics;
    } catch (error) {
      console.error('당근마켓 메트릭 조회 실패:', error);
      throw new Error('당근마켓 메트릭을 가져올 수 없습니다.');
    }
  }

  /**
   * 캠페인 생성
   */
  async createCampaign(
    accessToken: string,
    accountId: string,
    campaignData: Partial<AdCampaign>
  ): Promise<KarrotCampaign> {
    try {
      // Mock 구현
      const newCampaign: KarrotCampaign = {
        id: `karrot_campaign_${Date.now()}`,
        name: campaignData.name || '새 당근마켓 캠페인',
        status: (campaignData.status || 'paused') as 'active' | 'paused' | 'completed' | 'draft',
        objective: campaignData.objective || 'LOCAL_AWARENESS',
        budget: {
          daily: campaignData.budget?.daily || 30000,
          total: campaignData.budget?.total,
        },
        startDate: campaignData.startDate || new Date().toISOString(),
        endDate: campaignData.endDate,
        targeting: {
          regions: ['서울 전체'],
          ageRange: { min: 20, max: 60 },
          interests: ['동네생활'],
        },
      };

      console.log('당근마켓 캠페인 생성:', newCampaign);
      return newCampaign;
    } catch (error) {
      console.error('당근마켓 캠페인 생성 실패:', error);
      throw new Error('당근마켓 캠페인을 생성할 수 없습니다.');
    }
  }

  /**
   * 캠페인 수정
   */
  async updateCampaign(
    accessToken: string,
    accountId: string,
    campaignId: string,
    updates: Partial<AdCampaign>
  ): Promise<KarrotCampaign> {
    try {
      // Mock 구현
      console.log(`당근마켓 캠페인 수정: ${campaignId}`, updates);
      
      const updatedCampaign: KarrotCampaign = {
        id: campaignId,
        name: updates.name || '수정된 캠페인',
        status: (updates.status || 'active') as 'active' | 'paused' | 'completed' | 'draft',
        objective: updates.objective || 'LOCAL_AWARENESS',
        budget: updates.budget || { daily: 30000 },
        startDate: updates.startDate || new Date().toISOString(),
        endDate: updates.endDate,
      };

      return updatedCampaign;
    } catch (error) {
      console.error('당근마켓 캠페인 수정 실패:', error);
      throw new Error('당근마켓 캠페인을 수정할 수 없습니다.');
    }
  }

  /**
   * 캠페인 삭제
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      // Mock 구현
      console.log(`당근마켓 캠페인 삭제: ${campaignId}`);
    } catch (error) {
      console.error('당근마켓 캠페인 삭제 실패:', error);
      throw new Error('당근마켓 캠페인을 삭제할 수 없습니다.');
    }
  }

  /**
   * 지역별 성과 분석 (당근마켓 특화 기능)
   */
  async getRegionalPerformance(campaignId: string): Promise<any[]> {
    try {
      // Mock 데이터
      const regions = [
        { region: '서울 강남구', impressions: 25000, clicks: 1200, conversions: 180, cost: 240000 },
        { region: '서울 서초구', impressions: 18000, clicks: 900, conversions: 135, cost: 180000 },
        { region: '서울 송파구', impressions: 22000, clicks: 1100, conversions: 165, cost: 220000 },
        { region: '부산 해운대구', impressions: 15000, clicks: 750, conversions: 112, cost: 150000 },
      ];

      return regions.map(r => ({
        ...r,
        ctr: (r.clicks / r.impressions) * 100,
        cvr: (r.conversions / r.clicks) * 100,
        cpc: r.cost / r.clicks,
      }));
    } catch (error) {
      console.error('지역별 성과 조회 실패:', error);
      throw new Error('지역별 성과를 가져올 수 없습니다.');
    }
  }

  /**
   * 동네생활 카테고리별 성과 (당근마켓 특화 기능)
   */
  async getCategoryPerformance(campaignId: string): Promise<any[]> {
    try {
      // Mock 데이터
      return [
        { category: '중고거래', impressions: 35000, clicks: 1750, conversions: 262 },
        { category: '동네가게', impressions: 28000, clicks: 1400, conversions: 210 },
        { category: '동네소식', impressions: 22000, clicks: 1100, conversions: 165 },
        { category: '알바', impressions: 18000, clicks: 900, conversions: 135 },
      ];
    } catch (error) {
      console.error('카테고리별 성과 조회 실패:', error);
      throw new Error('카테고리별 성과를 가져올 수 없습니다.');
    }
  }
}

export default KarrotAdsService;
