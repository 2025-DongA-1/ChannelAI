-- ChannelAI 현재 데이터베이스 스키마 (최종 수정 반영본)
-- 생성 일자: 2026-02-19
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS `users` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `email` varchar(255) NOT NULL,
    `password_hash` varchar(255) DEFAULT NULL,
    `name` varchar(100) DEFAULT NULL,
    `company_name` varchar(200) DEFAULT NULL,
    `role` varchar(50) DEFAULT 'user',
    `provider` varchar(50) DEFAULT 'local',
    `provider_id` varchar(255) DEFAULT NULL,
    `profile_image` varchar(500) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_login` timestamp NULL DEFAULT NULL,
    `is_active` tinyint(1) DEFAULT '1',
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- 2. 채널(매체) 테이블
CREATE TABLE IF NOT EXISTS `channels` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL,
    `channel_code` varchar(50) DEFAULT NULL,
    `display_name` varchar(100) NOT NULL,
    `icon_url` varchar(500) DEFAULT NULL,
    `is_active` tinyint(1) DEFAULT '1',
    PRIMARY KEY (`id`),
    UNIQUE KEY `name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- 3. 마케팅 계정 테이블
CREATE TABLE IF NOT EXISTS `marketing_accounts` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) DEFAULT NULL,
    `channel_code` varchar(50) DEFAULT NULL,
    `account_name` varchar(100) DEFAULT NULL,
    `access_token` text,
    `auth_token` text,
    `refresh_token` text,
    `external_account_id` varchar(255) DEFAULT NULL,
    `connection_status` tinyint(1) DEFAULT '1',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `user_id` (`user_id`),
    CONSTRAINT `marketing_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- 4. 캠페인 테이블
CREATE TABLE IF NOT EXISTS `campaigns` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `marketing_account_id` int(11) DEFAULT NULL,
    `external_campaign_id` varchar(255) DEFAULT NULL,
    `campaign_name` varchar(255) NOT NULL,
    `platform` varchar(50) NOT NULL,
    `status` varchar(50) DEFAULT 'active',
    `objective` varchar(100) DEFAULT NULL,
    `daily_budget` decimal(12, 2) DEFAULT '0.00',
    `total_budget` decimal(12, 2) DEFAULT '0.00',
    `start_date` date DEFAULT NULL,
    `end_date` date DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_campaign` (`marketing_account_id`, `external_campaign_id`),
    CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`marketing_account_id`) REFERENCES `marketing_accounts` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- 5. 캠페인 성과 지표 테이블
CREATE TABLE IF NOT EXISTS `campaign_metrics` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `campaign_id` int(11) DEFAULT NULL,
    `metric_date` date NOT NULL,
    `hour` int(11) DEFAULT NULL,
    `impressions` bigint(20) DEFAULT '0',
    `clicks` bigint(20) DEFAULT '0',
    `ctr` decimal(5, 2) DEFAULT '0.00',
    `cost` decimal(12, 2) DEFAULT '0.00',
    `cpc` decimal(10, 2) DEFAULT '0.00',
    `cpm` decimal(10, 2) DEFAULT '0.00',
    `conversions` int(11) DEFAULT '0',
    `conversion_rate` decimal(5, 2) DEFAULT '0.00',
    `cpa` decimal(10, 2) DEFAULT '0.00',
    `revenue` decimal(12, 2) DEFAULT '0.00',
    `roas` decimal(10, 2) DEFAULT '0.00',
    `roi` decimal(10, 2) DEFAULT '0.00',
    `likes` int(11) DEFAULT '0',
    `shares` int(11) DEFAULT '0',
    `comments` int(11) DEFAULT '0',
    `saves` int(11) DEFAULT '0',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_metric` (`campaign_id`, `metric_date`, `hour`),
    CONSTRAINT `campaign_metrics_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- 6. 데이터 동기화 로그 테이블
CREATE TABLE IF NOT EXISTS `data_sync_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `marketing_account_id` int(11) DEFAULT NULL,
    `sync_type` varchar(50) NOT NULL,
    `status` varchar(50) NOT NULL,
    `records_synced` int(11) DEFAULT '0',
    `error_message` text,
    `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at` timestamp NULL DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `marketing_account_id` (`marketing_account_id`),
    CONSTRAINT `data_sync_logs_ibfk_1` FOREIGN KEY (`marketing_account_id`) REFERENCES `marketing_accounts` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;