# 데이터베이스 스키마 설계

## ERD 개요
멀티채널 마케팅 최적화 서비스를 위한 데이터베이스 스키마

## 테이블 구조

### 1. users (사용자)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'user', -- admin, user, viewer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
```

### 2. marketing_accounts (마케팅 계정)
외부 마케팅 플랫폼 계정 정보
```sql
CREATE TABLE marketing_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- google_ads, meta_ads, naver_ads, etc.
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    is_connected BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, account_id)
);

CREATE INDEX idx_marketing_accounts_user ON marketing_accounts(user_id);
CREATE INDEX idx_marketing_accounts_platform ON marketing_accounts(platform);
```

### 3. campaigns (캠페인)
```sql
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    marketing_account_id INTEGER REFERENCES marketing_accounts(id) ON DELETE CASCADE,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(50), -- active, paused, ended
    objective VARCHAR(100), -- awareness, consideration, conversion
    daily_budget DECIMAL(12, 2),
    total_budget DECIMAL(12, 2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(marketing_account_id, campaign_id)
);

CREATE INDEX idx_campaigns_account ON campaigns(marketing_account_id);
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

### 4. campaign_metrics (캠페인 성과 지표)
일별 또는 시간별 성과 데이터
```sql
CREATE TABLE campaign_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INTEGER, -- NULL이면 일별 집계
    
    -- 노출 및 클릭 지표
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    ctr DECIMAL(5, 2), -- Click-Through Rate
    
    -- 비용 지표
    cost DECIMAL(12, 2) DEFAULT 0,
    cpc DECIMAL(10, 2), -- Cost Per Click
    cpm DECIMAL(10, 2), -- Cost Per Mille (1000 impressions)
    
    -- 전환 지표
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 2),
    cpa DECIMAL(10, 2), -- Cost Per Acquisition
    
    -- 수익 지표
    revenue DECIMAL(12, 2) DEFAULT 0,
    roas DECIMAL(10, 2), -- Return on Ad Spend
    roi DECIMAL(10, 2), -- Return on Investment
    
    -- 인게이지먼트 (소셜 미디어)
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_id, date, hour)
);

CREATE INDEX idx_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date);
```

### 5. channels (채널 정보)
```sql
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- google_search, facebook, instagram, naver_search, etc.
    platform VARCHAR(50) NOT NULL, -- google, meta, naver
    display_name VARCHAR(100) NOT NULL,
    icon_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true
);

INSERT INTO channels (name, platform, display_name) VALUES
('google_search', 'google', 'Google 검색광고'),
('google_display', 'google', 'Google 디스플레이'),
('youtube', 'google', 'YouTube 광고'),
('facebook', 'meta', 'Facebook 광고'),
('instagram', 'meta', 'Instagram 광고'),
('naver_search', 'naver', '네이버 검색광고'),
('naver_display', 'naver', '네이버 디스플레이'),
('kakao', 'kakao', '카카오 광고');
```

### 6. channel_performance (채널별 성과)
```sql
CREATE TABLE channel_performance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    channel_id INTEGER REFERENCES channels(id),
    date DATE NOT NULL,
    
    total_spend DECIMAL(12, 2) DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    
    avg_cpc DECIMAL(10, 2),
    avg_ctr DECIMAL(5, 2),
    avg_roas DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, channel_id, date)
);

CREATE INDEX idx_channel_performance_user ON channel_performance(user_id);
CREATE INDEX idx_channel_performance_date ON channel_performance(date);
```

### 7. insights (인사이트/추천)
AI 또는 규칙 기반 인사이트
```sql
CREATE TABLE insights (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL, -- opportunity, warning, recommendation
    category VARCHAR(50), -- budget, targeting, creative, timing
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    
    potential_impact DECIMAL(10, 2), -- 예상 개선 효과 (%)
    suggested_action TEXT,
    
    is_read BOOLEAN DEFAULT false,
    is_applied BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_insights_user ON insights(user_id);
CREATE INDEX idx_insights_campaign ON insights(campaign_id);
CREATE INDEX idx_insights_priority ON insights(priority);
```

### 8. reports (리포트)
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, custom
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    
    file_url VARCHAR(500), -- PDF 또는 Excel 파일 URL
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    
    config JSONB, -- 리포트 설정 (포함할 채널, 지표 등)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_created ON reports(created_at);
