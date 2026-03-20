-- ============================================================
-- ChannelAI 현재 데이터베이스 스키마 (실제 DB 반영본)
-- DB: cgi_25K_DA1_p3_1 @ project-db-cgi.smhrd.com:3307
-- 최종 수정: 2026-03-20
-- ※ CURRENT_DB_INFO.md (2026-03-06) + CURRENT_DATABASE_SCHEMA.sql (2026-03-17) 통합
-- ※ app.ts startServer() 자동 생성 테이블 포함
-- ============================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ───────────────────────────────────────────────────────────
-- 1. users (사용자)
--    소셜 로그인 컬럼 포함 (provider, naver_id, kakao_id 등)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
    `id`            int(11)       NOT NULL AUTO_INCREMENT,
    `email`         varchar(255)  NOT NULL,
    `password_hash` varchar(255)  DEFAULT NULL,
    `name`          varchar(100)  DEFAULT NULL,
    `company_name`  varchar(200)  DEFAULT NULL,
    `role`          varchar(50)   DEFAULT 'user',
    `provider`      varchar(50)   DEFAULT 'local',
    `provider_id`   varchar(255)  DEFAULT NULL,
    `naver_id`      varchar(255)  DEFAULT NULL,
    `kakao_id`      varchar(255)  DEFAULT NULL,
    `google_id`     varchar(255)  DEFAULT NULL,
    `profile_image` varchar(500)  DEFAULT NULL,
    `refresh_token` varchar(512)  DEFAULT NULL,
    `is_active`     tinyint(1)    DEFAULT '1',
    `last_login`    timestamp     NULL DEFAULT NULL,
    `created_at`    timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`),
    KEY `idx_provider` (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 6건

-- ───────────────────────────────────────────────────────────
-- 2. user_profiles (사용자 프로필)
--    plan = 구독 플랜명만 저장. 결제 상세는 payment_methods/payments 참조
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_profiles` (
    `id`              int           NOT NULL AUTO_INCREMENT,
    `user_id`         int           NOT NULL,
    `name`            varchar(100)  DEFAULT NULL,
    `business_number` varchar(30)   DEFAULT NULL  COMMENT '사업자번호 (중복 불가)',
    `company_name`    varchar(200)  DEFAULT NULL,
    `plan`            varchar(30)   DEFAULT NULL  COMMENT '구독 플랜 (PRO 등)',
    `phone_number`    varchar(30)   DEFAULT NULL,
    `created_at`      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_profiles_user_id`        (`user_id`),
    UNIQUE KEY `uk_user_profiles_business_number` (`business_number`),
    CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 6건

-- ───────────────────────────────────────────────────────────
-- 3. channels (채널 마스터)
--    지원 광고 매체 플랫폼 고유 정보
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `channels` (
    `id`           int(11)       NOT NULL AUTO_INCREMENT,
    `name`         varchar(100)  NOT NULL,
    `channel_code` varchar(50)   DEFAULT NULL,
    `display_name` varchar(100)  NOT NULL,
    `icon_url`     varchar(500)  DEFAULT NULL,
    `is_active`    tinyint(1)    DEFAULT '1',
    PRIMARY KEY (`id`),
    UNIQUE KEY `name`         (`name`),
    UNIQUE KEY `channel_code` (`channel_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 4건 (meta, google, naver, karrot)

-- ───────────────────────────────────────────────────────────
-- 4. marketing_accounts (마케팅 계정)
--    사용자가 연동한 광고주 계정 (OAuth 토큰 포함)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `marketing_accounts` (
    `id`                  int(11)       NOT NULL AUTO_INCREMENT,
    `user_id`             int(11)       DEFAULT NULL,
    `channel_code`        varchar(50)   DEFAULT NULL,
    `account_name`        varchar(100)  DEFAULT NULL,
    `access_token`        text,
    `auth_token`          text,
    `refresh_token`       text,
    `external_account_id` varchar(255)  DEFAULT NULL,
    `connection_status`   tinyint(1)    DEFAULT '1'   COMMENT '1=활성, 0=비활성',
    `created_at`          timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `user_id` (`user_id`),
    CONSTRAINT `marketing_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 21건

-- ───────────────────────────────────────────────────────────
-- 5. campaigns (광고 캠페인)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaigns` (
    `id`                   int(11)        NOT NULL AUTO_INCREMENT,
    `marketing_account_id` int(11)        DEFAULT NULL,
    `external_campaign_id` varchar(255)   DEFAULT NULL,
    `campaign_name`        varchar(255)   NOT NULL,
    `platform`             varchar(50)    NOT NULL,
    `status`               varchar(50)    DEFAULT 'active',
    `objective`            varchar(100)   DEFAULT NULL,
    `daily_budget`         decimal(12,2)  DEFAULT '0.00',
    `total_budget`         decimal(12,2)  DEFAULT '0.00',
    `unit_cost`            decimal(12,2)  DEFAULT NULL,
    `start_date`           date           DEFAULT NULL,
    `end_date`             date           DEFAULT NULL,
    `created_at`           timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_campaign` (`marketing_account_id`, `external_campaign_id`),
    CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`marketing_account_id`) REFERENCES `marketing_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 15건

-- ───────────────────────────────────────────────────────────
-- 6. campaign_metrics (캠페인 성과 지표) ★ 핵심 테이블
--    캠페인별 일간/시간별 성과 데이터
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaign_metrics` (
    `id`              int(11)        NOT NULL AUTO_INCREMENT,
    `campaign_id`     int(11)        DEFAULT NULL,
    `metric_date`     date           NOT NULL,
    `hour`            int(11)        DEFAULT NULL   COMMENT '시간대 (일간 합계 시 NULL)',
    `impressions`     bigint(20)     DEFAULT '0',
    `clicks`          bigint(20)     DEFAULT '0',
    `ctr`             decimal(5,2)   DEFAULT '0.00',
    `cost`            decimal(12,2)  DEFAULT '0.00',
    `cpc`             decimal(10,2)  DEFAULT '0.00',
    `cpm`             decimal(10,2)  DEFAULT '0.00',
    `conversions`     int(11)        DEFAULT '0',
    `conversion_rate` decimal(5,2)   DEFAULT '0.00',
    `cpa`             decimal(10,2)  DEFAULT '0.00',
    `revenue`         decimal(12,2)  DEFAULT '0.00',
    `roas`            decimal(10,2)  DEFAULT '0.00',
    `roi`             decimal(10,2)  DEFAULT '0.00',
    `reach`           int(11)        DEFAULT '0',
    `likes`           int(11)        DEFAULT '0',
    `shares`          int(11)        DEFAULT '0',
    `comments`        int(11)        DEFAULT '0',
    `saves`           int(11)        DEFAULT '0',
    `created_at`      timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_metric` (`campaign_id`, `metric_date`, `hour`),
    CONSTRAINT `campaign_metrics_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 1,176건

-- ───────────────────────────────────────────────────────────
-- 7. metrics (구 성과 테이블, 레거시)
--    campaign_metrics로 대체됨. 신규 코드에서 사용 지양
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `metrics` (
    `id`          int           NOT NULL AUTO_INCREMENT,
    `campaign_id` int           DEFAULT NULL,
    `metric_date` date          DEFAULT NULL,
    `impressions` int           DEFAULT '0',
    `clicks`      int           DEFAULT '0',
    `cost`        decimal(10,2) DEFAULT '0.00',
    `conversions` int           DEFAULT '0',
    `created_at`  timestamp     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 4건 (레거시)

-- ───────────────────────────────────────────────────────────
-- 8. insights (AI 인사이트/추천)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `insights` (
    `id`          int           NOT NULL AUTO_INCREMENT,
    `user_id`     int           NOT NULL,
    `campaign_id` int           DEFAULT NULL,
    `type`        varchar(50)   NOT NULL,
    `title`       varchar(255)  NOT NULL,
    `content`     text          DEFAULT NULL,
    `metadata`    json          DEFAULT NULL,
    `priority`    int           DEFAULT '3',
    `is_read`     tinyint(1)    DEFAULT '0',
    `is_applied`  tinyint(1)    DEFAULT '0',
    `created_at`  timestamp     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_insights_user`     (`user_id`),
    KEY `idx_insights_campaign` (`campaign_id`),
    KEY `idx_insights_priority` (`priority`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 0건

-- ───────────────────────────────────────────────────────────
-- 9. reports (성과 리포트) ★ PDF 파일 경로 저장
--    reportService.ts의 generateAndSaveReportFiles() 에서 사용
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `reports` (
    `id`           int           NOT NULL AUTO_INCREMENT,
    `user_id`      int           NOT NULL,
    `title`        varchar(255)  DEFAULT NULL,
    `report_type`  varchar(50)   DEFAULT 'manual'  COMMENT 'monthly | weekly | manual',
    `start_date`   date          NOT NULL,
    `end_date`     date          NOT NULL,
    `file_path`    varchar(500)  DEFAULT NULL       COMMENT '서버 내 PDF 저장 경로 (uploads/reports/...)',
    `settings`     json          DEFAULT NULL       COMMENT '{ month: "2026-02", size: 123456 }',
    `summary_text` text          DEFAULT NULL,
    `created_at`   timestamp     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_reports_user`    (`user_id`),
    KEY `idx_reports_created` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 실 데이터: 0건

-- ───────────────────────────────────────────────────────────
-- 10. budget_settings (예산 설정)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `budget_settings` (
    `id`           int           NOT NULL AUTO_INCREMENT,
    `user_id`      int           NOT NULL,
    `total_budget` decimal(12,2) NOT NULL,
    `daily_budget` decimal(12,2) DEFAULT NULL,
    `status`       varchar(50)   DEFAULT 'active',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_budget_settings_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 2건

-- ───────────────────────────────────────────────────────────
-- 11. budgets (예산 실행 로그, 레거시)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `budgets` (
    `id`                   int        NOT NULL AUTO_INCREMENT,
    `marketing_account_id` int        NOT NULL,
    `executed_at`          timestamp  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `success`              tinyint(1) NOT NULL DEFAULT '1',
    `duration_ms`          int        DEFAULT NULL,
    `error_message`        text       DEFAULT NULL,
    `created_at`           timestamp  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_budgets_account` (`marketing_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 0건

-- ───────────────────────────────────────────────────────────
-- 12. data_sync_logs (데이터 동기화 이력)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `data_sync_logs` (
    `id`                   int(11)     NOT NULL AUTO_INCREMENT,
    `marketing_account_id` int(11)     DEFAULT NULL,
    `sync_type`            varchar(50) NOT NULL,
    `status`               varchar(50) NOT NULL,
    `records_synced`       int(11)     DEFAULT '0',
    `error_message`        text,
    `started_at`           timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at`         timestamp   NULL DEFAULT NULL,
    `created_at`           timestamp   DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `marketing_account_id` (`marketing_account_id`),
    CONSTRAINT `data_sync_logs_ibfk_1` FOREIGN KEY (`marketing_account_id`) REFERENCES `marketing_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 19건

-- ───────────────────────────────────────────────────────────
-- 13. ai_history (AI 예산 분석 이력)
--    app.ts /api/v1/ai/recommend 엔드포인트에서 저장
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ai_history` (
    `id`               int       NOT NULL AUTO_INCREMENT,
    `user_id`          int       NOT NULL,
    `duration`         int       NOT NULL,
    `budget`           int       NOT NULL,
    `best_channel`     varchar(50) NOT NULL,
    `expected_revenue` int       NOT NULL,
    `full_report`      json      DEFAULT NULL,
    `created_at`       timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_ai_history_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 실 데이터: 43건

-- ───────────────────────────────────────────────────────────
-- 14. creative_generations (AI 광고 소재 생성 이력)
--    app.ts startServer() 자동 생성
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `creative_generations` (
    `id`               int          NOT NULL AUTO_INCREMENT,
    `user_id`          int          NOT NULL,
    `business_type`    varchar(100) NOT NULL,
    `product_name`     varchar(200) NOT NULL,
    `target_audience`  varchar(300) NOT NULL,
    `tone`             varchar(100) NOT NULL,
    `objective`        varchar(100) NOT NULL COMMENT '인지도/트래픽/전환',
    `additional_info`  text         DEFAULT NULL,
    `had_document`     tinyint(1)   DEFAULT '0'   COMMENT 'PDF/문서 업로드 여부',
    `had_image`        tinyint(1)   DEFAULT '0'   COMMENT '기존 광고 이미지 업로드 여부',
    `usp_analysis`     text         DEFAULT NULL,
    `generated_copies` json         NOT NULL      COMMENT '4개 매체별 카피 JSON',
    `visual_guide`     json         DEFAULT NULL,
    `strategy_summary` text         DEFAULT NULL,
    `compliance_notes` text         DEFAULT NULL,
    `user_rating`      tinyint      DEFAULT NULL  COMMENT '사용자 만족도 1-5',
    `created_at`       timestamp    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_creative_user`    (`user_id`),
    KEY `idx_creative_created` (`created_at`),
    CONSTRAINT `fk_creative_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 실 데이터: 5건

-- ───────────────────────────────────────────────────────────
-- 15. payment_methods (결제 수단)
--    app.ts startServer() 자동 생성
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payment_methods` (
    `id`             int          NOT NULL AUTO_INCREMENT,
    `user_id`        int          NOT NULL,
    `method`         varchar(50)  DEFAULT 'card'    COMMENT '결제수단 (card / kakao_pay 등)',
    `card_company`   varchar(50)  DEFAULT NULL      COMMENT '카드사명',
    `card_last4`     char(4)      DEFAULT NULL      COMMENT '카드 뒤 4자리',
    `monthly_amount` decimal(10,2) DEFAULT '9900.00' COMMENT '월 결제 금액 (원)',
    `auto_renew`     tinyint(1)   NOT NULL DEFAULT '1' COMMENT '자동 갱신 여부',
    `created_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_payment_methods_user_id` (`user_id`),
    CONSTRAINT `fk_payment_methods_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ───────────────────────────────────────────────────────────
-- 16. payments (결제 이력)
--    app.ts startServer() 자동 생성
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payments` (
    `id`               bigint       NOT NULL AUTO_INCREMENT,
    `user_id`          bigint       NOT NULL,
    `amount`           int          NOT NULL                   COMMENT '결제 금액 (원)',
    `plan`             varchar(20)  NOT NULL                   COMMENT '구독 플랜 (PRO 등)',
    `pay_method`       varchar(50)  DEFAULT NULL               COMMENT '결제 수단',
    `status`           varchar(20)  NOT NULL DEFAULT 'success' COMMENT 'success|failed|cancelled|refunded',
    `transaction_id`   varchar(200) DEFAULT NULL               COMMENT 'PG사 거래 ID',
    `plan_started_at`  datetime     DEFAULT NULL               COMMENT '구독 시작일',
    `plan_expires_at`  datetime     DEFAULT NULL               COMMENT '구독 만료일',
    `note`             varchar(500) DEFAULT NULL,
    `paid_at`          datetime     NOT NULL DEFAULT NOW(),
    PRIMARY KEY (`id`),
    KEY `idx_payments_user_id` (`user_id`),
    KEY `idx_payments_status`  (`status`),
    KEY `idx_payments_paid_at` (`paid_at`),
    CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='결제 이력';

-- ───────────────────────────────────────────────────────────
-- VIEW 1: channel_performance_daily
--    채널별 일간 성과 집계 뷰
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW `channel_performance_daily` AS
SELECT
    ma.user_id,
    ma.channel_code,
    cm.metric_date,
    SUM(cm.cost)        AS total_spend,
    SUM(cm.impressions) AS total_impressions,
    SUM(cm.clicks)      AS total_clicks,
    SUM(cm.conversions) AS total_conversions,
    SUM(cm.revenue)     AS total_revenue
FROM campaign_metrics cm
JOIN campaigns        c  ON cm.campaign_id = c.id
JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
GROUP BY ma.user_id, ma.channel_code, cm.metric_date;
-- 실 데이터: 800건

-- ───────────────────────────────────────────────────────────
-- VIEW 2: v_subscription
--    구독 통합 뷰 (user_profiles + payment_methods + payments 최신 1건)
--    app.ts startServer() 자동 생성
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW `v_subscription` AS
SELECT
    up.user_id,
    up.plan,
    (SELECT plan_started_at FROM payments p WHERE p.user_id = up.user_id AND p.status = 'success' ORDER BY paid_at DESC LIMIT 1) AS plan_started_at,
    (SELECT plan_expires_at FROM payments p WHERE p.user_id = up.user_id AND p.status = 'success' ORDER BY paid_at DESC LIMIT 1) AS plan_expires_at,
    pm.method        AS pay_method,
    pm.auto_renew    AS pay_auto_renew,
    pm.card_company  AS pay_card_company,
    pm.card_last4    AS pay_card_last4,
    pm.monthly_amount AS pay_monthly_amt
FROM user_profiles up
LEFT JOIN payment_methods pm ON up.user_id = pm.user_id;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 테이블 요약 (2026-03-20 기준)
-- ============================================================
--
--  #  테이블명                  행 수    용도
-- ─────────────────────────────────────────────────────────
--  1  users                      6건    사용자 계정 (소셜 로그인 포함)
--  2  user_profiles               6건    사용자 프로필 (사업자번호, 플랜)
--  3  channels                    4건    채널 마스터 (meta/google/naver/karrot)
--  4  marketing_accounts         21건    연동 광고 계정 (OAuth 토큰)
--  5  campaigns                  15건    광고 캠페인
--  6  campaign_metrics         1,176건  ★ 핵심: 일별 성과 지표
--  7  metrics                     4건    레거시 (사용 지양)
--  8  insights                    0건    AI 인사이트 추천
--  9  reports                     0건    PDF 리포트 경로 저장 (report_type 컬럼)
-- 10  budget_settings              2건    예산 설정
-- 11  budgets                     0건    예산 실행 로그 (레거시)
-- 12  data_sync_logs             19건    외부 데이터 수집 이력
-- 13  ai_history                 43건    AI 예산 분석 이력 (predict_budget.py)
-- 14  creative_generations        5건    AI 광고 소재 생성 이력
-- 15  payment_methods             -건    결제 수단 (app.ts 자동 생성)
-- 16  payments                    -건    결제 이력 (app.ts 자동 생성)
--
--  VIEW channel_performance_daily  800건  채널별 일간 성과 집계
--  VIEW v_subscription               -건  구독 통합 뷰 (app.ts 자동 생성)
-- ============================================================
