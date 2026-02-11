# 🥕 당근마켓 비즈니스 광고 플랫폼 연동 가이드

## 개요
당근마켓은 지역 기반 커뮤니티 마케팅 플랫폼으로, 우리 플랫폼에서 통합 관리할 수 있습니다.

## 주요 특징
- ✅ **지역 타겟팅**: 특정 동네/구 단위로 정밀한 광고 집행
- ✅ **높은 전환율**: 동네 기반 신뢰도로 일반 플랫폼 대비 10-25% 전환율
- ✅ **낮은 CPC**: 평균 100-300원의 저렴한 클릭 단가
- ✅ **다양한 카테고리**: 중고거래, 동네가게, 부동산, 알바 등

## 연동 방법

### 1. 당근마켓 비즈니스 계정 생성
1. [당근마켓 비즈니스](https://business.daangn.com) 방문
2. 비즈니스 계정 가입
3. 광고 계정 생성

### 2. 플랫폼 연동
1. 우리 플랫폼 → **연동 관리** 페이지 이동
2. **당근마켓 비즈니스** 카드에서 **연동하기** 클릭
3. 당근마켓 OAuth 인증 페이지에서 권한 승인
4. 자동으로 캠페인 및 데이터 동기화

### 3. 환경 변수 설정 (개발자용)
\`\`\`env
# backend/.env
KARROT_CLIENT_ID=your_karrot_client_id
KARROT_CLIENT_SECRET=your_karrot_client_secret
KARROT_REDIRECT_URI=http://localhost:3000/api/v1/auth/karrot/callback
\`\`\`

## API 사용 예시

### 캠페인 목록 조회
\`\`\`typescript
import KarrotAdsService from './services/external/karrotAdsService';

const karrotService = new KarrotAdsService(accessToken);
const campaigns = await karrotService.getCampaigns();
\`\`\`

### 지역별 성과 분석
\`\`\`typescript
const regionalData = await karrotService.getRegionalPerformance(campaignId);
// 결과: 서울 강남구, 부산 해운대구 등 지역별 세부 성과
\`\`\`

### 카테고리별 성과 분석
\`\`\`typescript
const categoryData = await karrotService.getCategoryPerformance(campaignId);
// 결과: 중고거래, 동네가게, 알바 등 카테고리별 성과
\`\`\`

## 샘플 데이터
개발/테스트를 위한 샘플 데이터가 포함되어 있습니다:

### 캠페인
1. **강남구 중고거래 프로모션**
   - 일 예산: 50,000원
   - 지역: 서울 강남구, 서초구
   - 목표: 지역 인지도 향상

2. **부산 해운대 동네가게 홍보**
   - 일 예산: 30,000원
   - 지역: 부산 해운대구, 수영구
   - 목표: 매장 방문 증대

3. **대전 둔산동 부동산 광고**
   - 일 예산: 40,000원
   - 지역: 대전 둔산동
   - 목표: 리드 생성

### 성과 특성
- **CTR**: 3-8% (일반 플랫폼 대비 2-3배)
- **전환율**: 10-25% (지역 기반 신뢰도)
- **CPC**: 100-300원 (저렴한 광고 단가)
- **ROAS**: 1.5-2.5x (높은 투자 대비 수익)

## 프론트엔드 통합

### 플랫폼 색상
\`\`\`typescript
// utils.ts
export function getPlatformColor(platform: string) {
  if (platform === 'KARROT' || platform === 'karrot') {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
}
\`\`\`

### 플랫폼 이름
\`\`\`typescript
export function getPlatformName(platform: string) {
  if (platform === 'KARROT' || platform === 'karrot') {
    return '당근마켓 비즈니스';
  }
}
\`\`\`

## 데이터베이스 스키마

### 마케팅 계정
\`\`\`sql
INSERT INTO marketing_accounts (user_id, platform, account_id, account_name)
VALUES (1, 'KARROT', 'karrot_acc_001', '당근마켓 비즈니스 계정');
\`\`\`

### 캠페인
\`\`\`sql
INSERT INTO campaigns (
  marketing_account_id, campaign_id, campaign_name, 
  platform, status, objective, daily_budget
)
VALUES (
  1, 'karrot_campaign_001', '강남구 중고거래 프로모션',
  'KARROT', 'active', 'LOCAL_AWARENESS', 50000
);
\`\`\`

## 당근마켓 특화 기능

### 1. 지역별 성과 분석
동네/구 단위로 광고 성과를 세분화하여 분석

### 2. 카테고리 타겟팅
- 중고거래
- 동네가게
- 동네소식
- 알바
- 부동산
- 차량

### 3. 시간대별 최적화
지역 주민들의 활동 시간에 맞춘 광고 노출

## 실전 활용 팁

### 1. 지역 설정
- 반경 3km 이내 타겟팅 권장
- 상권 분석 후 인접 동네 포함

### 2. 예산 배분
- 초기: 일 3만원으로 테스트
- 성과 확인 후 점진적 증액
- ROAS 2.0 이상 시 적극 투자

### 3. 소재 제작
- 동네 친화적인 톤앤매너
- 실제 매장/상품 사진 사용
- 지역 키워드 포함 ("OO동", "OO역")

## 문의 및 지원
- 당근마켓 비즈니스: https://business.daangn.com
- 고객센터: business@daangn.com
- 가이드: https://business-guide.daangn.com

## 라이선스
당근마켓 API 사용은 당근마켓의 이용약관을 따릅니다.
