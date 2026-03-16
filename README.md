# PlanBe: 멀티채널 AI 마케팅 최적화 플랫폼

## 프로젝트 개요

PlanBe는 네이버, 메타(페이스북/인스타그램), 구글, 당근마켓 등 다양한 광고 채널의 데이터를 통합하여 실시간 성과 분석, AI 기반 예산 최적화, 자동 리포트, 인사이트 추천 등 마케팅 자동화와 효율화를 지원하는 SaaS 서비스입니다.

---

## 주요 기능

### 1. 통합 대시보드
- 여러 광고 채널의 실적(노출, 클릭, 전환, 비용, ROAS 등)을 한눈에 비교/분석
- 기간별, 캠페인별, 채널별 KPI 추적 및 시각화(Chart.js, Recharts)
- 실시간 데이터 동기화 및 자동 새로고침

### 2. AI 예산 최적화/추천
- AI(ML 모델, Python) 기반 예산 배분 추천 및 시뮬레이션
- 업종, 예산, 기간 등 입력만으로 최적의 광고 전략 자동 제안
- 크로스채널 예산 분배, 실행 순서, 예상 수익률 등 상세 리포트 제공

### 3. 캠페인/예산 관리
- 캠페인 생성, 수정, 삭제, 상세 성과 조회
- 전체/일일 예산 관리, 목표 예산 대비 집행률 실시간 추적
- 각 캠페인별 상세 리포트 및 성과 추이 그래프

### 4. 광고 계정/플랫폼 연동
- 네이버, 메타, 구글, 당근마켓 등 주요 광고 플랫폼 연동 지원
- OAuth 2.0, API Key, CSV 업로드 등 다양한 인증 방식
- 계정별 데이터 동기화, 연동 상태 모니터링

### 5. 인사이트 & AI 리포트
- AI 기반 성과 분석, 자동 인사이트 및 액션 아이템 추천
- 기간/캠페인/채널별 상세 리포트 PDF/CSV 다운로드
- 맞춤형 리포트 자동 이메일 발송(구독제)

### 6. 튜토리얼/가이드/UX
- 모든 주요 페이지(대시보드, 캠페인, 인사이트, 연동 등)에 **1회성 자동 튜토리얼** 및 **언제든 실행 가능한 가이드 버튼** 제공
- 우측 하단 플로팅 버튼에서 전체 튜토리얼 모드, 네비게이션/대시보드 가이드, 페이지별 가이드 진입 가능
- 단계별 스포트라이트, 말풍선, 애니메이션 등 직관적 온보딩 UX

### 7. 데이터 관리/테스트/관리자 기능
- 임시/테스트 데이터 생성, CSV 업로드, 수동 입력 지원
- 관리자/일반 사용자 권한 분리, 계정 관리, 로그 모니터링

---

## 실제 구현된 주요 페이지

- **메인페이지**: 서비스 소개, 3단계 온보딩, FAQ, 무료 체험 CTA
- **DashboardPage**: 통합 성과 대시보드, 튜토리얼, 실시간 KPI, 채널별 비교
- **CampaignsPage / CampaignDetailPage**: 캠페인 목록, 상세, 예산 관리, 성과 추이, 가이드
- **IntegrationPage**: 광고 계정 연동, 플랫폼별 인증, 데이터 동기화, 튜토리얼
- **AIRecommendationPage**: AI 예산 추천 입력/결과, 실행 순서, 전략 리포트
- **InsightsPage**: AI 인사이트, 리포트 다운로드, 튜토리얼
- **CreativeAgentPage**: AI 소재 생성/분석, 카피라이팅, 시각 가이드
- **DataManagementPage / DummyDataPage**: 데이터 관리, 테스트 데이터 생성, CSV 업로드
- **Auth/Account**: 회원가입, 로그인, JWT 인증, OAuth, 개인정보/이용약관

---

## 데이터 흐름 및 아키텍처

- **프론트엔드**: React + TypeScript, Zustand(상태), React Query(비동기), Tailwind CSS, Recharts(차트)
- **백엔드**: Node.js(Express) + Python(FastAPI 일부), PostgreSQL, Redis, Prisma ORM
- **AI/ML**: Python 스크립트(예산 추천, 리포트 생성), Node에서 서브프로세스 호출
- **API**: RESTful, JWT 인증, OAuth 2.0, 외부 광고 플랫폼 API 연동
- **인프라**: Docker, Docker Compose, AWS/GCP, GitHub Actions(CI/CD), Prometheus/Grafana(모니터링)

---

## 폴더 구조 (실제 구현 기준)

```
channel-ai/
├── backend/
│   ├── src/
│   │   ├── controllers/      # API 컨트롤러 (대시보드, 캠페인, 예산, AI, 인사이트 등)
│   │   ├── services/         # 비즈니스 로직, AI 서비스
│   │   ├── models/           # 데이터 모델
│   │   ├── routes/           # API 라우트
│   │   ├── middlewares/      # 인증, 로깅
│   │   ├── integrations/     # 외부 API 연동 (google-ads, meta-ads, naver-ads 등)
│   │   ├── utils/            # 유틸리티 함수
│   │   ├── config/           # DB/환경설정
│   │   └── app.js            # 앱 진입점
│   ├── tests/                # API/통합 테스트
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/       # 공통/대시보드/차트/리포트/플로팅버튼 등
│   │   ├── pages/            # Dashboard, Campaigns, Integration, Insights, AIRecommendation 등
│   │   ├── services/         # API 호출
│   │   ├── store/            # Zustand 등 상태관리
│   │   ├── hooks/            # 커스텀 훅
│   │   ├── types/            # TS 타입
│   │   ├── utils/            # 유틸리티
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
└── docs/
    ├── api-specification.md
    ├── database-schema.md
    └── deployment-guide.md
```

---

## API/인증/배포

- **API 명세**: `/docs/backend-api-spec.md` 참고 (RESTful, JWT, OAuth2)
- **배포**: Docker Compose, AWS/GCP, GitHub Actions로 CI/CD 자동화
- **보안**: JWT 인증, OAuth 2.0, HTTPS, 개인정보 암호화, 관리자/유저 권한 분리

---

## 기타

- **문의/지원**: anchursoo@naver.com
- **서비스명**: PlanBe 멀티채널 마케팅 플랫폼

---

> 최신 기능, 페이지, 데이터 흐름, 실제 코드 구조를 모두 반영했습니다.  
> 추가/수정 요청은 언제든지 말씀해 주세요!
