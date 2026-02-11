# 외부 마케팅 API 연동 가이드

## 개요
멀티채널 마케팅 최적화 서비스를 위한 주요 광고 플랫폼 API 연동 방법

## 1. Google Ads API

### 1.1 API 설정
```bash
# 필요한 패키지
npm install google-ads-api
# 또는
pip install google-ads
```

### 1.2 인증 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성
3. Google Ads API 활성화
4. OAuth 2.0 클라이언트 ID 생성
5. Developer Token 발급 (Google Ads 계정에서)

**필요한 정보:**
- Developer Token
- Client ID
- Client Secret
- Refresh Token

### 1.3 구현 예시 (Node.js)
```javascript
// integrations/google-ads/client.js
const { GoogleAdsApi } = require('google-ads-api');

class GoogleAdsClient {
  constructor(credentials) {
    this.client = new GoogleAdsApi({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      developer_token: credentials.developerToken,
    });
    
    this.customer = this.client.Customer({
      customer_id: credentials.customerId,
      refresh_token: credentials.refreshToken,
    });
  }

  // 캠페인 목록 조회
  async getCampaigns() {
    const campaigns = await this.customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `);
    
    return campaigns;
  }

  // 캠페인 성과 조회
  async getCampaignPerformance(campaignId, dateFrom, dateTo) {
    const metrics = await this.customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    `);
    
    return this.formatMetrics(metrics);
  }

  formatMetrics(rawMetrics) {
    return rawMetrics.map(row => ({
      campaignId: row.campaign.id,
      campaignName: row.campaign.name,
      date: row.segments.date,
      impressions: row.metrics.impressions,
      clicks: row.metrics.clicks,
      cost: row.metrics.cost_micros / 1000000, // micros to actual currency
      conversions: row.metrics.conversions,
      revenue: row.metrics.conversions_value,
    }));
  }

  // 계정 정보 조회
  async getAccountInfo() {
    const account = await this.customer.query(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
    `);
    
    return account[0];
  }
}

module.exports = GoogleAdsClient;
```

### 1.4 데이터 수집 스케줄러
```javascript
// services/data-sync/google-ads-sync.js
const cron = require('node-cron');
const GoogleAdsClient = require('../integrations/google-ads/client');

class GoogleAdsSyncService {
  constructor(db) {
    this.db = db;
  }

  // 매일 자정에 전날 데이터 수집
  startDailySync() {
    cron.schedule('0 0 * * *', async () => {
      console.log('Starting Google Ads daily sync...');
      await this.syncAllAccounts();
    });
  }

  async syncAllAccounts() {
    // 모든 연결된 Google Ads 계정 조회
    const accounts = await this.db.query(`
      SELECT * FROM marketing_accounts
      WHERE platform = 'google_ads' AND is_connected = true
    `);

    for (const account of accounts) {
      try {
        await this.syncAccount(account);
      } catch (error) {
        console.error(`Failed to sync account ${account.id}:`, error);
        // 동기화 실패 로그 저장
        await this.logSyncError(account.id, error);
      }
    }
  }

  async syncAccount(account) {
    const client = new GoogleAdsClient({
      clientId: process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      customerId: account.account_id,
      refreshToken: account.refresh_token,
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // 캠페인 목록 동기화
    const campaigns = await client.getCampaigns();
    await this.saveCampaigns(account.id, campaigns);

    // 각 캠페인의 성과 데이터 동기화
    for (const campaign of campaigns) {
      const performance = await client.getCampaignPerformance(
        campaign.id,
        dateStr,
        dateStr
      );
      await this.savePerformanceData(campaign.id, performance);
    }
  }

  async saveCampaigns(accountId, campaigns) {
    for (const campaign of campaigns) {
      await this.db.query(`
        INSERT INTO campaigns (
          marketing_account_id, campaign_id, campaign_name,
          platform, status, daily_budget
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (marketing_account_id, campaign_id)
        DO UPDATE SET
          campaign_name = EXCLUDED.campaign_name,
          status = EXCLUDED.status,
          daily_budget = EXCLUDED.daily_budget,
          updated_at = CURRENT_TIMESTAMP
      `, [
        accountId,
        campaign.id,
        campaign.name,
        'google_ads',
        campaign.status,
        campaign.budget / 1000000
      ]);
    }
  }

  async savePerformanceData(campaignId, performanceData) {
    // 데이터베이스에 성과 데이터 저장 로직
  }
}

module.exports = GoogleAdsSyncService;
```

## 2. Meta Ads (Facebook/Instagram) API

### 2.1 API 설정
```bash
npm install facebook-nodejs-business-sdk
# 또는
pip install facebook-business
```

### 2.2 인증 설정
1. [Meta for Developers](https://developers.facebook.com/) 접속
2. 앱 생성
3. Marketing API 권한 추가
4. 비즈니스 관리자 연동

**필요한 정보:**
- App ID
- App Secret
- Access Token (User Access Token 또는 System User Token)

### 2.3 구현 예시 (Node.js)
```javascript
// integrations/meta-ads/client.js
const bizSdk = require('facebook-nodejs-business-sdk');

class MetaAdsClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    bizSdk.FacebookAdsApi.init(accessToken);
    this.api = bizSdk.FacebookAdsApi.getDefaultApi();
  }

