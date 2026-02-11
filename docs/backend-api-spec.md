# 백엔드 API 명세서

## 기본 정보
- **Base URL**: `https://api.yourservice.com/v1`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 인증 (Authentication)

### POST /auth/register
회원가입

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "홍길동",
  "company_name": "ABC 마케팅"
}
```

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "company_name": "ABC 마케팅"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/login
로그인

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/refresh
토큰 갱신

**Headers:**
```
Authorization: Bearer {refresh_token}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 마케팅 계정 (Marketing Accounts)

### GET /marketing-accounts
연결된 마케팅 계정 목록 조회

**Response (200):**
```json
{
  "accounts": [
    {
      "id": 1,
      "platform": "google_ads",
      "account_id": "123-456-7890",
      "account_name": "My Google Ads Account",
      "is_connected": true,
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "platform": "meta_ads",
      "account_id": "act_123456789",
      "account_name": "My Meta Business",
      "is_connected": true,
      "created_at": "2026-01-02T00:00:00Z"
    }
  ]
}
```

### POST /marketing-accounts/connect
새로운 마케팅 계정 연결

**Request Body:**
```json
{
  "platform": "google_ads",
  "auth_code": "authorization_code_from_oauth"
}
```

**Response (201):**
```json
{
  "id": 3,
  "platform": "google_ads",
  "account_id": "123-456-7890",
  "account_name": "New Account",
  "is_connected": true
}
```

### DELETE /marketing-accounts/:id
마케팅 계정 연결 해제

**Response (204):** No Content

## 캠페인 (Campaigns)

### GET /campaigns
캠페인 목록 조회

**Query Parameters:**
- `platform` (optional): google_ads, meta_ads, naver_ads
- `status` (optional): active, paused, ended
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 항목 수 (default: 20)

**Response (200):**
```json
{
  "campaigns": [
    {
      "id": 1,
      "campaign_id": "12345",
      "campaign_name": "2026 신년 프로모션",
      "platform": "google_ads",
      "status": "active",
      "daily_budget": 50000,
      "start_date": "2026-01-01",
      "end_date": "2026-01-31",
      "metrics": {
        "impressions": 150000,
        "clicks": 3000,
        "cost": 1500000,
        "conversions": 45,
        "ctr": 2.0,
        "cpc": 500,
        "roas": 3.5
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 98,
    "items_per_page": 20
  }
}
```

### GET /campaigns/:id
특정 캠페인 상세 조회

**Response (200):**
```json
{
  "id": 1,
  "campaign_id": "12345",
  "campaign_name": "2026 신년 프로모션",
  "platform": "google_ads",
  "status": "active",
  "objective": "conversion",
  "daily_budget": 50000,
  "total_budget": 1550000,
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "created_at": "2025-12-20T00:00:00Z",
  "updated_at": "2026-01-20T00:00:00Z"
}
```

### GET /campaigns/:id/performance
캠페인 성과 데이터 조회

**Query Parameters:**
- `date_from` (required): YYYY-MM-DD
- `date_to` (required): YYYY-MM-DD
- `granularity` (optional): daily, hourly (default: daily)

**Response (200):**
```json
{
  "campaign_id": 1,
  "campaign_name": "2026 신년 프로모션",
  "date_from": "2026-01-01",
  "date_to": "2026-01-20",
  "performance": [
    {
      "date": "2026-01-01",
      "impressions": 5000,
      "clicks": 100,
      "cost": 50000,
      "conversions": 2,
      "revenue": 180000,
      "ctr": 2.0,
      "cpc": 500,
      "cpa": 25000,
      "roas": 3.6
    },
    {
      "date": "2026-01-02",
      "impressions": 6000,
      "clicks": 120,
      "cost": 60000,
      "conversions": 3,
      "revenue": 210000,
      "ctr": 2.0,
      "cpc": 500,
      "cpa": 20000,
      "roas": 3.5
    }
  ],
  "totals": {
    "impressions": 150000,
    "clicks": 3000,
    "cost": 1500000,
    "conversions": 45,
    "revenue": 5250000,
    "avg_ctr": 2.0,
    "avg_cpc": 500,
    "avg_cpa": 33333,
    "avg_roas": 3.5
  }
}
```

## 대시보드 (Dashboard)

### GET /dashboard/overview
대시보드 종합 요약

**Query Parameters:**
- `date_from` (required): YYYY-MM-DD
- `date_to` (required): YYYY-MM-DD

