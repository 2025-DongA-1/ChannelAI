# Meta (Facebook) Ads API 연동 가이드

## 📋 개요
Meta Ads API를 사용하여 사용자의 Facebook/Instagram 광고를 연동하려면 다음 단계를 거쳐야 합니다.

**예상 소요 시간**: 2-4주 (검수 기간 포함)

## 🚀 1단계: Meta for Developers 계정 설정

### 1.1 계정 생성
1. https://developers.facebook.com 접속
2. 개인 Facebook 계정으로 로그인
3. "시작하기" 클릭하여 개발자 계정 등록

### 1.2 개발자 계정 인증
- 이메일 인증
- 전화번호 인증 (2FA 설정 권장)

## 🏢 2단계: 비즈니스 계정 생성

### 2.1 Meta Business Suite 설정
1. https://business.facebook.com 접속
2. "비즈니스 계정 만들기" 클릭
3. 비즈니스 정보 입력:
   - 비즈니스 이름: "멀티채널 마케팅 플랫폼" (또는 실제 회사명)
   - 이메일 주소
   - 사업자 정보

### 2.2 Business Verification (필수)
비즈니스 인증은 Advanced Access를 받기 위해 필수입니다.

**필요 서류:**
- 사업자 등록증
- 회사 웹사이트 URL
- 회사 이메일 주소
- 대표자 신분증

**제출 방법:**
1. Meta Business Suite > 설정 > 보안 센터
2. "비즈니스 인증 시작" 클릭
3. 서류 업로드 및 정보 입력
4. 검토 대기 (보통 3-5 영업일)

## 🔧 3단계: Meta 앱 생성

### 3.1 새 앱 만들기
1. https://developers.facebook.com/apps 접속
2. "앱 만들기" 클릭
3. 앱 유형 선택: **"비즈니스"** 선택
4. 앱 정보 입력:
   ```
   앱 이름: Marketing AI Platform
   앱 연락처 이메일: your-email@company.com
   비즈니스 계정: [위에서 만든 비즈니스 계정 선택]
   ```

### 3.2 앱 기본 설정
대시보드에서 다음 정보를 설정합니다:

**앱 도메인:**
```
192.168.219.90 (개발용)
yourdomain.com (프로덕션용)
```

**사이트 URL:**
```
http://192.168.219.90:3001 (개발용)
https://yourdomain.com (프로덕션용)
```

**개인정보처리방침 URL:** (필수)
```
https://yourdomain.com/privacy
```

**서비스 약관 URL:** (필수)
```
https://yourdomain.com/terms
```

## 🔐 4단계: 필요한 API 제품 추가

### 4.1 Marketing API 추가
1. 앱 대시보드 > 제품 추가
2. "Marketing API" 찾아서 "설정" 클릭

### 4.2 필요한 권한 (Permissions)

#### Standard Access (기본)
- `ads_read` - 광고 데이터 읽기
- `ads_management` - 광고 생성/수정

#### Advanced Access (신청 필요)
- `ads_read` (Advanced)
- `ads_management` (Advanced)
- `business_management` - 비즈니스 관리

### 4.3 App Review 준비
Advanced Access를 받으려면 App Review를 통과해야 합니다.

**필요한 자료:**
1. **앱 사용 사례 설명**
   ```
   우리 플랫폼은 소상공인과 마케팅 실무자가 여러 광고 플랫폼의 성과를 
   한 곳에서 통합 관리할 수 있도록 돕습니다.
   
   - 광고 성과 데이터 조회 (노출수, 클릭수, 전환수)
   - 예산 모니터링 및 최적화
   - AI 기반 광고 추천
   ```

2. **스크린샷 및 데모 영상**
   - 로그인 화면
   - 대시보드 화면
   - 광고 연동 화면
   - 데이터 표시 화면
   - 약 2-3분 길이의 화면 녹화 영상

3. **테스트 계정 정보**
   ```
   아이디: test@yourdomain.com
   비밀번호: TestPassword123!
   
   테스트용 광고 계정 정보도 함께 제공
   ```

4. **플랫폼 URL**
   - 개발 환경: http://192.168.219.90:3001
   - 프로덕션 환경: https://yourdomain.com

## 💳 5단계: 앱 인증 및 자격 증명 생성

### 5.1 App ID 및 App Secret 확인
1. 앱 대시보드 > 설정 > 기본 설정
2. 앱 ID 복사
3. "표시" 클릭하여 App Secret 확인 및 복사

### 5.2 환경 변수 설정
`backend/.env` 파일에 추가:
```env
# Meta Ads API
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_API_VERSION=v18.0
META_REDIRECT_URI=http://192.168.219.90:3001/auth/callback/meta
```

### 5.3 OAuth 리디렉션 URI 설정
1. 앱 대시보드 > Facebook 로그인 > 설정
2. "유효한 OAuth 리디렉션 URI"에 추가:
   ```
   http://localhost:3001/auth/callback/meta
   http://192.168.219.90:3001/auth/callback/meta
   https://yourdomain.com/auth/callback/meta
   ```

## 🧪 6단계: 테스트 환경 구축