  // 광고 계정 목록 조회
  async getAdAccounts(businessId) {
    const business = new bizSdk.Business(businessId);
    const accounts = await business.getOwnedAdAccounts([
      'id',
      'name',
      'currency',
      'timezone_name',
      'account_status',
    ]);
    
    return accounts;
  }

  // 캠페인 목록 조회
  async getCampaigns(adAccountId) {
    const account = new bizSdk.AdAccount(`act_${adAccountId}`);
    const campaigns = await account.getCampaigns([
      'id',
      'name',
      'status',
      'objective',
      'daily_budget',
      'lifetime_budget',
    ]);
    
    return campaigns;
  }

  // 캠페인 인사이트 조회
  async getCampaignInsights(campaignId, dateFrom, dateTo) {
    const campaign = new bizSdk.Campaign(campaignId);
    const insights = await campaign.getInsights(
      [
        'campaign_id',
        'campaign_name',
        'impressions',
        'clicks',
        'spend',
        'reach',
        'frequency',
        'cpc',
        'cpm',
        'ctr',
        'actions', // 전환 데이터
        'action_values', // 전환 가치
      ],
      {
        time_range: {
          since: dateFrom,
          until: dateTo,
        },
        level: 'campaign',
        time_increment: 1, // 일별 데이터
      }
    );
    
    return this.formatInsights(insights);
  }

  formatInsights(rawInsights) {
    return rawInsights.map(insight => {
      // actions에서 전환 수 추출
      const conversions = this.extractConversions(insight.actions);
      const conversionValue = this.extractConversionValue(insight.action_values);

      return {
        campaignId: insight.campaign_id,
        campaignName: insight.campaign_name,
        date: insight.date_start,
        impressions: parseInt(insight.impressions) || 0,
        clicks: parseInt(insight.clicks) || 0,
        cost: parseFloat(insight.spend) || 0,
        reach: parseInt(insight.reach) || 0,
        cpc: parseFloat(insight.cpc) || 0,
        cpm: parseFloat(insight.cpm) || 0,
        ctr: parseFloat(insight.ctr) || 0,
        conversions: conversions,
        revenue: conversionValue,
      };
    });
  }

  extractConversions(actions) {
    if (!actions) return 0;
    const conversionAction = actions.find(
      a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion'
    );
    return conversionAction ? parseInt(conversionAction.value) : 0;
  }

  extractConversionValue(actionValues) {
    if (!actionValues) return 0;
    const valueAction = actionValues.find(
      a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion'
    );
    return valueAction ? parseFloat(valueAction.value) : 0;
  }
}

module.exports = MetaAdsClient;
```

## 3. 네이버 광고 API

### 3.1 API 설정
1. [네이버 광고 API 센터](https://naver.github.io/searchad-apidoc/) 접속
2. API 이용 신청
3. API 키 발급

**필요한 정보:**
- API Key
- Secret Key
- Customer ID

### 3.2 구현 예시 (Node.js)
```javascript
// integrations/naver-ads/client.js
const crypto = require('crypto');
const axios = require('axios');

