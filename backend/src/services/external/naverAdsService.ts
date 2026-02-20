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
/**
 * access_token 컬럼에 저장되는 Naver API 인증 정보 구조
 * OAuth가 아닌 API Key 방식을 사용하므로 JSON으로 저장
 */
export interface NaverApiCredentials {
  type: 'api_key';
  apiKey: string;
  secretKey: string;
}

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
   * access_token(JSON) + external_account_id에서 사용자별 인증 정보 추출
   * - access_token이 JSON이면 파싱하여 apiKey/secretKey 추출
   * - 아니면 .env 기본값 사용 (개발/테스트용)
   * - accountId(=external_account_id)는 Naver customerId로 사용
   */
  private extractCredentials(accessToken?: string, accountId?: string): {
    apiKey: string; secretKey: string; customerId: string;
  } {
    try {
      if (accessToken && accessToken.trim().startsWith('{')) {
        const parsed: NaverApiCredentials = JSON.parse(accessToken);
        return {
          apiKey: parsed.apiKey || this.apiKey,
          secretKey: parsed.secretKey || this.secretKey,
          customerId: accountId || this.customerId
        };
      }
    } catch { /* JSON 파싱 실패 시 기본값 사용 */ }
    return {
      apiKey: this.apiKey,
      secretKey: this.secretKey,
      customerId: accountId || this.customerId
    };
  }

  /**
   * API 자격증명 유효성 검증 (연동 시 사용)
   * campaigns 목록 조회를 시도하여 인증 확인
   */
  async validateCredentials(apiKey: string, secretKey: string, customerId: string): Promise<{ valid: boolean; campaignCount: number }> {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const method = 'GET';
    const path = '/ncc/campaigns';
    const message = `${timestamp}.${method}.${path}`;
    const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64');

    const response = await axios.get(`${this.baseUrl}${path}`, {
      headers: {
        'X-API-KEY': apiKey,
        'X-Customer': customerId,
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature
      }
    });

    return {
      valid: true,
      campaignCount: Array.isArray(response.data) ? response.data.length : 0
    };
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
    const creds = this.extractCredentials(accessToken);
    console.log('[Naver Ads] Get accounts, customerId:', creds.customerId);

    // Naver는 Customer ID가 계정당 하나로 고정
    return [
      {
        id: creds.customerId,
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
      const creds = this.extractCredentials(accessToken, accountId);
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp, 'GET', '/ncc/campaigns', creds.secretKey);

      const response = await axios.get(
        `${this.baseUrl}/ncc/campaigns`,
        {
          headers: {
            'X-API-KEY': creds.apiKey,
            'X-Customer': creds.customerId,
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
    } catch (error: any) {
      const errDetail = error?.response?.data || error.message;
      console.error('[Naver Ads] Get campaigns error:', errDetail);
      // API 오류 시 빈 배열 반환 (mock 데이터 대신)
      return [];
    }
  }

  /**
   * 캠페인 메트릭 조회 (실제 네이버 검색광고 Stats API)
   * 
   * 네이버 검색광고 API는 비동기 리포트 방식:
   *   1. POST /stat-reports → 리포트 생성 요청
   *   2. GET /stat-reports/{jobId} → 상태 확인 (RUNNING → BUILT)
   *   3. GET /stat-reports/{jobId}/download → TSV 다운로드
   */
  async getMetrics(
    accessToken: string,
    accountId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<AdMetrics[]> {
    console.log('[Naver Ads] 메트릭 조회 시작:', { campaignId, startDate, endDate });

    try {
      const creds = this.extractCredentials(accessToken, accountId);

      // 1단계: 통계 리포트 생성 요청
      const reportBody = {
        reportTp: 'CAMPAIGN_CONVERSION_DETAIL',
        statDt: startDate.replace(/-/g, ''),
        endDt: endDate.replace(/-/g, ''),
        statIds: [campaignId],
        reportFileType: 'TSV',
        reportFields: ['impCnt', 'clkCnt', 'salesAmt', 'convCnt', 'revenueAmt', 'viewCnt']
      };

      const createTimestamp = Date.now();
      const createSignature = this.generateSignature(createTimestamp, 'POST', '/stat-reports', creds.secretKey);

      const createResponse = await axios.post(
        `${this.baseUrl}/stat-reports`,
        reportBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': creds.apiKey,
            'X-Customer': creds.customerId,
            'X-Timestamp': createTimestamp.toString(),
            'X-Signature': createSignature
          }
        }
      );

      const reportJobId = createResponse.data?.reportJobId;
      if (!reportJobId) {
        console.warn('[Naver Ads] 리포트 생성 실패 - jobId 없음:', createResponse.data);
        return this.getMetricsFallback(campaignId, startDate, endDate);
      }

      console.log('[Naver Ads] 리포트 생성 요청 완료, jobId:', reportJobId);

      // 2단계: 리포트 빌드 완료 대기 (최대 30초, 2초 간격 폴링)
      let reportReady = false;
      let downloadUrl = '';

      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const pollTimestamp = Date.now();
        const pollSignature = this.generateSignature(pollTimestamp, 'GET', `/stat-reports/${reportJobId}`, creds.secretKey);

        const statusResponse = await axios.get(
          `${this.baseUrl}/stat-reports/${reportJobId}`,
          {
            headers: {
              'X-API-KEY': creds.apiKey,
              'X-Customer': creds.customerId,
              'X-Timestamp': pollTimestamp.toString(),
              'X-Signature': pollSignature
            }
          }
        );

        const status = statusResponse.data?.status;
        console.log(`[Naver Ads] 리포트 상태 (${i + 1}/15):`, status);

        if (status === 'BUILT') {
          reportReady = true;
          downloadUrl = statusResponse.data?.downloadUrl || '';
          break;
        } else if (status === 'REGIST' || status === 'RUNNING') {
          continue;
        } else {
          // ERROR 등
          console.warn('[Naver Ads] 리포트 빌드 실패:', statusResponse.data);
          return this.getMetricsFallback(campaignId, startDate, endDate);
        }
      }

      if (!reportReady) {
        console.warn('[Naver Ads] 리포트 빌드 타임아웃');
        return this.getMetricsFallback(campaignId, startDate, endDate);
      }

      // 3단계: TSV 다운로드 및 파싱
      const dlTimestamp = Date.now();
      const dlPath = downloadUrl || `/stat-reports/${reportJobId}/download`;
      const dlSignature = this.generateSignature(dlTimestamp, 'GET', dlPath, creds.secretKey);

      const downloadResponse = await axios.get(
        `${this.baseUrl}${dlPath}`,
        {
          headers: {
            'X-API-KEY': creds.apiKey,
            'X-Customer': creds.customerId,
            'X-Timestamp': dlTimestamp.toString(),
            'X-Signature': dlSignature
          },
          responseType: 'text'
        }
      );

      const metrics = this.parseTsvReport(campaignId, downloadResponse.data);
      console.log(`[Naver Ads] 메트릭 파싱 완료: ${metrics.length}건`);
      return metrics;

    } catch (error: any) {
      const errMsg = error?.response?.data || error.message;
      console.error('[Naver Ads] 메트릭 조회 오류:', errMsg);

      // API 오류 시 빈 배열 반환 (광고 미집행 등)
      return this.getMetricsFallback(campaignId, startDate, endDate);
    }
  }

  /**
   * TSV 리포트 파싱
   */
  private parseTsvReport(campaignId: string, tsvData: string): AdMetrics[] {
    const lines = tsvData.trim().split('\n');
    if (lines.length < 2) return []; // 헤더 + 데이터 최소 2줄

    const headers = lines[0].split('\t').map(h => h.trim());
    const metrics: AdMetrics[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || '0'; });

      const impressions = parseInt(row['impCnt'] || '0', 10);
      const clicks = parseInt(row['clkCnt'] || '0', 10);
      const cost = parseInt(row['salesAmt'] || '0', 10);
      const conversions = parseInt(row['convCnt'] || '0', 10);
      const revenue = parseInt(row['revenueAmt'] || '0', 10);

      // 날짜 컬럼: statDt 또는 날짜 형식 찾기
      const date = row['statDt'] || row['날짜'] || row['date'] || '';
      const formattedDate = date.length === 8
        ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
        : date;

      metrics.push({
        campaignId,
        date: formattedDate,
        impressions,
        clicks,
        conversions,
        cost,
        revenue,
        ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
        cpc: clicks > 0 ? Math.round(cost / clicks) : 0,
        roas: cost > 0 ? parseFloat((revenue / cost).toFixed(2)) : 0
      });
    }

    return metrics;
  }

  /**
   * API 실패 시 대체 처리 (광고 미집행 또는 API 오류)
   */
  private getMetricsFallback(campaignId: string, startDate: string, endDate: string): AdMetrics[] {
    console.log('[Naver Ads] 실적 데이터 없음 - 광고가 아직 집행되지 않았거나 API 오류입니다.');
    return [];
  }

  /**
   * API 서명 생성 (Naver 검색광고 API 인증용)
   */
  private generateSignature(timestamp: number, method: string, path: string, secretKey?: string): string {
    const crypto = require('crypto');
    const message = `${timestamp}.${method}.${path}`;
    const signature = crypto
      .createHmac('sha256', secretKey || this.secretKey)
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
