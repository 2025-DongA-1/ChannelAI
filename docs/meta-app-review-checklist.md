# Meta 앱(NKLE) - App Review 준비 체크리스트

## 📊 현재 상태
- **앱 이름**: NKLE (추정)
- **App ID**: 1946347369607018
- **App Secret**: 설정 완료 ✅
- **개발 모드**: 활성화 (추정)
- **OAuth 구현**: 완료 ✅
- **Mock 데이터**: 작동 중 ✅

---

## 🚨 즉시 필요한 작업

### 1. 비즈니스 인증 (Business Verification)
Advanced Access를 받기 위한 필수 단계입니다.

**현재 상태 확인:**
1. https://business.facebook.com 접속
2. 비즈니스 설정 > 보안 센터
3. "비즈니스 인증" 상태 확인

**미완료 시 필요한 서류:**
- [ ] 사업자 등록증 스캔본
- [ ] 대표자 신분증
- [ ] 회사 공식 이메일 주소
- [ ] 회사 웹사이트 (또는 SNS 페이지)

**예상 소요 시간**: 제출 후 3-5 영업일

---

### 2. 필수 문서 작성 및 호스팅

Meta App Review는 다음 문서들을 **반드시** 요구합니다:

#### 2.1 개인정보처리방침 (Privacy Policy)
**요구사항:**
- [ ] HTTPS로 접근 가능한 URL
- [ ] Meta 데이터 사용에 대한 명시
- [ ] 수집하는 데이터 유형 설명
- [ ] 데이터 보관 및 삭제 정책
- [ ] 사용자 권리 안내

**필요한 작업:**
1. 개인정보처리방침 문서 작성
2. 프론트엔드에 `/privacy` 페이지 추가
3. URL 설정: `http://192.168.219.90:3001/privacy`

#### 2.2 서비스 약관 (Terms of Service)
**요구사항:**
- [ ] HTTPS로 접근 가능한 URL
- [ ] 서비스 설명
- [ ] 사용자 책임
- [ ] 계약 해지 조건

**필요한 작업:**
1. 서비스 약관 문서 작성
2. 프론트엔드에 `/terms` 페이지 추가
3. URL 설정: `http://192.168.219.90:3001/terms`

---

### 3. Meta 앱 기본 설정 확인

#### 3.1 앱 설정 업데이트
https://developers.facebook.com/apps/1946347369607018/settings/basic

**확인/설정 항목:**
- [ ] **앱 도메인**: 
  ```
  192.168.219.90 (개발)
  yourdomain.com (향후 프로덕션)
  ```

- [ ] **개인정보처리방침 URL**: 
  ```
  http://192.168.219.90:3001/privacy
  ```

- [ ] **서비스 약관 URL**: 
  ```
  http://192.168.219.90:3001/terms
  ```

- [ ] **앱 아이콘**: 1024x1024px PNG
  - 로고 또는 서비스 대표 이미지

- [ ] **카테고리**: Business

#### 3.2 Facebook 로그인 설정
https://developers.facebook.com/apps/1946347369607018/fb-login/settings

**OAuth 리디렉션 URI:**
- [ ] `http://localhost:3000/api/v1/integration/meta/callback`
- [ ] `http://192.168.219.90:3000/api/v1/integration/meta/callback`
- [ ] `http://localhost:3001/auth/callback/meta` (프론트엔드)
- [ ] `http://192.168.219.90:3001/auth/callback/meta` (프론트엔드)

---

### 4. Marketing API 설정

#### 4.1 제품 추가 확인
1. 앱 대시보드 > 제품
2. "Marketing API"가 추가되어 있는지 확인
3. 없으면 추가: "제품 추가" > "Marketing API" > "설정"

#### 4.2 필요한 권한
**Standard Access (현재 사용 가능):**
- `ads_read` - 광고 데이터 읽기
- `pages_show_list` - 페이지 목록

**Advanced Access (App Review 필요):**
- [ ] `ads_read` (Advanced)
- [ ] `ads_management` (Advanced)
- [ ] `business_management` (선택사항)

---

### 5. 테스트 환경 준비

#### 5.1 테스트 사용자 생성
https://developers.facebook.com/apps/1946347369607018/roles/test-users

- [ ] 테스트 사용자 2-3명 생성
- [ ] 각 사용자에게 Mock 광고 계정 권한 부여
- [ ] 로그인 테스트 수행