class NaverAdsClient {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.secretKey = credentials.secretKey;
    this.customerId = credentials.customerId;
    this.baseUrl = 'https://api.naver.com';
  }

  // API 서명 생성
  generateSignature(method, url, timestamp) {
    const message = `${timestamp}.${method}.${url}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  // HTTP 요청
  async request(method, endpoint, data = null) {
    const timestamp = Date.now().toString();
    const url = `/ncc/${endpoint}`;
    const signature = this.generateSignature(method, url, timestamp);

    const headers = {
      'X-API-KEY': this.apiKey,
      'X-Customer': this.customerId,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${url}`,
        headers,
        data,
      });
      return response.data;
    } catch (error) {
      console.error('Naver Ads API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // 캠페인 목록 조회
  async getCampaigns() {
    return await this.request('GET', 'campaigns');
  }

  // 캠페인 통계 조회
  async getCampaignStats(campaignId, dateFrom, dateTo) {
    const endpoint = `stats`;
    const params = {
      ids: [campaignId],
      fields: [
        'impCnt', // 노출수
        'clkCnt', // 클릭수
        'salesAmt', // 비용
        'ctr',
        'cpc',
        'convAmt', // 전환수
        'rvnAmt', // 전환매출
      ],
      timeRange: {
        since: dateFrom,
        until: dateTo,
      },
      timeIncrement: 'daily',
    };

    const response = await this.request('GET', endpoint, params);
    return this.formatStats(response);
  }

  formatStats(rawStats) {
    return rawStats.map(stat => ({
      campaignId: stat.id,
      date: stat.date,
      impressions: stat.impCnt || 0,
      clicks: stat.clkCnt || 0,
      cost: stat.salesAmt || 0,
      ctr: stat.ctr || 0,
      cpc: stat.cpc || 0,
      conversions: stat.convAmt || 0,
      revenue: stat.rvnAmt || 0,
    }));
  }
}

module.exports = NaverAdsClient;
```

## 4. 데이터 수집 파이프라인

### 4.1 ETL 프로세스
```javascript
// services/data-pipeline/etl-service.js
class ETLService {
  constructor(db, clients) {
    this.db = db;
    this.clients = clients; // { google, meta, naver }
  }

  async extract(platform, account) {
    switch (platform) {
      case 'google_ads':
        return await this.clients.google.getCampaignPerformance(
          account.campaign_id,
          this.getYesterday(),
          this.getYesterday()
        );
      case 'meta_ads':
        return await this.clients.meta.getCampaignInsights(
          account.campaign_id,
          this.getYesterday(),
          this.getYesterday()
        );
      case 'naver_ads':
        return await this.clients.naver.getCampaignStats(
          account.campaign_id,
          this.getYesterday(),
          this.getYesterday()
        );
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async transform(rawData, platform) {
    // 플랫폼별 데이터를 공통 포맷으로 변환
    return {
      date: rawData.date,
      impressions: rawData.impressions || 0,
      clicks: rawData.clicks || 0,
      cost: rawData.cost || rawData.spend || 0,
      conversions: rawData.conversions || 0,
      revenue: rawData.revenue || 0,
      // 추가 지표 계산
      ctr: this.calculateCTR(rawData.clicks, rawData.impressions),
      cpc: this.calculateCPC(rawData.cost, rawData.clicks),
      roas: this.calculateROAS(rawData.revenue, rawData.cost),
    };
  }

  async load(transformedData, campaignId) {
    // 데이터베이스에 저장
    await this.db.query(`
      INSERT INTO campaign_metrics (
        campaign_id, date, impressions, clicks, cost,
        conversions, revenue, ctr, cpc, roas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (campaign_id, date, hour) DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        cost = EXCLUDED.cost,
        conversions = EXCLUDED.conversions,
        revenue = EXCLUDED.revenue,
        ctr = EXCLUDED.ctr,
        cpc = EXCLUDED.cpc,
        roas = EXCLUDED.roas,
        updated_at = CURRENT_TIMESTAMP
    `, [
      campaignId,
      transformedData.date,
      transformedData.impressions,
      transformedData.clicks,
      transformedData.cost,
      transformedData.conversions,
      transformedData.revenue,
      transformedData.ctr,
      transformedData.cpc,
      transformedData.roas,
    ]);
  }

  calculateCTR(clicks, impressions) {
    return impressions > 0 ? (clicks / impressions) * 100 : 0;
  }

  calculateCPC(cost, clicks) {
    return clicks > 0 ? cost / clicks : 0;
  }

  calculateROAS(revenue, cost) {
    return cost > 0 ? revenue / cost : 0;
  }

  getYesterday() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }
}

module.exports = ETLService;
```

## 5. 환경 변수 설정

```env
# .env.example

# Google Ads
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token

# Meta Ads
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret

# Naver Ads
NAVER_API_KEY=your_api_key
NAVER_SECRET_KEY=your_secret_key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marketing_platform
DB_USER=admin
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 6. API Rate Limiting 처리

```javascript
// utils/rate-limiter.js
const Bottleneck = require('bottleneck');

class RateLimiter {
  constructor() {
    this.limiters = {
      google: new Bottleneck({
        maxConcurrent: 5,
        minTime: 200, // 최소 200ms 간격
      }),
      meta: new Bottleneck({
        maxConcurrent: 10,
        minTime: 100,
      }),
      naver: new Bottleneck({
        maxConcurrent: 3,
        minTime: 333, // 약 3 requests/second
      }),
    };
  }

  wrap(platform, fn) {
    return this.limiters[platform].wrap(fn);
  }
}

module.exports = new RateLimiter();
```

## 7. 에러 처리 및 재시도

```javascript
// utils/retry-handler.js
const retry = require('async-retry');

async function retryAPICall(fn, options = {}) {
  return await retry(
    async (bail) => {
      try {
        return await fn();
      } catch (error) {
        // 재시도 불가능한 에러 (인증 오류 등)
        if (error.response?.status === 401 || error.response?.status === 403) {
          bail(error);
          return;
        }
        
        // 재시도 가능한 에러
        console.log(`Retrying due to error: ${error.message}`);
        throw error;
      }
    },
    {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
      ...options,
    }
  );
}

module.exports = { retryAPICall };
```