**Response (200):**
```json
{
  "period": {
    "from": "2026-01-01",
    "to": "2026-01-20"
  },
  "summary": {
    "total_spend": 5000000,
    "total_impressions": 500000,
    "total_clicks": 10000,
    "total_conversions": 150,
    "total_revenue": 18000000,
    "avg_ctr": 2.0,
    "avg_cpc": 500,
    "avg_cpa": 33333,
    "avg_roas": 3.6
  },
  "comparison": {
    "spend_change": 15.5,
    "impressions_change": 20.3,
    "clicks_change": 18.7,
    "conversions_change": 25.0,
    "revenue_change": 30.2
  },
  "top_campaigns": [
    {
      "id": 1,
      "name": "2026 신년 프로모션",
      "platform": "google_ads",
      "spend": 1500000,
      "roas": 4.2,
      "conversions": 45
    }
  ],
  "channel_breakdown": [
    {
      "channel": "google_search",
      "spend": 2000000,
      "revenue": 8000000,
      "roas": 4.0
    },
    {
      "channel": "facebook",
      "spend": 1500000,
      "revenue": 5400000,
      "roas": 3.6
    }
  ]
}
```

### GET /dashboard/trends
성과 트렌드 분석

**Query Parameters:**
- `date_from` (required)
- `date_to` (required)
- `metric` (optional): cost, impressions, clicks, conversions, revenue
- `granularity` (optional): daily, weekly, monthly

**Response (200):**
```json
{
  "metric": "revenue",
  "granularity": "daily",
  "data": [
    {
      "date": "2026-01-01",
      "value": 180000
    },
    {
      "date": "2026-01-02",
      "value": 210000
    }
  ]
}
```

## 채널 분석 (Channel Analysis)

### GET /channels
채널 목록 조회

**Response (200):**
```json
{
  "channels": [
    {
      "id": 1,
      "name": "google_search",
      "platform": "google",
      "display_name": "Google 검색광고",
      "is_active": true
    }
  ]
}
```

### GET /channels/:id/performance
특정 채널 성과 조회

**Query Parameters:**
- `date_from` (required)
- `date_to` (required)

**Response (200):**
```json
{
  "channel": {
    "id": 1,
    "name": "google_search",
    "display_name": "Google 검색광고"
  },
  "performance": {
    "total_spend": 2000000,
    "total_impressions": 200000,
    "total_clicks": 4000,
    "total_conversions": 60,
    "total_revenue": 8000000,
    "avg_ctr": 2.0,
    "avg_cpc": 500,
    "avg_roas": 4.0
  },
  "daily_data": [
    {
      "date": "2026-01-01",
      "spend": 100000,
      "impressions": 10000,
      "clicks": 200,
      "conversions": 3,
      "revenue": 400000
    }
  ]
}
```

### GET /channels/comparison
채널 간 비교 분석

**Query Parameters:**
- `date_from` (required)
- `date_to` (required)
- `metrics` (optional): cost,roas,conversions (comma-separated)

**Response (200):**
```json
{
  "comparison": [
    {
      "channel_id": 1,
      "channel_name": "Google 검색광고",
      "metrics": {
        "cost": 2000000,
        "roas": 4.0,
        "conversions": 60,
        "efficiency_score": 85
      }
    },
    {
      "channel_id": 2,
      "channel_name": "Facebook 광고",
      "metrics": {
        "cost": 1500000,
        "roas": 3.6,
        "conversions": 45,
        "efficiency_score": 78
      }
    }
  ],
  "best_performing": {
    "by_roas": "Google 검색광고",
    "by_conversions": "Google 검색광고",
    "by_efficiency": "Google 검색광고"
  }
}
```

## 인사이트 (Insights)

### GET /insights
인사이트 목록 조회

**Query Parameters:**
- `type` (optional): opportunity, warning, recommendation
- `priority` (optional): high, medium, low
- `is_read` (optional): true, false

**Response (200):**
```json
{
  "insights": [
    {
      "id": 1,
      "type": "opportunity",
      "category": "budget",
      "title": "Google 검색광고 예산 증액 기회",
      "description": "Google 검색광고의 ROAS가 4.0으로 목표치를 초과하고 있습니다. 예산을 20% 증액하면 추가 수익을 기대할 수 있습니다.",
      "priority": "high",
      "potential_impact": 25.5,
      "suggested_action": "일 예산을 100,000원에서 120,000원으로 증액",
      "is_read": false,
      "created_at": "2026-01-20T10:00:00Z"
    },
    {
      "id": 2,
      "type": "warning",
      "category": "performance",
      "title": "Instagram 광고 성과 하락",
      "description": "Instagram 광고의 CTR이 지난 주 대비 30% 감소했습니다.",
      "priority": "high",
      "potential_impact": -15.0,
      "suggested_action": "광고 소재 교체 또는 타겟팅 재설정 검토",
      "is_read": false,
      "created_at": "2026-01-19T15:30:00Z"
    }
  ]
}
```

