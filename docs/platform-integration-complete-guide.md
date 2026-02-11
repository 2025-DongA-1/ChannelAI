# 광고 플랫폼별 API 연동 완전 가이드 (학생 프로젝트용)

## 📊 플랫폼별 비교표

| 플랫폼 | 난이도 | 사업자 필요 | 심사 기간 | 학생 프로젝트 | 권장도 |
|--------|--------|-------------|-----------|--------------|--------|
| **Naver Ads** | 🟢 쉬움 | 선택 | 1-3일 | ✅ 매우 좋음 | ⭐⭐⭐ |
| **Meta Ads** | 🟡 보통 | 필수 | 3-7일 | 🟡 교육기관 명의 | ⭐⭐ |
| **Google Ads** | 🔴 어려움 | 필수 | 2-4주 | ❌ 어려움 | ⭐ |
| **Kakao Moment** | 🟡 보통 | 권장 | 5-7일 | 🟡 가능 | ⭐ |
| **당근마켓** | ⚫ 불가 | 협의 | - | ❌ Mock만 | - |

---

## 🟢 1. Naver Ads API (최우선 추천!)

### ✅ 학생 프로젝트에 가장 적합한 이유
- 개인 계정으로 신청 가능
- 광고 집행 이력 불필요
- 빠른 승인 (1-3일)
- 한국어 문서 완벽
- 테스트 환경 제공

### 📋 필요 사항
```
✅ 네이버 계정 (무료)
✅ 서비스 URL (localhost도 가능)
🟡 개인정보처리방침 (선택, 있으면 좋음)
❌ 사업자 등록증 (불필요!)
```

### 🚀 시작 절차

#### Step 1: 네이버 개발자 센터 가입
```
1. https://developers.naver.com 접속
2. 네이버 아이디로 로그인
3. "Application > 애플리케이션 등록" 클릭
```

#### Step 2: 애플리케이션 등록
```
애플리케이션 이름: NKLE 마케팅 플랫폼
사용 API:
  ☑ 네이버 로그인
  ☑ 회원 프로필 조회

서비스 URL: http://localhost:3001

Callback URL:
  http://localhost:3000/api/v1/integration/naver/callback
  http://192.168.219.90:3000/api/v1/integration/naver/callback
```

**결과:** Client ID, Client Secret 즉시 발급 ✅

#### Step 3: 네이버 검색광고 계정 생성
```
1. https://searchad.naver.com 접속
2. 회원가입 (네이버 아이디로)
3. 광고주 정보 입력
   - 개인/사업자 선택: 개인 선택 가능!
   - 실제 광고 집행 안 해도 됨
```

#### Step 4: 광고 API 신청
```
1. searchad.naver.com 로그인
2. 상단 메뉴 > 도구 > API 관리
3. "API 이용 신청" 클릭
4. 정보 입력:
   - 애플리케이션 이름: NKLE
   - 용도: 교육/연구 프로젝트
   - 네이버 개발자센터 Client ID 입력
```

**승인:** 1-3 영업일 ⏱️

#### Step 5: Customer ID 및 License 발급
```
승인 후 자동 발급:
- Customer ID (광고 계정 ID)
- API License Key
- Secret Key
```

### 💾 환경 변수 설정
```env
# backend/.env
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
NAVER_API_KEY=your_api_license_key
NAVER_SECRET_KEY=your_secret_key
NAVER_CUSTOMER_ID=your_customer_id
```

### 🔗 참고 링크
- 개발자 센터: https://developers.naver.com
- 검색광고: https://searchad.naver.com
- API 문서: https://naver.github.io/searchad-apidoc/

---

## 🟡 2. Meta (Facebook) Ads API

### 📌 현재 계획: 교육 기관 명의

### 필요한 협조 사항

#### 스마트인재개발원 또는 동아일보
```
요청 서류:
1. ✅ 사업자 등록증 사본
2. ✅ 담당자 신분증 사본
3. ✅ 공식 이메일 계정 사용 승인
4. ✅ 프로젝트 승인 공문 (선택)
```

