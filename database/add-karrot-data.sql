-- ============================================
-- 기초 데이터 (채널 정보 + 당근마켓 샘플 데이터)
-- DB: cgi_25K_DA1_p3_1 @ project-db-cgi.smhrd.com:3307
-- DB 요구사항 분석서 기반 재설계
-- ============================================

-- 기본 채널 정보 등록
INSERT IGNORE INTO channels (channel_code, channel_name) VALUES
('google', 'Google Ads'),
('meta', 'Meta (Facebook/Instagram)'),
('naver', '네이버 광고'),
('kakao', '카카오 광고'),
('karrot', '당근마켓 광고');

-- ============================================
-- 당근마켓 샘플 데이터
-- ============================================

-- 샘플 사용자 (이미 존재하면 무시)
INSERT IGNORE INTO users (email, password_hash, name, role)
VALUES ('demo@example.com', '$2b$10$placeholder', '데모 사용자', 'user');

SET @demo_user_id = (SELECT id FROM users WHERE email = 'demo@example.com' LIMIT 1);

-- 당근마켓 마케팅 계정
INSERT IGNORE INTO marketing_accounts (user_id, channel_code, external_account_id, account_name, connection_status)
VALUES (@demo_user_id, 'karrot', 'karrot_demo_001', '당근마켓 비즈프로필 - 데모', 1);

SET @karrot_account_id = (SELECT id FROM marketing_accounts WHERE external_account_id = 'karrot_demo_001' LIMIT 1);

-- 당근마켓 캠페인 데이터
INSERT IGNORE INTO campaigns (marketing_account_id, external_campaign_id, campaign_name, status, daily_budget, total_budget)
VALUES
(@karrot_account_id, 'karrot_camp_001', '동네 맛집 홍보 캠페인', 'active', 50000, 1500000),
(@karrot_account_id, 'karrot_camp_002', '신규 고객 유치 캠페인', 'active', 80000, 2400000),
(@karrot_account_id, 'karrot_camp_003', '지역 이벤트 홍보', 'paused', 30000, 900000);

SET @camp1_id = (SELECT id FROM campaigns WHERE external_campaign_id = 'karrot_camp_001' LIMIT 1);
SET @camp2_id = (SELECT id FROM campaigns WHERE external_campaign_id = 'karrot_camp_002' LIMIT 1);
SET @camp3_id = (SELECT id FROM campaigns WHERE external_campaign_id = 'karrot_camp_003' LIMIT 1);

-- 캠페인 성과 지표 (최근 7일간 샘플 데이터)
INSERT IGNORE INTO campaign_metrics (campaign_id, metric_date, impressions, clicks, cost, conversions, revenue)
VALUES
-- 캠페인 1: 동네 맛집 홍보
(@camp1_id, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 12000, 480, 45000, 24, 120000),
(@camp1_id, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 13500, 540, 47000, 27, 135000),
(@camp1_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 11000, 440, 42000, 22, 110000),
(@camp1_id, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 14000, 560, 49000, 28, 140000),
(@camp1_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 15000, 600, 50000, 30, 150000),
(@camp1_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 13000, 520, 46000, 26, 130000),
(@camp1_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 14500, 580, 48000, 29, 145000),

-- 캠페인 2: 신규 고객 유치
(@camp2_id, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 20000, 1000, 75000, 50, 250000),
(@camp2_id, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 22000, 1100, 78000, 55, 275000),
(@camp2_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 18000, 900, 70000, 45, 225000),
(@camp2_id, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 21000, 1050, 77000, 52, 260000),
(@camp2_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 23000, 1150, 80000, 57, 285000),
(@camp2_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 19000, 950, 72000, 47, 235000),
(@camp2_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 21500, 1075, 76000, 53, 265000),

-- 캠페인 3: 지역 이벤트 홍보
(@camp3_id, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 8000, 320, 28000, 16, 80000),
(@camp3_id, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 8500, 340, 29000, 17, 85000),
(@camp3_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 7500, 300, 26000, 15, 75000),
(@camp3_id, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 9000, 360, 30000, 18, 90000),
(@camp3_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 8200, 328, 28500, 16, 82000),
(@camp3_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 7800, 312, 27000, 15, 78000),
(@camp3_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 8800, 352, 29500, 17, 88000);

-- 인사이트 데이터
INSERT IGNORE INTO insights (user_id, type, title, content, priority)
VALUES
(@demo_user_id, 'opportunity', '맛집 캠페인 예산 증액 권장', '최근 7일간 ROAS가 2.8 이상으로 안정적입니다. 일일 예산을 20% 증액하면 전환이 더 늘어날 것으로 예상됩니다.', 1),
(@demo_user_id, 'recommendation', '타겟 연령대 조정 제안', '25-34세 연령대에서 전환율이 가장 높습니다. 해당 연령대 비중을 높이면 CPA를 10% 절감할 수 있습니다.', 2),
(@demo_user_id, 'warning', '이벤트 캠페인 예산 소진 임박', '현재 예산 소진률이 85%입니다. 캠페인 종료일까지 예산이 부족할 수 있습니다.', 1);