```

### 9. data_sync_logs (데이터 동기화 로그)
```sql
CREATE TABLE data_sync_logs (
    id SERIAL PRIMARY KEY,
    marketing_account_id INTEGER REFERENCES marketing_accounts(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- full, incremental
    status VARCHAR(50) NOT NULL, -- success, failed, in_progress
    
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_logs_account ON data_sync_logs(marketing_account_id);
CREATE INDEX idx_sync_logs_started ON data_sync_logs(started_at);
```

### 10. budgets (예산 관리)
```sql
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    
    total_amount DECIMAL(12, 2) NOT NULL,
    spent_amount DECIMAL(12, 2) DEFAULT 0,
    remaining_amount DECIMAL(12, 2),
    
    period_type VARCHAR(50) NOT NULL, -- daily, monthly, quarterly, yearly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    alert_threshold DECIMAL(5, 2) DEFAULT 80, -- 예산 80% 소진 시 알림
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budgets_user ON budgets(user_id);
```

## 인덱스 전략

### 복합 인덱스
```sql
-- 캠페인 성과 조회 최적화
CREATE INDEX idx_metrics_campaign_date_desc ON campaign_metrics(campaign_id, date DESC);

-- 사용자별 채널 성과 조회
CREATE INDEX idx_channel_perf_user_date ON channel_performance(user_id, date DESC);

-- 읽지 않은 인사이트 조회
CREATE INDEX idx_insights_user_unread ON insights(user_id, is_read) WHERE is_read = false;
```

## 파티셔닝 (선택사항)
대용량 데이터 처리를 위한 테이블 파티셔닝

```sql
-- campaign_metrics 테이블을 월별로 파티셔닝
CREATE TABLE campaign_metrics (
    -- 기존 컬럼들...
) PARTITION BY RANGE (date);

-- 월별 파티션 생성 예시
CREATE TABLE campaign_metrics_2026_01 PARTITION OF campaign_metrics
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE campaign_metrics_2026_02 PARTITION OF campaign_metrics
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

## 데이터 보관 정책

### 원본 데이터 (Hot Data)
- **기간**: 최근 3개월
- **저장소**: PostgreSQL 주 데이터베이스
- **용도**: 실시간 대시보드, 상세 분석

### 집계 데이터 (Warm Data)
- **기간**: 3개월 ~ 1년
- **저장소**: PostgreSQL (집계 테이블)
- **용도**: 트렌드 분석, 월별/분기별 리포트

### 아카이브 (Cold Data)
- **기간**: 1년 이상
- **저장소**: AWS S3 또는 Google Cloud Storage
- **용도**: 규정 준수, 장기 트렌드 분석

## 데이터 무결성

### 트리거 예시
```sql
-- campaign_metrics 업데이트 시 자동으로 KPI 계산
CREATE OR REPLACE FUNCTION calculate_campaign_kpis()
RETURNS TRIGGER AS $$
BEGIN
    -- CTR 계산
    IF NEW.impressions > 0 THEN
        NEW.ctr := (NEW.clicks::DECIMAL / NEW.impressions) * 100;
    END IF;
    
    -- CPC 계산
    IF NEW.clicks > 0 THEN
        NEW.cpc := NEW.cost / NEW.clicks;
    END IF;
    
    -- CPM 계산
    IF NEW.impressions > 0 THEN
        NEW.cpm := (NEW.cost / NEW.impressions) * 1000;
    END IF;
    
    -- Conversion Rate 계산
    IF NEW.clicks > 0 THEN
        NEW.conversion_rate := (NEW.conversions::DECIMAL / NEW.clicks) * 100;
    END IF;
    
    -- CPA 계산
    IF NEW.conversions > 0 THEN
        NEW.cpa := NEW.cost / NEW.conversions;
    END IF;
    
    -- ROAS 계산
    IF NEW.cost > 0 THEN
        NEW.roas := NEW.revenue / NEW.cost;
    END IF;
    
    -- ROI 계산
    IF NEW.cost > 0 THEN
        NEW.roi := ((NEW.revenue - NEW.cost) / NEW.cost) * 100;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_kpis
    BEFORE INSERT OR UPDATE ON campaign_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_campaign_kpis();
```

## 데이터베이스 설정

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: marketing_platform
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seeds:/docker-entrypoint-initdb.d/seeds
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```