#### 비즈니스 인증 절차
```
1. https://business.facebook.com 접속
2. 비즈니스 계정 생성
   - 이름: 스마트인재개발원 (또는 동아일보)
   
3. 비즈니스 정보 입력
   - 법인명
   - 사업자 번호
   - 주소
   - 담당자 정보

4. 서류 업로드
   - 사업자 등록증
   - 담당자 신분증

5. 비즈니스 인증 제출
   예상 소요: 3-5 영업일
```

### 담당자 미팅 준비

#### 요청 내용 예시
```
안녕하세요,

현재 스마트인재개발원 AI 훈련 과정에서
멀티채널 마케팅 플랫폼 프로젝트를 진행하고 있습니다.

Meta(Facebook) Ads API 연동을 위해
교육 기관 명의의 비즈니스 인증이 필요합니다.

필요 사항:
1. 사업자 등록증 사본
2. 담당자 신분증 사본
3. 공식 이메일 사용 승인
4. 비즈니스 인증 진행 협조

프로젝트 기간: 2026년 2월 ~ 4월
목적: 교육 과정 졸업 프로젝트

협조 가능하신지 검토 부탁드립니다.
```

### 📅 예상 일정
```
Week 1: 담당자 미팅 및 서류 요청
Week 2: 비즈니스 인증 신청
Week 3: 승인 대기 (3-5 영업일)
Week 4: 앱 설정 완료 및 OAuth 연동
```

---

## 🔴 3. Google Ads API (장기 목표)

### ⚠️ 학생 프로젝트에 부적합

### 높은 진입 장벽
```
필수 요구사항:
❌ 관리자 계정(MCC) 필요
❌ 최소 $50 광고 집행 이력
❌ 90일 이상 계정 활동
❌ 사업자 등록증 필수
❌ Developer Token 승인 (2-4주)
```

### 현실적 대안

#### 옵션 A: Mock 데이터 (추천)
```javascript
// Mock Google Ads 데이터로 UI만 구현
const mockGoogleAdsData = {
  campaigns: [...],
  metrics: {...}
};
```

#### 옵션 B: 테스트 계정 (Google 제공)
```
- Google Ads API Test Account 신청
- 제한적 기능
- 실제 데이터 없음
- 문서: https://developers.google.com/google-ads/api/docs/first-call/test-account
```

#### 옵션 C: 교육 기관 계정 활용
```
만약 스마트인재개발원이나 동아일보에서
이미 Google Ads를 사용 중이라면:
- 기존 계정의 MCC 권한 요청
- 테스트용 하위 계정 생성
```

### 📝 향후 상용화 시
```
졸업 후 실제 서비스 런칭 시:
1. 개인 사업자 등록
2. Google Ads 계정 생성 및 $50 광고 집행
3. MCC 계정 업그레이드
4. Developer Token 신청
5. Basic → Standard Access 업그레이드
```

---

## 🟡 4. Kakao Moment API (선택사항)

### 📌 카카오톡 광고 플랫폼

### 장점
- 한국 시장 특화
- 카카오톡 메시지 광고
- 비교적 간단한 절차

### 필요 사항
```
✅ 카카오 개발자 계정
✅ 카카오 비즈니스 계정
🟡 사업자 등록증 (권장)
```

### 시작 절차
```
1. https://developers.kakao.com 가입
2. 애플리케이션 등록
3. https://moment.kakao.com 에서 광고 계정 생성
4. API 권한 신청
```

### ⏱️ 예상 승인: 5-7일

### 🎓 학생 프로젝트 적합성: 🟡 가능하지만 우선순위 낮음

**이유:**
- Naver가 더 쉽고 빠름
- Meta와 Naver로 충분
- 시간 제약 고려

---

## ⚫ 5. 당근마켓 광고 API