### 6.1 테스트 사용자 생성
1. 앱 대시보드 > 역할 > 테스트 사용자
2. "테스트 사용자 추가" 클릭
3. 생성된 테스트 사용자로 로그인하여 테스트

### 6.2 테스트용 광고 계정 연결
1. Meta Business Suite에서 테스트용 광고 계정 생성
2. 테스트 사용자에게 광고 계정 권한 부여
3. 개발 환경에서 연동 테스트

### 6.3 Webhook 설정 (선택사항)
실시간 알림을 받으려면:
1. 앱 대시보드 > Webhooks
2. "콜백 URL" 설정: `https://yourdomain.com/webhooks/meta`
3. "확인 토큰" 생성 및 저장

## 📝 7단계: App Review 제출

### 7.1 제출 전 체크리스트
- [ ] 비즈니스 인증 완료
- [ ] 개인정보처리방침 페이지 작성
- [ ] 서비스 약관 페이지 작성
- [ ] 앱 아이콘 업로드 (1024x1024px)
- [ ] 스크린샷 준비 (5-10장)
- [ ] 데모 영상 준비 (2-3분)
- [ ] 테스트 계정 정보 준비
- [ ] 사용 사례 상세 설명 작성

### 7.2 제출 방법
1. 앱 대시보드 > App Review > 권한 및 기능
2. 필요한 권한 선택:
   - `ads_read`
   - `ads_management`
   - `business_management` (필요 시)
3. 각 권한에 대한 사용 사례 설명 작성
4. 스크린샷 및 영상 첨부
5. "검토 제출" 클릭

### 7.3 검토 기간
- 일반적으로 3-7 영업일
- 추가 정보 요청 시 더 오래 걸릴 수 있음
- 이메일로 진행 상황 통지

## 🔄 8단계: 개발 모드 vs 라이브 모드

### 8.1 개발 모드
- App Review 통과 전까지는 개발 모드
- 앱 관리자, 개발자, 테스터만 사용 가능
- Standard Access 권한만 사용 가능

### 8.2 라이브 모드
- App Review 통과 후 라이브 모드로 전환
- 모든 사용자가 사용 가능
- Advanced Access 권한 사용 가능

### 8.3 모드 전환
1. 앱 대시보드 > 설정 > 기본 설정
2. 상단의 "라이브 모드로 전환" 스위치 토글
3. 확인 후 전환

## 📚 9단계: 문서 작성

### 9.1 개인정보처리방침
다음 내용을 포함해야 합니다:
- 수집하는 데이터 유형
- 데이터 사용 목적
- 데이터 보관 기간
- 사용자 권리
- 연락처 정보

**템플릿:** `docs/privacy-policy-template.md` 참고

### 9.2 서비스 약관
다음 내용을 포함해야 합니다:
- 서비스 설명
- 사용자 의무
- 책임의 제한
- 계약 해지 조건

**템플릿:** `docs/terms-of-service-template.md` 참고

## ⚠️ 주의사항

### 일반적인 거부 사유
1. **불충분한 사용 사례 설명**
   - 해결: 구체적으로 어떤 기능에서 어떻게 사용되는지 명시

2. **스크린샷/영상 부족**
   - 해결: 권한 사용 흐름을 명확히 보여주는 자료 제공

3. **개인정보처리방침 미비**
   - 해결: Meta 가이드라인에 맞는 상세한 정책 작성

4. **테스트 불가능**
   - 해결: 작동하는 테스트 계정 및 환경 제공

### 재제출
- 거부 시 피드백을 받고 수정 후 재제출 가능
- 보통 2-3회 시도 내에 승인

## 📞 도움말 및 리소스

### 공식 문서
- Meta for Developers: https://developers.facebook.com
- Marketing API 문서: https://developers.facebook.com/docs/marketing-apis
- App Review 가이드: https://developers.facebook.com/docs/app-review

### 지원
- Meta Developer Community: https://developers.facebook.com/community
- 지원 티켓: https://developers.facebook.com/support

## ✅ 체크리스트

### 준비 단계
- [ ] Meta for Developers 계정 생성
- [ ] 비즈니스 계정 생성
- [ ] 비즈니스 인증 완료
- [ ] Meta 앱 생성
- [ ] Marketing API 추가

### 개발 단계
- [ ] 앱 자격 증명 확인
- [ ] 환경 변수 설정
- [ ] OAuth 흐름 구현
- [ ] API 연동 코드 작성
- [ ] 테스트 환경에서 검증

### 문서화 단계
- [ ] 개인정보처리방침 작성
- [ ] 서비스 약관 작성
- [ ] 앱 아이콘 준비
- [ ] 스크린샷 준비 (5-10장)
- [ ] 데모 영상 녹화 (2-3분)

### 제출 단계
- [ ] 사용 사례 상세 설명 작성
- [ ] 테스트 계정 정보 준비
- [ ] App Review 제출
- [ ] 검토 결과 대기
- [ ] 승인 후 라이브 모드 전환

---

**다음 단계**: Google Ads API, Naver Ads API, 당근마켓 Ads API 연동 가이드

**마지막 업데이트**: 2026-01-29
