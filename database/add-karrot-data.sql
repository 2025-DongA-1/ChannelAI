-- ============================================
-- 기초 데이터 (채널 정보 + 당근마켓 샘플 데이터)
-- DB: cgi_25K_DA1_p3_1 @ project-db-cgi.smhrd.com:3307
-- ============================================

-- 기본 채널 정보 등록
INSERT IGNORE INTO channels (name, platform, display_name) VALUES
('google_search', 'google', 'Google 검색광고'),
('google_display', 'google', 'Google 디스플레이'),
('youtube', 'google', 'YouTube 광고'),
('facebook', 'meta', 'Facebook 광고'),
('instagram', 'meta', 'Instagram 광고'),
('naver_search', 'naver', '네이버 검색광고'),
('naver_display', 'naver', '네이버 디스플레이'),
('kakao', 'kakao', '카카오 광고'),
('karrot', 'karrot', '당근마켓 광고');

-- ============================================
-- 당근마켓 샘플 데이터
-- ============================================

-- 샘플 사용자 (이미 존재하면 무시)
INSERT IGNORE INTO users (email, password_hash, name, company_name, role)
VALUES ('demo@example.com', '$2b$10$placeholder', '데모 사용자', '데모 회사', 'user');

SET @demo_user_id = (SELECT id FROM users WHERE email = 'demo@example.com' LIMIT 1);

-- 당근마켓 마케팅 계정
INSERT IGNORE INTO marketing_accounts (user_id, platform, account_id, account_name, is_connected)
VALUES (@demo_user_id, 'karrot', 'karrot_demo_001', '당근마켓 비즈프로필 - 데모', 1);

SET @karrot_account_id = (SELECT id FROM marketing_accounts WHERE account_id = 'karrot_demo_001' LIMIT 1);

-- 당근마켓 캠페인 데이터
INSERT IGNORE INTO campaigns (marketing_account_id, campaign_id, campaign_name, platform, status, objective, daily_budget, total_budget, start_date, end_date)
VALUES
(@karrot_account_id, 'karrot_camp_001', '동네 맛집 홍보 캠페인', 'karrot', 'active', 'awareness', 50000, 1500000, '2026-01-01', '2026-03-31'),
(@karrot_account_id, 'karrot_camp_002', '신규 고객 유치 캠페인', 'karrot', 'active', 'conversion', 80000, 2400000, '2026-01-15', '2026-04-15'),
(@karrot_account_id, 'karrot_camp_003', '지역 이벤트 홍보', 'karrot', 'paused', 'consideration', 30000, 900000, '2026-02-01', '2026-02-28');

SET @camp1_id = (SELECT id FROM campaigns WHERE campaign_id = 'karrot_camp_001' LIMIT 1);
SET @camp2_id = (SELECT id FROM campaigns WHERE campaign_id = 'karrot_camp_002' LIMIT 1);
SET @camp3_id = (SELECT id FROM campaigns WHERE campaign_id = 'karrot_camp_003' LIMIT 1);

-- 캠페인 성과 지표 (최근 7일간 샘플 데이터)
INSERT IGNORE INTO campaign_metrics (campaign_id, date, impressions, clicks, cost, conversions, revenue)
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

-- 채널 성과 데이터
SET @karrot_channel_id = (SELECT id FROM channels WHERE name = 'karrot' LIMIT 1);

INSERT IGNORE INTO channel_performance (user_id, channel_id, date, total_spend, total_impressions, total_clicks, total_conversions, total_revenue, avg_cpc, avg_ctr, avg_roas)
VALUES
(@demo_user_id, @karrot_channel_id, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 148000, 40000, 1800, 90, 450000, 82.22, 4.50, 3.04),
(@demo_user_id, @karrot_channel_id, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 154000, 44000, 1980, 99, 495000, 77.78, 4.50, 3.21),
(@demo_user_id, @karrot_channel_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 138000, 36500, 1640, 82, 410000, 84.15, 4.49, 2.97),
(@demo_user_id, @karrot_channel_id, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 156000, 44000, 1970, 98, 490000, 79.19, 4.48, 3.14),
(@demo_user_id, @karrot_channel_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 158500, 46200, 2078, 103, 517000, 76.32, 4.50, 3.26),
(@demo_user_id, @karrot_channel_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 145000, 39800, 1782, 88, 443000, 81.37, 4.48, 3.06),
(@demo_user_id, @karrot_channel_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 153500, 44800, 2007, 99, 498000, 76.48, 4.48, 3.24);

-- 인사이트 데이터
INSERT IGNORE INTO insights (user_id, campaign_id, type, category, title, description, priority, potential_impact, suggested_action)
VALUES
(@demo_user_id, @camp1_id, 'opportunity', 'budget', '맛집 캠페인 예산 증액 권장', '최근 7일간 ROAS가 2.8 이상으로 안정적입니다. 일일 예산을 20% 증액하면 전환이 더 늘어날 것으로 예상됩니다.', 'high', 15.5, '일일 예산을 50,000원에서 60,000원으로 증액'),
(@demo_user_id, @camp2_id, 'recommendation', 'targeting', '타겟 연령대 조정 제안', '25-34세 연령대에서 전환율이 가장 높습니다. 해당 연령대 비중을 높이면 CPA를 10% 절감할 수 있습니다.', 'medium', 10.0, '25-34세 타겟 비중 강화'),
(@demo_user_id, @camp3_id, 'warning', 'budget', '이벤트 캠페인 예산 소진 임박', '현재 예산 소진률이 85%입니다. 캠페인 종료일까지 예산이 부족할 수 있습니다.', 'high', -5.0, '예산 추가 배정 또는 일일 예산 조정 필요');