### 🚨 현실: 공식 API 없음

당근마켓은 현재 **공개 API를 제공하지 않습니다.**

### 대안

#### Option 1: Mock 데이터 (권장)
```javascript
// frontend/src/services/daangnMockData.ts
export const mockDaangnData = {
  campaigns: [
    {
      id: 'daangn-001',
      name: '중고거래 홍보',
      status: 'active',
      metrics: {
        impressions: 15000,
        clicks: 450,
        conversions: 23
      }
    }
  ]
};
```

#### Option 2: UI만 구현
```
- 당근마켓 연동 UI 디자인
- "연동 준비 중" 표시
- 향후 확장 계획으로 설명
```

#### Option 3: 비즈니스 제휴 (장기)
```
상용화 시:
1. business@daangn.com 문의
2. 파트너십 제안서 제출
3. 개별 협의
```

---

## 🎯 프로젝트 일정표 (4주 계획)

### Week 1 (2/2 ~ 2/9) - Naver 집중

**Day 1-2: Naver 개발자 등록**
```bash
✅ 네이버 개발자 센터 가입
✅ 애플리케이션 등록
✅ Client ID/Secret 발급
```

**Day 3-5: Naver 광고 API**
```bash
✅ 검색광고 계정 생성
✅ API 이용 신청
⏱️ 승인 대기 (1-3일)
```

**Day 6-7: 코드 구현 시작**
```bash
✅ naverAdsService.ts 작성
✅ OAuth 플로우 구현
```

---

### Week 2 (2/10 ~ 2/16) - Meta 협조 + Naver 완성

**Day 1-3: Meta 교육 기관 협조**
```bash
✅ 담당자 미팅 일정 잡기
✅ 필요 서류 목록 전달
✅ 비즈니스 인증 신청
```

**Day 4-7: Naver 연동 완성**
```bash
✅ Naver API Customer ID 발급됨
✅ 실제 광고 데이터 연동
✅ 대시보드에 Naver 데이터 표시
```

---

### Week 3 (2/17 ~ 2/23) - Meta 완성 + 통합

**Day 1-4: Meta 승인 완료 (예상)**
```bash
✅ 비즈니스 인증 승인
✅ Meta OAuth 설정
✅ 실제 Meta 광고 데이터 연동
```

**Day 5-7: 통합 대시보드**
```bash
✅ Naver + Meta 데이터 통합
✅ 비교 분석 기능
✅ AI 추천 적용
```

---

### Week 4 (2/24 ~ 3/2) - Mock 데이터 + 완성

**Day 1-3: Mock 데이터 추가**
```bash
✅ Google Ads Mock 데이터
✅ 당근마켓 Mock 데이터
✅ Kakao Moment Mock 데이터 (선택)
```

**Day 4-7: 최종 마무리**
```bash
✅ UI/UX 개선
✅ 버그 수정
✅ 시연 준비
✅ 발표 자료 작성
```

---

## 💻 코드 구현 순서

### 1단계: Naver Ads Service