#### 5.2 실제 광고 계정 연결 (선택)
개발 모드에서는 본인 광고 계정으로만 테스트 가능:
- [ ] Meta Business Suite에서 광고 계정 확인
- [ ] 본인 계정으로 OAuth 플로우 테스트
- [ ] 실제 광고 데이터 가져오기 테스트

---

### 6. App Review 제출 자료 준비

#### 6.1 스크린샷 (5-10장)
각 권한이 어떻게 사용되는지 보여주는 화면:

- [ ] **로그인 화면**: Meta 연동 버튼이 보이는 화면
- [ ] **OAuth 동의 화면**: 권한 요청 화면
- [ ] **연동 완료 화면**: 광고 계정 선택 화면
- [ ] **대시보드**: 광고 성과 데이터 표시 (CTR, CPC, ROAS)
- [ ] **캠페인 목록**: 광고 캠페인들이 나열된 화면
- [ ] **상세 성과**: 개별 캠페인의 상세 지표
- [ ] **AI 추천**: AI 기반 추천 화면
- [ ] **예산 모니터링**: 예산 사용 현황

**팁**: 각 스크린샷에 화살표나 설명 추가

#### 6.2 데모 영상 (2-3분)
화면 녹화로 전체 플로우 시연:

**구성:**
1. 로그인 (0:00-0:20)
2. Meta 연동 시작 (0:20-0:40)
3. OAuth 권한 동의 (0:40-1:00)
4. 광고 계정 선택 (1:00-1:20)
5. 대시보드에서 데이터 확인 (1:20-2:00)
6. 캠페인 상세 보기 (2:00-2:30)
7. AI 추천 기능 (2:30-3:00)

**추천 도구:**
- OBS Studio (무료)
- Windows 게임 바 (Win + G)
- ShareX (무료)

#### 6.3 테스트 계정 정보
Review 담당자가 직접 테스트할 수 있도록:

```
URL: http://192.168.219.90:3001
(또는 임시 퍼블릭 URL - ngrok, cloudflare tunnel 등)

테스트 계정:
아이디: test@yourdomain.com
비밀번호: ReviewTest123!

Meta 테스트 계정 (앱 내 생성):
ID: [테스트 사용자 ID]
PW: [테스트 사용자 비밀번호]
```

**⚠️ 중요**: Review 담당자가 접근할 수 있도록 임시로 퍼블릭 URL 필요
- ngrok: `ngrok http 3001`
- cloudflare tunnel
- 또는 실제 도메인에 배포

#### 6.4 사용 사례 설명 (Use Case)
각 권한에 대해 **구체적으로** 설명:

**예시 - ads_read 권한:**
```
우리 플랫폼은 소상공인과 중소기업 마케터가 여러 광고 플랫폼의 
성과를 한눈에 비교할 수 있도록 돕는 서비스입니다.

ads_read 권한은 다음과 같이 사용됩니다:

1. 사용자의 Meta 광고 캠페인 목록을 가져옵니다 
   (화면: screenshots/campaign-list.png)

2. 각 캠페인의 성과 지표를 조회합니다
   - 노출수 (Impressions)
   - 클릭수 (Clicks)
   - 클릭률 (CTR)
   - 클릭당 비용 (CPC)
   - 전환수 (Conversions)
   - 광고 투자 수익률 (ROAS)
   (화면: screenshots/campaign-metrics.png)

3. 통합 대시보드에 다른 플랫폼(Google, Naver, 당근마켓)과 
   함께 표시하여 비교 분석을 제공합니다
   (화면: screenshots/integrated-dashboard.png)

4. AI 모델이 성과 데이터를 분석하여 예산 최적화 및 
   플랫폼 추천을 제공합니다
   (화면: screenshots/ai-recommendations.png)

사용자의 광고 데이터는 분석 목적으로만 사용되며, 
제3자와 공유되지 않습니다.
```

---

### 7. 환경 변수 업데이트

#### 7.1 현재 설정 확인
```env
# backend/.env
META_APP_ID=1946347369607018
META_APP_SECRET=156aa58d7e89be41403aab5fc712d8e0
META_REDIRECT_URI=http://localhost:3000/api/v1/integration/meta/callback
```

#### 7.2 추가 필요 설정
```env
# Meta API 버전
META_API_VERSION=v18.0

# 네트워크 접근용 리디렉션 URI (추가)
META_REDIRECT_URI_NETWORK=http://192.168.219.90:3000/api/v1/integration/meta/callback

# 프로덕션 (향후)
# META_REDIRECT_URI_PROD=https://yourdomain.com/api/v1/integration/meta/callback
```

