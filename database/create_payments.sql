-- payments 테이블: 결제 이력 관리
-- 실행: 서버 시작 시 app.ts에서 자동 생성 (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS payments (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT       NOT NULL                    COMMENT '결제한 사용자 ID',
  amount         INT          NOT NULL                    COMMENT '결제 금액 (원, 예: 9900)',
  plan           VARCHAR(20)  NOT NULL                    COMMENT '구독 플랜 (PRO 등)',
  pay_method     VARCHAR(50)  DEFAULT NULL                COMMENT '결제 수단 (card, kakao_pay 등)',
  status         VARCHAR(20)  NOT NULL DEFAULT 'success'  COMMENT '결제 상태 (success|failed|cancelled|refunded)',
  transaction_id VARCHAR(200) DEFAULT NULL                COMMENT '외부 PG사 거래 ID',
  period_start   DATETIME     DEFAULT NULL                COMMENT '구독 시작일',
  period_end     DATETIME     DEFAULT NULL                COMMENT '구독 만료일',
  note           VARCHAR(500) DEFAULT NULL                COMMENT '비고 (수동 처리 사유 등)',
  paid_at        DATETIME     NOT NULL DEFAULT NOW()      COMMENT '결제 일시',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_payments_user_id (user_id),
  INDEX idx_payments_status  (status),
  INDEX idx_payments_paid_at (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='결제 이력';