```typescript
// backend/src/services/external/naverAdsService.ts
import axios from 'axios';

export class NaverAdsService implements IAdService {
  private readonly baseUrl = 'https://api.naver.com';
  private readonly customerID: string;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor() {
    this.customerID = process.env.NAVER_CUSTOMER_ID || '';
    this.apiKey = process.env.NAVER_API_KEY || '';
    this.secretKey = process.env.NAVER_SECRET_KEY || '';
  }

  // OAuth URL 생성
  getAuthUrl(redirectUri: string, state: string): string {
    return `https://nid.naver.com/oauth2.0/authorize?...`;
  }

  // 캠페인 조회
  async getCampaigns(accessToken: string): Promise<AdCampaign[]> {
    const response = await axios.get(
      `${this.baseUrl}/ncc/campaigns`,
      {
        headers: {
          'X-API-KEY': this.apiKey,
          'X-Customer': this.customerID,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    return this.formatCampaigns(response.data);
  }

  // 성과 데이터 조회
  async getMetrics(accessToken: string, campaignId: string): Promise<AdMetrics> {
    // 구현...
  }
}
```

### 2단계: Controller 추가

```typescript
// backend/src/controllers/integrationController.ts

// Naver OAuth 시작
export const getNaverAuthUrl = async (req: Request, res: Response) => {
  const naverService = new NaverAdsService();
  const state = generateRandomState();
  const redirectUri = process.env.NAVER_REDIRECT_URI || '';
  
  const authUrl = naverService.getAuthUrl(redirectUri, state);
  
  res.json({ authUrl });
};

// Naver OAuth 콜백
export const handleNaverCallback = async (req: Request, res: Response) => {
  // 구현...
};
```

### 3단계: Routes 추가

```typescript
// backend/src/routes/integrationRoutes.ts
router.get('/naver/auth', getNaverAuthUrl);
router.get('/naver/callback', handleNaverCallback);
router.get('/naver/campaigns', getNaverCampaigns);
router.get('/naver/metrics/:campaignId', getNaverMetrics);
```

---

## 📊 최종 플랫폼 구성

### 실제 연동 (Real API)
```
✅ Naver Ads - 주 플랫폼
✅ Meta Ads - 글로벌 플랫폼
```

### Mock 데이터
```
📝 Google Ads - 향후 확장
📝 당근마켓 - API 없음
📝 Kakao Moment - 선택사항
```

### 시연 화면
```
[통합 대시보드]
├── Naver Ads (실제 데이터) ✅
├── Meta Ads (실제 데이터) ✅
├── Google Ads (Mock) 📝
├── 당근마켓 (Mock) 📝
└── AI 추천 (실제 데이터 기반) ✅
```

---

## ✅ 체크리스트

### 즉시 실행 (오늘)
- [ ] Naver 개발자 센터 가입
- [ ] 애플리케이션 등록
- [ ] Client ID/Secret 발급

### 이번 주
- [ ] Naver 검색광고 계정 생성
- [ ] API 이용 신청
- [ ] Meta 담당자 미팅 일정

### 다음 주
- [ ] Naver API 승인 확인
- [ ] Naver 연동 코드 작성
- [ ] Meta 비즈니스 인증 진행

### 2주 후
- [ ] Meta 승인 완료
- [ ] Naver + Meta 통합 대시보드
- [ ] Mock 데이터 추가

---

## 🎓 교육 기관 협조 문서 템플릿

```
[제목] Meta Ads API 연동을 위한 비즈니스 인증 협조 요청

[수신] 스마트인재개발원 / 동아일보 담당자님

[발신] NKLE 프로젝트 팀

[프로젝트 개요]
- 과정명: 데이터 AI 훈련 과정
- 프로젝트명: NKLE 멀티채널 마케팅 플랫폼
- 기간: 2026년 2월 ~ 4월
- 목적: 졸업 프로젝트 / 포트폴리오

[요청 사항]
1. 비즈니스 인증을 위한 서류 제공
   - 사업자 등록증 사본
   - 담당자 신분증 사본
   
2. 공식 이메일 사용 승인
   - 예: project@smart-edu.or.kr

3. Meta 비즈니스 인증 진행 협조

[필요 이유]
Meta Ads API 연동을 위해서는 비즈니스 인증이 필수이며,
학생 신분으로는 인증이 불가능합니다.

[일정]
- 서류 제공: 2/5까지
- 인증 신청: 2/6
- 승인 예상: 2/12
- 프로젝트 적용: 2/15

[문의]
이메일: anchursoo@naver.com
```

---

**다음 단계:**
1. ✅ 지금 바로: Naver 개발자 센터 등록 시작
2. 📧 오늘 중: Meta 담당자 이메일 작성
3. 💻 내일부터: Naver 연동 코드 작성

**마지막 업데이트:** 2026-02-02
