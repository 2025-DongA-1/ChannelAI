-- ============================================
-- creative_generations 테이블: AI 소재 생성 이력
-- Channel AI 마케팅 소재 에이전트
-- ============================================

CREATE TABLE IF NOT EXISTS creative_generations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    target_audience VARCHAR(300) NOT NULL,
    tone VARCHAR(100) NOT NULL,
    objective VARCHAR(100) NOT NULL COMMENT '인지도/트래픽/전환',
    additional_info TEXT DEFAULT NULL,
    had_document TINYINT(1) DEFAULT 0 COMMENT 'PDF/문서 업로드 여부',
    had_image TINYINT(1) DEFAULT 0 COMMENT '기존 광고 이미지 업로드 여부',
    usp_analysis TEXT DEFAULT NULL COMMENT 'USP 분석 결과',
    generated_copies JSON NOT NULL COMMENT '4개 매체별 카피 JSON',
    visual_guide JSON DEFAULT NULL COMMENT '비주얼 가이드 JSON',
    strategy_summary TEXT DEFAULT NULL COMMENT '통합 전략 요약',
    compliance_notes TEXT DEFAULT NULL COMMENT '매체별 준수사항',
    user_rating TINYINT DEFAULT NULL COMMENT '사용자 만족도 1-5',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_creative_user (user_id),
    INDEX idx_creative_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
