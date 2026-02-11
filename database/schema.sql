-- 멀티채널 마케팅 최적화 서비스 데이터베이스 스키마
-- PostgreSQL 15+

-- 1. 사용자 테이블
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);

-- 2. 마케팅 계정 테이블
CREATE TABLE marketing_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
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

-- 3. 캠페인 테이블
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    marketing_account_id INTEGER REFERENCES marketing_accounts(id) ON DELETE CASCADE,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    objective VARCHAR(100),
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

-- 4. 캠페인 성과 지표 테이블
CREATE TABLE campaign_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INTEGER,
    
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    ctr DECIMAL(5, 2),
    
    cost DECIMAL(12, 2) DEFAULT 0,
    cpc DECIMAL(10, 2),
    cpm DECIMAL(10, 2),
    
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 2),
    cpa DECIMAL(10, 2),
    
    revenue DECIMAL(12, 2) DEFAULT 0,
    roas DECIMAL(10, 2),
    roi DECIMAL(10, 2),
    
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

-- 5. 채널 정보 테이블
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    icon_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true
);

-- 채널 기본 데이터
INSERT INTO channels (name, platform, display_name) VALUES
('google_search', 'google', 'Google 검색광고'),
('google_display', 'google', 'Google 디스플레이'),
('youtube', 'google', 'YouTube 광고'),
('facebook', 'meta', 'Facebook 광고'),
('instagram', 'meta', 'Instagram 광고'),
('naver_search', 'naver', '네이버 검색광고'),
('naver_display', 'naver', '네이버 디스플레이'),
('kakao', 'kakao', '카카오 광고');

-- 6. 채널별 성과 테이블
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

-- 7. 인사이트 테이블
CREATE TABLE insights (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    
    potential_impact DECIMAL(10, 2),
    suggested_action TEXT,
    
    is_read BOOLEAN DEFAULT false,
    is_applied BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_insights_user ON insights(user_id);
CREATE INDEX idx_insights_campaign ON insights(campaign_id);
CREATE INDEX idx_insights_priority ON insights(priority);

-- 8. 리포트 테이블
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    
    file_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    
    config JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_created ON reports(created_at);

-- 9. 데이터 동기화 로그 테이블
CREATE TABLE data_sync_logs (
    id SERIAL PRIMARY KEY,
    marketing_account_id INTEGER REFERENCES marketing_accounts(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_logs_account ON data_sync_logs(marketing_account_id);
CREATE INDEX idx_sync_logs_started ON data_sync_logs(started_at);

-- 10. 예산 관리 테이블
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    
    total_amount DECIMAL(12, 2) NOT NULL,
    spent_amount DECIMAL(12, 2) DEFAULT 0,
    remaining_amount DECIMAL(12, 2),
    
    period_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    alert_threshold DECIMAL(5, 2) DEFAULT 80,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budgets_user ON budgets(user_id);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_accounts_updated_at BEFORE UPDATE ON marketing_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 트리거: 캠페인 메트릭 KPI 자동 계산
CREATE OR REPLACE FUNCTION calculate_campaign_kpis()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.impressions > 0 THEN
        NEW.ctr := (NEW.clicks::DECIMAL / NEW.impressions) * 100;
    END IF;
    
    IF NEW.clicks > 0 THEN
        NEW.cpc := NEW.cost / NEW.clicks;
        NEW.conversion_rate := (NEW.conversions::DECIMAL / NEW.clicks) * 100;
    END IF;
    
    IF NEW.impressions > 0 THEN
        NEW.cpm := (NEW.cost / NEW.impressions) * 1000;
    END IF;
    
    IF NEW.conversions > 0 THEN
        NEW.cpa := NEW.cost / NEW.conversions;
    END IF;
    
    IF NEW.cost > 0 THEN
        NEW.roas := NEW.revenue / NEW.cost;
        NEW.roi := ((NEW.revenue - NEW.cost) / NEW.cost) * 100;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_kpis
    BEFORE INSERT OR UPDATE ON campaign_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_campaign_kpis();

-- 뷰: 캠페인 요약 정보
CREATE VIEW campaign_summary AS
SELECT 
    c.id,
    c.campaign_id,
    c.campaign_name,
    c.platform,
    c.status,
    SUM(cm.impressions) as total_impressions,
    SUM(cm.clicks) as total_clicks,
    SUM(cm.cost) as total_cost,
    SUM(cm.conversions) as total_conversions,
    SUM(cm.revenue) as total_revenue,
    AVG(cm.ctr) as avg_ctr,
    AVG(cm.cpc) as avg_cpc,
    AVG(cm.roas) as avg_roas
FROM campaigns c
LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
GROUP BY c.id, c.campaign_id, c.campaign_name, c.platform, c.status;