### PATCH /insights/:id
인사이트 읽음 처리

**Request Body:**
```json
{
  "is_read": true
}
```

**Response (200):**
```json
{
  "id": 1,
  "is_read": true
}
```

## 리포트 (Reports)

### POST /reports
리포트 생성 요청

**Request Body:**
```json
{
  "title": "2026년 1월 월간 리포트",
  "report_type": "monthly",
  "date_from": "2026-01-01",
  "date_to": "2026-01-31",
  "config": {
    "channels": ["google_search", "facebook", "instagram"],
    "metrics": ["cost", "impressions", "clicks", "conversions", "roas"],
    "include_insights": true,
    "format": "pdf"
  }
}
```

**Response (202):**
```json
{
  "id": 1,
  "title": "2026년 1월 월간 리포트",
  "status": "pending",
  "created_at": "2026-02-01T00:00:00Z"
}
```

### GET /reports
리포트 목록 조회

**Response (200):**
```json
{
  "reports": [
    {
      "id": 1,
      "title": "2026년 1월 월간 리포트",
      "report_type": "monthly",
      "date_from": "2026-01-01",
      "date_to": "2026-01-31",
      "status": "completed",
      "file_url": "https://s3.amazonaws.com/reports/report-1.pdf",
      "created_at": "2026-02-01T00:00:00Z",
      "completed_at": "2026-02-01T00:05:00Z"
    }
  ]
}
```

### GET /reports/:id
리포트 상세 조회 및 다운로드

**Response (200):**
```json
{
  "id": 1,
  "title": "2026년 1월 월간 리포트",
  "report_type": "monthly",
  "date_from": "2026-01-01",
  "date_to": "2026-01-31",
  "status": "completed",
  "file_url": "https://s3.amazonaws.com/reports/report-1.pdf",
  "download_url": "https://s3.amazonaws.com/reports/report-1.pdf?signature=...",
  "created_at": "2026-02-01T00:00:00Z",
  "completed_at": "2026-02-01T00:05:00Z"
}
```

## 예산 관리 (Budgets)

### GET /budgets
예산 목록 조회

**Response (200):**
```json
{
  "budgets": [
    {
      "id": 1,
      "name": "2026년 1분기 마케팅 예산",
      "total_amount": 10000000,
      "spent_amount": 3500000,
      "remaining_amount": 6500000,
      "utilization_rate": 35.0,
      "period_type": "quarterly",
      "start_date": "2026-01-01",
      "end_date": "2026-03-31",
      "alert_threshold": 80
    }
  ]
}
```

### POST /budgets
예산 생성

**Request Body:**
```json
{
  "name": "2026년 1분기 마케팅 예산",
  "total_amount": 10000000,
  "period_type": "quarterly",
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "alert_threshold": 80
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "2026년 1분기 마케팅 예산",
  "total_amount": 10000000,
  "spent_amount": 0,
  "remaining_amount": 10000000,
  "period_type": "quarterly",
  "start_date": "2026-01-01",
  "end_date": "2026-03-31"
}
```

## 에러 응답

### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "잘못된 요청입니다.",
    "details": [
      {
        "field": "date_from",
        "message": "유효한 날짜 형식이 아닙니다."
      }
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다."
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "요청한 리소스를 찾을 수 없습니다."
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "서버 내부 오류가 발생했습니다.",
    "request_id": "req_123abc"
  }
}
```

## Rate Limiting
- **제한**: 1000 requests / hour per user
- **헤더**:
  - `X-RateLimit-Limit`: 시간당 최대 요청 수
  - `X-RateLimit-Remaining`: 남은 요청 수
  - `X-RateLimit-Reset`: 제한 초기화 시간 (Unix timestamp)

## Webhooks (선택사항)

### POST /webhooks
웹훅 등록

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["campaign.created", "insight.generated", "budget.threshold_reached"]
}
```

**Response (201):**
```json
{
  "id": 1,
  "url": "https://your-server.com/webhook",
  "events": ["campaign.created", "insight.generated", "budget.threshold_reached"],
  "secret": "whsec_abc123...",
  "is_active": true
}
```
