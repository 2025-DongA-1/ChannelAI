-- ============================================
-- 멀티채널 마케팅 최적화 서비스 - MySQL 스키마
-- DB: cgi_25K_DA1_p3_1 @ project-db-cgi.smhrd.com:3307
-- ============================================

-- 1. users (사용자)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active TINYINT(1) DEFAULT 1,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. marketing_accounts (마케팅 계정)
CREATE TABLE IF NOT EXISTS marketing_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    is_connected TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_platform_account (user_id, platform, account_id),
    INDEX idx_marketing_accounts_user (user_id),
    INDEX idx_marketing_accounts_platform (platform),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. campaigns (캠페인)
CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marketing_account_id INT NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_account_campaign (marketing_account_id, campaign_id),
    INDEX idx_campaigns_account (marketing_account_id),
    INDEX idx_campaigns_platform (platform),
    INDEX idx_campaigns_status (status),
    FOREIGN KEY (marketing_account_id) REFERENCES marketing_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. campaign_metrics (캠페인 성과 지표)
CREATE TABLE IF NOT EXISTS campaign_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    date DATE NOT NULL,
    hour INT NULL,
    
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    ctr DECIMAL(5, 2),
    
    cost DECIMAL(12, 2) DEFAULT 0,
    cpc DECIMAL(10, 2),
    cpm DECIMAL(10, 2),
    
    conversions INT DEFAULT 0,
    conversion_rate DECIMAL(5, 2),
    cpa DECIMAL(10, 2),
    
    revenue DECIMAL(12, 2) DEFAULT 0,
    roas DECIMAL(10, 2),
    roi DECIMAL(10, 2),
    
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    comments INT DEFAULT 0,
    saves INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_campaign_date_hour (campaign_id, date, hour),
    INDEX idx_campaign_metrics_campaign (campaign_id),
    INDEX idx_campaign_metrics_date (date),
    INDEX idx_campaign_metrics_campaign_date (campaign_id, date),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. channels (채널 정보)
CREATE TABLE IF NOT EXISTS channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    icon_url VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. channel_performance (채널별 성과)
CREATE TABLE IF NOT EXISTS channel_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    channel_id INT,
    date DATE NOT NULL,
    
    total_spend DECIMAL(12, 2) DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_conversions INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    
    avg_cpc DECIMAL(10, 2),
    avg_ctr DECIMAL(5, 2),
    avg_roas DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_user_channel_date (user_id, channel_id, date),
    INDEX idx_channel_performance_user (user_id),
    INDEX idx_channel_performance_date (date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. insights (인사이트/추천)
CREATE TABLE IF NOT EXISTS insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    campaign_id INT,
    
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    
    potential_impact DECIMAL(10, 2),
    suggested_action TEXT,
    
    is_read TINYINT(1) DEFAULT 0,
    is_applied TINYINT(1) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    INDEX idx_insights_user (user_id),
    INDEX idx_insights_campaign (campaign_id),
    INDEX idx_insights_priority (priority),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. reports (리포트)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    
    file_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    
    config JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_reports_user (user_id),
    INDEX idx_reports_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. data_sync_logs (데이터 동기화 로그)
CREATE TABLE IF NOT EXISTS data_sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marketing_account_id INT NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    
    records_synced INT DEFAULT 0,
    error_message TEXT,
    
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sync_logs_account (marketing_account_id),
    INDEX idx_sync_logs_started (started_at),
    FOREIGN KEY (marketing_account_id) REFERENCES marketing_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. budgets (예산 관리)
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    total_amount DECIMAL(12, 2) NOT NULL,
    spent_amount DECIMAL(12, 2) DEFAULT 0,
    remaining_amount DECIMAL(12, 2),
    
    period_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    alert_threshold DECIMAL(5, 2) DEFAULT 80,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_budgets_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KPI 자동 계산 트리거
-- ============================================

DELIMITER //

CREATE TRIGGER trg_campaign_metrics_before_insert
BEFORE INSERT ON campaign_metrics
FOR EACH ROW
BEGIN
    IF NEW.impressions > 0 THEN
        SET NEW.ctr = (NEW.clicks / NEW.impressions) * 100;
        SET NEW.cpm = (NEW.cost / NEW.impressions) * 1000;
    END IF;
    IF NEW.clicks > 0 THEN
        SET NEW.cpc = NEW.cost / NEW.clicks;
        SET NEW.conversion_rate = (NEW.conversions / NEW.clicks) * 100;
    END IF;
    IF NEW.conversions > 0 THEN
        SET NEW.cpa = NEW.cost / NEW.conversions;
    END IF;
    IF NEW.cost > 0 THEN
        SET NEW.roas = NEW.revenue / NEW.cost;
        SET NEW.roi = ((NEW.revenue - NEW.cost) / NEW.cost) * 100;
    END IF;
END//

CREATE TRIGGER trg_campaign_metrics_before_update
BEFORE UPDATE ON campaign_metrics
FOR EACH ROW
BEGIN
    IF NEW.impressions > 0 THEN
        SET NEW.ctr = (NEW.clicks / NEW.impressions) * 100;
        SET NEW.cpm = (NEW.cost / NEW.impressions) * 1000;
    END IF;
    IF NEW.clicks > 0 THEN
        SET NEW.cpc = NEW.cost / NEW.clicks;
        SET NEW.conversion_rate = (NEW.conversions / NEW.clicks) * 100;
    END IF;
    IF NEW.conversions > 0 THEN
        SET NEW.cpa = NEW.cost / NEW.conversions;
    END IF;
    IF NEW.cost > 0 THEN
        SET NEW.roas = NEW.revenue / NEW.cost;
        SET NEW.roi = ((NEW.revenue - NEW.cost) / NEW.cost) * 100;
    END IF;
END//

DELIMITER ;