---

## 📝 App Review 제출 단계

### Step 1: 사전 준비 완료 확인
- [ ] 비즈니스 인증 완료
- [ ] 개인정보처리방침 페이지 작성 및 호스팅
- [ ] 서비스 약관 페이지 작성 및 호스팅
- [ ] 앱 아이콘 업로드
- [ ] OAuth 리디렉션 URI 설정
- [ ] 테스트 환경 준비

### Step 2: 자료 준비 완료 확인
- [ ] 스크린샷 5-10장 준비
- [ ] 데모 영상 2-3분 녹화
- [ ] 테스트 계정 생성 및 확인
- [ ] 사용 사례 상세 설명 작성
- [ ] 퍼블릭 접근 가능한 URL 준비

### Step 3: 제출
1. https://developers.facebook.com/apps/1946347369607018/app-review/permissions
2. "권한 및 기능" 탭
3. 필요한 권한 선택:
   - `ads_read` (Advanced)
   - `ads_management` (Advanced, 필요 시)
4. 각 권한에 대한 사용 사례 설명 입력
5. 스크린샷 첨부
6. 데모 영상 링크 (YouTube unlisted 또는 직접 업로드)
7. 테스트 계정 정보 입력
8. "검토 제출" 클릭

### Step 4: 검토 대기
- 일반적으로 3-7 영업일
- 진행 상황 이메일 통지
- 추가 정보 요청 시 신속 대응

### Step 5: 승인 후 작업
- [ ] 라이브 모드로 전환
- [ ] Mock 데이터를 실제 API 호출로 교체
- [ ] 프로덕션 환경 배포
- [ ] 사용자 테스트

---

## ⚠️ 일반적인 거부 사유 및 대응

### 1. "Insufficient use case description"
**문제**: 사용 사례가 불명확
**해결**: 
- 더 구체적인 설명 추가
- 스크린샷에 화살표와 설명 추가
- 각 권한이 어떤 기능에 필요한지 명시

### 2. "Privacy policy missing required information"
**문제**: 개인정보처리방침이 Meta 요구사항 미충족
**해결**:
- Meta 데이터 사용 명시
- 데이터 삭제 절차 추가
- 사용자 권리 (접근, 수정, 삭제) 명시

### 3. "Test user credentials don't work"
**문제**: 테스트 계정으로 로그인 불가
**해결**:
- 테스트 계정 재확인
- 퍼블릭 URL 접근 가능 여부 확인
- 상세한 로그인 절차 제공

### 4. "Screencast doesn't show permission usage"
**문제**: 영상이 권한 사용을 명확히 보여주지 않음
**해결**:
- 더 긴 영상 제공 (3-5분)
- 각 단계마다 자막 추가
- 권한 요청 화면을 명확히 캡처

---

## 🔄 재제출 프로세스

거부 시:
1. 이메일에서 구체적인 거부 사유 확인
2. 해당 부분 수정
3. 앱 대시보드에서 재제출
4. 일반적으로 2-3회 안에 승인

---

## 📚 참고 자료

- **Meta for Developers**: https://developers.facebook.com/apps/1946347369607018
- **Marketing API 문서**: https://developers.facebook.com/docs/marketing-apis
- **App Review 가이드**: https://developers.facebook.com/docs/app-review
- **Business Verification**: https://www.facebook.com/business/help/2058515294227817

---

## 🎯 우선순위 작업 (다음 2주)

### 🔴 최우선 (이번 주)
1. [ ] 비즈니스 인증 상태 확인 및 제출
2. [ ] 개인정보처리방침 페이지 작성
3. [ ] 서비스 약관 페이지 작성
4. [ ] 프론트엔드에 `/privacy`, `/terms` 페이지 추가

### 🟡 중요 (다음 주)
5. [ ] 앱 기본 설정 업데이트 (도메인, 아이콘 등)
6. [ ] 스크린샷 준비 (5-10장)
7. [ ] 데모 영상 녹화 (2-3분)
8. [ ] 사용 사례 상세 설명 작성

### 🟢 제출 전 (2주차)
9. [ ] 테스트 계정 생성 및 검증
10. [ ] 퍼블릭 URL 설정 (ngrok 또는 배포)
11. [ ] App Review 제출
12. [ ] 검토 결과 대기

---

**마지막 업데이트**: 2026-01-29
**예상 완료 시점**: 2026-02-12 (App Review 승인 기준)
