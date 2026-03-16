-- user_profiles 테이블에 구독 만료일 컬럼 추가
-- 실행: MySQL 콘솔 또는 DBeaver 등에서 한 번만 실행
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at DATETIME DEFAULT NULL
    COMMENT '구독 만료일 (NULL이면 무기한 또는 미구독)';
