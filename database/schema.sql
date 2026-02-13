-- ============================================
-- 멀티채널 마케팅 최적화 서비스 - MySQL 스키마
-- DB: cgi_25K_DA1_p3_1 @ project-db-cgi.smhrd.com:3307
-- DB 요구사항 분석서 기반 재설계
-- ============================================

-- 1. users (사용자)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. channels (채널 정보)
CREATE TABLE IF NOT EXISTS channels (
    channel_code VARCHAR(50) PRIMARY KEY,
    channel_name VARCHAR(100) NOT NULL,
    is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. marketing_accounts (마케팅 계정)
CREATE TABLE IF NOT EXISTS marketing_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    channel_code VARCHAR(50) NOT NULL,
    external_account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    auth_token TEXT,
    refresh_token TEXT,
    connection_status TINYINT(1) DEFAULT 1,
    UNIQUE KEY uk_user_channel_account (user_id, channel_code, external_account_id),
    INDEX idx_marketing_accounts_user (user_id),
    INDEX idx_marketing_accounts_channel (channel_code),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_code) REFERENCES channels(channel_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. campaigns (캠페인)
CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marketing_account_id INT NOT NULL,
    external_campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    daily_budget DECIMAL(12, 2),
    total_budget DECIMAL(12, 2),
    UNIQUE KEY uk_account_campaign (marketing_account_id, external_campaign_id),
    INDEX idx_campaigns_account (marketing_account_id),
    INDEX idx_campaigns_status (status),
    FOREIGN KEY (marketing_account_id) REFERENCES marketing_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. campaign_metrics (캠페인 성과 지표)
CREATE TABLE IF NOT EXISTS campaign_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    metric_date DATE NOT NULL,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost DECIMAL(12, 2) DEFAULT 0,
    conversions INT DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0,
    UNIQUE KEY uk_campaign_metric_date (campaign_id, metric_date),
    INDEX idx_campaign_metrics_campaign (campaign_id),
    INDEX idx_campaign_metrics_date (metric_date),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. channel_performance_daily (채널별 일일 성과 - VIEW)
CREATE OR REPLACE VIEW channel_performance_daily AS
SELECT
    ma.user_id,
    ma.channel_code,
    cm.metric_date,
    SUM(cm.cost) AS total_spend,
    SUM(cm.impressions) AS total_impressions,
    SUM(cm.clicks) AS total_clicks,
    SUM(cm.conversions) AS total_conversions,
    SUM(cm.revenue) AS total_revenue
FROM campaign_metrics cm
JOIN campaigns c ON cm.campaign_id = c.id
JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
GROUP BY ma.user_id, ma.channel_code, cm.metric_date;

-- 7. insights (인사이트)
CREATE TABLE IF NOT EXISTS insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    priority INT DEFAULT 3,
    is_read TINYINT(1) DEFAULT 0,
    is_applied TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_insights_user (user_id),
    INDEX idx_insights_priority (priority),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. reports (리포트)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    file_path VARCHAR(500),
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reports_user (user_id),
    INDEX idx_reports_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. budgets (예산 관리)
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_budget DECIMAL(12, 2) NOT NULL,
    daily_budget DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'active',
    INDEX idx_budgets_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. data_sync_logs (데이터 수집 로그)
CREATE TABLE IF NOT EXISTS data_sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marketing_account_id INT NOT NULL,
    success TINYINT(1) NOT NULL DEFAULT 1,
    collected_count INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sync_logs_account (marketing_account_id),
    INDEX idx_sync_logs_started (started_at),
    FOREIGN KEY (marketing_account_id) REFERENCES marketing_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
