-- ChannelAI 현재 데이터베이스 스키마 (실제 DB 반영본)
-- 최종 수정: 2026-03-17
-- ※ 실제 MySQL Workbench 확인 기준 현재 상태
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 사용자 테이블 (users)
--    소셜 로그인 컬럼 포함 (add_social_columns.sql 반영)
CREATE TABLE IF NOT EXISTS `users` (
    `id`            int(11)      NOT NULL AUTO_INCREMENT,
    `email`         varchar(255) NOT NULL,
    `password_hash` varchar(255) DEFAULT NULL,
    `name`          varchar(100) DEFAULT NULL,
    `company_name`  varchar(200) DEFAULT NULL,
    `role`          varchar(50)  DEFAULT 'user',
    `provider`      varchar(50)  DEFAULT 'local',
    `provider_id`   varchar(255) DEFAULT NULL,
    `naver_id`      varchar(255) DEFAULT NULL,
    `kakao_id`      varchar(255) DEFAULT NULL,
    `google_id`     varchar(255) DEFAULT NULL,
    `profile_image` varchar(500) DEFAULT NULL,
    `created_at`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_login`    timestamp    NULL DEFAULT NULL,
    `is_active`     tinyint(1)   DEFAULT '1',
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 사용자 프로필 테이블 (user_profiles)
--    구독 플랜명만 저장. 결제 상세는 payment_methods / payments 테이블 참조
CREATE TABLE IF NOT EXISTS `user_profiles` (
    `id`              int          NOT NULL AUTO_INCREMENT,
    `user_id`         int          NOT NULL,
    `name`            varchar(100) DEFAULT NULL,
    `business_number` varchar(30)  DEFAULT NULL,
    `company_name`    varchar(200) DEFAULT NULL,
    `plan`            varchar(30)  DEFAULT NULL COMMENT '구독 플랜 (PRO 등)',
    `phone_number`    varchar(30)  DEFAULT NULL,
    `created_at`      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_profiles_user_id` (`user_id`),
    UNIQUE KEY `uk_user_profiles_business_number` (`business_number`),
    CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. 결제수단 테이블 (payment_methods)
--    카드 정보 + 자동갱신 설정 (user_id 기준 1:1)
CREATE TABLE IF NOT EXISTS `payment_methods` (
    `id`             int          NOT NULL AUTO_INCREMENT,
    `user_id`        int          NOT NULL,
    `method`         varchar(50)  DEFAULT NULL  COMMENT '결제수단 (card / kakao_pay 등)',
    `card_company`   varchar(50)  DEFAULT NULL  COMMENT '카드사명 (삼성, 신한 등)',
    `card_last4`     varchar(4)   DEFAULT NULL  COMMENT '카드 뒤 4자리',
    `monthly_amount` int          DEFAULT NULL  COMMENT '월 결제 금액 (원, 예: 9900)',
    `auto_renew`     tinyint(1)   NOT NULL DEFAULT 1 COMMENT '자동 갱신 여부 (1=ON, 0=OFF)',
    `created_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_payment_methods_user_id` (`user_id`),
    CONSTRAINT `fk_payment_methods_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 결제 이력 테이블 (payments)
--    구독 시작/만료일 포함
CREATE TABLE IF NOT EXISTS `payments` (
    `id`               bigint       NOT NULL AUTO_INCREMENT,
    `user_id`          bigint       NOT NULL                   COMMENT '결제한 사용자 ID',
    `amount`           int          NOT NULL                   COMMENT '결제 금액 (원, 예: 9900)',
    `plan`             varchar(20)  NOT NULL                   COMMENT '구독 플랜 (PRO 등)',
    `pay_method`       varchar(50)  DEFAULT NULL               COMMENT '결제 수단 (card, kakao_pay 등)',
    `status`           varchar(20)  NOT NULL DEFAULT 'success' COMMENT '결제 상태 (success|failed|cancelled|refunded)',
    `transaction_id`   varchar(200) DEFAULT NULL               COMMENT '외부 PG사 거래 ID',
    `plan_started_at`  datetime     DEFAULT NULL               COMMENT '구독 시작일',
    `plan_expires_at`  datetime     DEFAULT NULL               COMMENT '구독 만료일',
    `note`             varchar(500) DEFAULT NULL               COMMENT '비고 (수동 처리 사유 등)',
    `paid_at`          datetime     NOT NULL DEFAULT NOW()     COMMENT '결제 일시',
    PRIMARY KEY (`id`),
    KEY `idx_payments_user_id`  (`user_id`),
    KEY `idx_payments_status`   (`status`),
    KEY `idx_payments_paid_at`  (`paid_at`),
    CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='결제 이력';

-- 5. 구독 통합 뷰 (v_subscription)
--    user_profiles + payment_methods + payments(최신 1건) 조인
--    코드에서 단일 테이블처럼 FROM v_subscription WHERE user_id = ? 로 사용
CREATE OR REPLACE VIEW `v_subscription` AS
SELECT
    up.user_id,
    up.plan,
    p.plan_started_at,
    p.plan_expires_at,
    pm.method        AS pay_method,
    pm.auto_renew    AS pay_auto_renew,
    pm.card_company  AS pay_card_company,
    pm.card_last4    AS pay_card_last4,
    pm.monthly_amount AS pay_monthly_amt
FROM user_profiles up
LEFT JOIN payment_methods pm ON pm.user_id = up.user_id
LEFT JOIN payments p
    ON p.user_id = up.user_id
   AND p.status  = 'success'
   AND p.id = (
       SELECT MAX(id) FROM payments
       WHERE user_id = up.user_id AND status = 'success'
   );

-- 6. 채널(매체) 테이블 (channels)
CREATE TABLE IF NOT EXISTS `channels` (
    `id`           int(11)      NOT NULL AUTO_INCREMENT,
    `name`         varchar(100) NOT NULL,
    `channel_code` varchar(50)  DEFAULT NULL,
    `display_name` varchar(100) NOT NULL,
    `icon_url`     varchar(500) DEFAULT NULL,
    `is_active`    tinyint(1)   DEFAULT '1',
    PRIMARY KEY (`id`),
    UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. 마케팅 계정 테이블 (marketing_accounts)
CREATE TABLE IF NOT EXISTS `marketing_accounts` (
    `id`                  int(11)      NOT NULL AUTO_INCREMENT,
    `user_id`             int(11)      DEFAULT NULL,
    `channel_code`        varchar(50)  DEFAULT NULL,
    `account_name`        varchar(100) DEFAULT NULL,
    `access_token`        text,
    `auth_token`          text,
    `refresh_token`       text,
    `external_account_id` varchar(255) DEFAULT NULL,
    `connection_status`   tinyint(1)   DEFAULT '1',
    `created_at`          timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `user_id` (`user_id`),
    CONSTRAINT `marketing_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. 캠페인 테이블 (campaigns)
CREATE TABLE IF NOT EXISTS `campaigns` (
    `id`                   int(11)       NOT NULL AUTO_INCREMENT,
    `marketing_account_id` int(11)       DEFAULT NULL,
    `external_campaign_id` varchar(255)  DEFAULT NULL,
    `campaign_name`        varchar(255)  NOT NULL,
    `platform`             varchar(50)   NOT NULL,
    `status`               varchar(50)   DEFAULT 'active',
    `objective`            varchar(100)  DEFAULT NULL,
    `daily_budget`         decimal(12,2) DEFAULT '0.00',
    `total_budget`         decimal(12,2) DEFAULT '0.00',
    `start_date`           date          DEFAULT NULL,
    `end_date`             date          DEFAULT NULL,
    `created_at`           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_campaign` (`marketing_account_id`, `external_campaign_id`),
    CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`marketing_account_id`) REFERENCES `marketing_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. 캠페인 성과 지표 테이블 (campaign_metrics)
CREATE TABLE IF NOT EXISTS `campaign_metrics` (
    `id`              int(11)       NOT NULL AUTO_INCREMENT,
    `campaign_id`     int(11)       DEFAULT NULL,
    `metric_date`     date          NOT NULL,
    `hour`            int(11)       DEFAULT NULL,
    `impressions`     bigint(20)    DEFAULT '0',
    `clicks`          bigint(20)    DEFAULT '0',
    `ctr`             decimal(5,2)  DEFAULT '0.00',
    `cost`            decimal(12,2) DEFAULT '0.00',
    `cpc`             decimal(10,2) DEFAULT '0.00',
    `cpm`             decimal(10,2) DEFAULT '0.00',
    `conversions`     int(11)       DEFAULT '0',
    `conversion_rate` decimal(5,2)  DEFAULT '0.00',
    `cpa`             decimal(10,2) DEFAULT '0.00',
    `revenue`         decimal(12,2) DEFAULT '0.00',
    `roas`            decimal(10,2) DEFAULT '0.00',
    `roi`             decimal(10,2) DEFAULT '0.00',
    `likes`           int(11)       DEFAULT '0',
    `shares`          int(11)       DEFAULT '0',
    `comments`        int(11)       DEFAULT '0',
    `saves`           int(11)       DEFAULT '0',
    `created_at`      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_metric` (`campaign_id`, `metric_date`, `hour`),
    CONSTRAINT `campaign_metrics_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. 데이터 동기화 로그 테이블 (data_sync_logs)
CREATE TABLE IF NOT EXISTS `data_sync_logs` (
    `id`                   int(11)     NOT NULL AUTO_INCREMENT,
    `marketing_account_id` int(11)     DEFAULT NULL,
    `sync_type`            varchar(50) NOT NULL,
    `status`               varchar(50) NOT NULL,
    `records_synced`       int(11)     DEFAULT '0',
    `error_message`        text,
    `started_at`           timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at`         timestamp   NULL DEFAULT NULL,
    `created_at`           timestamp   NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `marketing_account_id` (`marketing_account_id`),
    CONSTRAINT `data_sync_logs_ibfk_1` FOREIGN KEY (`marketing_account_id`) REFERENCES `marketing_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. AI 소재 생성 이력 테이블 (creative_generations)
CREATE TABLE IF NOT EXISTS `creative_generations` (
    `id`               int          NOT NULL AUTO_INCREMENT,
    `user_id`          int          NOT NULL,
    `business_type`    varchar(100) NOT NULL,
    `product_name`     varchar(200) NOT NULL,
    `target_audience`  varchar(300) NOT NULL,
    `tone`             varchar(100) NOT NULL,
    `objective`        varchar(100) NOT NULL COMMENT '인지도/트래픽/전환',
    `additional_info`  text         DEFAULT NULL,
    `had_document`     tinyint(1)   DEFAULT 0 COMMENT 'PDF/문서 업로드 여부',
    `had_image`        tinyint(1)   DEFAULT 0 COMMENT '기존 광고 이미지 업로드 여부',
    `usp_analysis`     text         DEFAULT NULL,
    `generated_copies` json         NOT NULL   COMMENT '4개 매체별 카피 JSON',
    `visual_guide`     json         DEFAULT NULL,
    `strategy_summary` text         DEFAULT NULL,
    `compliance_notes` text         DEFAULT NULL,
    `user_rating`      tinyint      DEFAULT NULL COMMENT '사용자 만족도 1-5',
    `created_at`       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_creative_user`    (`user_id`),
    INDEX `idx_creative_created` (`created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_creative_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
