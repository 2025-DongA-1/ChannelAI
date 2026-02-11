-- 당근마켓 플랫폼 마케팅 계정 및 캠페인 샘플 데이터
-- 실행 방법: docker exec -it marketing_postgres psql -U admin -d marketing_platform -f /path/to/add-karrot-data.sql

-- 1. 당근마켓 마케팅 계정 추가 (user_id = 1 기준)
INSERT INTO marketing_accounts (user_id, platform, account_id, account_name, is_connected, created_at, updated_at)
VALUES 
  (1, 'KARROT', 'karrot_acc_001', '당근마켓 비즈니스 계정', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (user_id, platform, account_id) DO NOTHING;

-- 2. 당근마켓 캠페인 추가
INSERT INTO campaigns (
  marketing_account_id, 
  campaign_id, 
  campaign_name, 
  platform, 
  status, 
  objective, 
  daily_budget, 
  total_budget, 
  start_date, 
  end_date, 
  created_at, 
  updated_at
)
SELECT 
  ma.id,
  'karrot_campaign_001',
  '강남구 중고거래 프로모션',
  'KARROT',
  'active',
  'LOCAL_AWARENESS',
  50000,
  1500000,
  '2025-12-01',
  '2026-01-31',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM marketing_accounts ma
WHERE ma.user_id = 1 AND ma.platform = 'KARROT' AND ma.account_id = 'karrot_acc_001'
ON CONFLICT (marketing_account_id, campaign_id) DO NOTHING;

INSERT INTO campaigns (
  marketing_account_id, 
  campaign_id, 
  campaign_name, 
  platform, 
  status, 
  objective, 
  daily_budget, 
  total_budget, 
  start_date, 
  end_date, 
  created_at, 
  updated_at
)
SELECT 
  ma.id,
  'karrot_campaign_002',
  '부산 해운대 동네가게 홍보',
  'KARROT',
  'active',
  'STORE_VISITS',
  30000,
  900000,
  '2025-12-15',
  '2026-02-15',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM marketing_accounts ma
WHERE ma.user_id = 1 AND ma.platform = 'KARROT' AND ma.account_id = 'karrot_acc_001'
ON CONFLICT (marketing_account_id, campaign_id) DO NOTHING;

INSERT INTO campaigns (
  marketing_account_id, 
  campaign_id, 
  campaign_name, 
  platform, 
  status, 
  objective, 
  daily_budget, 
  total_budget, 
  start_date, 
  end_date, 
  created_at, 
  updated_at
)
SELECT 
  ma.id,
  'karrot_campaign_003',
  '대전 둔산동 부동산 광고',
  'KARROT',
  'active',
  'LEAD_GENERATION',
  40000,
  1200000,
  '2026-01-01',
  '2026-02-28',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM marketing_accounts ma
WHERE ma.user_id = 1 AND ma.platform = 'KARROT' AND ma.account_id = 'karrot_acc_001'
ON CONFLICT (marketing_account_id, campaign_id) DO NOTHING;

-- 3. 당근마켓 캠페인 메트릭 데이터 생성 (최근 30일)
-- 지역 기반 특성: 높은 전환율, 낮은 CPC
DO $$
DECLARE
  campaign_record RECORD;
  metric_date DATE;
  base_impressions INTEGER;
  base_clicks INTEGER;
  base_conversions INTEGER;
  base_cost NUMERIC;
  base_revenue NUMERIC;
BEGIN
  -- 당근마켓 캠페인들에 대해
  FOR campaign_record IN 
    SELECT c.id 
    FROM campaigns c
    JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
    WHERE ma.platform = 'KARROT' AND ma.user_id = 1
  LOOP
    -- 최근 30일 메트릭 생성
    FOR i IN 0..29 LOOP
      metric_date := CURRENT_DATE - i;
      
      -- 당근마켓 특성: 지역 기반 높은 전환율
      base_impressions := 8000 + floor(random() * 15000)::INTEGER;
      base_clicks := floor(base_impressions * (0.03 + random() * 0.05))::INTEGER; -- CTR 3-8%
      base_conversions := floor(base_clicks * (0.10 + random() * 0.15))::INTEGER; -- CVR 10-25%
      base_cost := base_clicks * (100 + random() * 200); -- CPC 100-300원
      base_revenue := base_conversions * (10000 + random() * 15000); -- 객단가 1-2.5만원
      
      -- 메트릭 삽입
      INSERT INTO campaign_metrics (
        campaign_id,
        date,
        impressions,
        clicks,
        conversions,
        cost,
        revenue,
        created_at,
        updated_at
      )
      VALUES (
        campaign_record.id,
        metric_date,
        base_impressions,
        base_clicks,
        base_conversions,
        base_cost,
        base_revenue,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (campaign_id, date) DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        conversions = EXCLUDED.conversions,
        cost = EXCLUDED.cost,
        revenue = EXCLUDED.revenue,
        updated_at = CURRENT_TIMESTAMP;
    END LOOP;
  END LOOP;
END $$;

-- 결과 확인
SELECT 
  c.campaign_name,
  c.platform,
  COUNT(cm.id) as metric_count,
  SUM(cm.impressions) as total_impressions,
  SUM(cm.clicks) as total_clicks,
  SUM(cm.conversions) as total_conversions,
  SUM(cm.cost) as total_cost,
  SUM(cm.revenue) as total_revenue
FROM campaigns c
LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
WHERE c.platform = 'KARROT'
GROUP BY c.id, c.campaign_name, c.platform;

COMMIT;
