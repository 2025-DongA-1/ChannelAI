# 멀티채널 마케팅 최적화 서비스 - 시작 가이드

## 프로젝트 생성 완료! 🎉

멀티채널 마케팅 최적화 서비스를 위한 전체 구조와 문서가 생성되었습니다.

## 📋 생성된 문서 목록

### 1. 핵심 문서
- ✅ **README.md** - 프로젝트 개요 및 기술 스택
- ✅ **database-schema.md** - 데이터베이스 설계 (10개 테이블)
- ✅ **api-integration-guide.md** - Google/Meta/네이버 광고 API 연동 가이드
- ✅ **backend-api-spec.md** - RESTful API 명세서
- ✅ **frontend-components.md** - React 컴포넌트 가이드
- ✅ **implementation-plan.md** - 단계별 구현 계획 (15주)

### 2. 설정 파일
- ✅ **docker-compose.yml** - PostgreSQL + Redis 환경
- ✅ **.env.example** - 환경 변수 템플릿
- ✅ **.gitignore** - Git 제외 설정
- ✅ **schema.sql** - 데이터베이스 스키마 (실행 가능)

## 🚀 빠른 시작

### 1단계: 데이터베이스 실행
```bash
# Docker 컨테이너 실행
docker-compose up -d

# 데이터베이스 상태 확인
docker-compose ps

# Adminer (DB 관리 도구) 접속: http://localhost:8080
```

### 2단계: 백엔드 개발 시작 (Node.js)
```bash
# 백엔드 디렉토리 생성
mkdir backend && cd backend

# 프로젝트 초기화
npm init -y

# 필수 패키지 설치
npm install express cors dotenv pg redis axios bcrypt jsonwebtoken
npm install --save-dev typescript @types/node @types/express ts-node nodemon

# TypeScript 설정
npx tsc --init

# 개발 서버 실행
npm run dev
```

### 3단계: 프론트엔드 개발 시작 (React)
```bash
# 프론트엔드 디렉토리로 이동
cd ../frontend

# React 프로젝트 생성
npx create-react-app . --template typescript

# 필수 패키지 설치
npm install @mui/material @emotion/react @emotion/styled
npm install recharts axios react-router-dom @reduxjs/toolkit react-redux
npm install @tanstack/react-query

# 개발 서버 실행
npm start
```

## 📊 데이터 수집 전략

### 실시간 데이터 수집
```javascript
// 1시간마다 데이터 수집
cron.schedule('0 * * * *', async () => {
  await syncAllAccounts();
});
```

### 일별 데이터 수집
```javascript
// 매일 자정에 전날 데이터 수집
cron.schedule('0 0 * * *', async () => {
  await syncDailyData();
});
```

## 🔌 외부 API 연동 순서

### 1. Google Ads API
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 및 Google Ads API 활성화
3. OAuth 2.0 클라이언트 ID 생성
4. Developer Token 발급
5. `.env`에 인증 정보 추가

### 2. Meta Ads API
1. [Meta for Developers](https://developers.facebook.com/) 접속
2. 앱 생성 및 Marketing API 권한 추가
3. Access Token 발급
4. `.env`에 인증 정보 추가

### 3. 네이버 광고 API
1. [네이버 광고 API](https://naver.github.io/searchad-apidoc/) 신청
2. API 키 발급
3. `.env`에 인증 정보 추가

## 🗂️ 프로젝트 구조

```
channel-ai/
├── backend/              # Node.js + Express 백엔드
│   ├── src/
│   │   ├── controllers/  # API 컨트롤러
│   │   ├── services/     # 비즈니스 로직
│   │   ├── models/       # 데이터 모델
│   │   ├── routes/       # API 라우트
│   │   ├── integrations/ # 외부 API 연동
│   │   └── utils/        # 유틸리티
│   └── package.json
│
├── frontend/             # React + TypeScript 프론트엔드
│   ├── src/
│   │   ├── components/   # 재사용 컴포넌트
│   │   ├── pages/        # 페이지
│   │   ├── services/     # API 서비스
│   │   └── store/        # Redux 스토어
│   └── package.json
│
├── database/
│   ├── schema.sql        # 데이터베이스 스키마
│   └── seeds/            # 시드 데이터
│
├── docs/                 # 문서
│   ├── database-schema.md
│   ├── api-integration-guide.md
│   ├── backend-api-spec.md
│   ├── frontend-components.md
│   └── implementation-plan.md
│
├── docker-compose.yml    # Docker 설정
├── .env.example          # 환경 변수 예시
└── README.md            # 프로젝트 개요
```

## 🎯 핵심 기능

### 1. 대시보드
- 총 광고비, 노출수, 클릭수, ROAS 등 주요 지표
- 성과 트렌드 차트
- 채널별 비중 분석
- 상위 캠페인 목록

### 2. 캠페인 관리
- 전체 캠페인 목록
- 캠페인 상세 정보
- 일별/시간별 성과 데이터
- 플랫폼별 필터링

### 3. 채널 분석
- 채널별 성과 비교
- ROI 및 ROAS 분석
- 효율성 점수

### 4. 인사이트
- 자동 성과 분석
- 개선 기회 발굴
- 예산 최적화 추천
- 경고 알림

### 5. 리포트
- 맞춤형 리포트 생성
- PDF/Excel 다운로드
- 일간/주간/월간 리포트

## 📈 개발 타임라인

| 단계 | 기간 | 작업 내용 |
|-----|------|----------|
| 1주 | 환경 설정 | Docker, DB, 기본 프로젝트 구조 |
| 2-3주 | API 연동 | Google/Meta/네이버 광고 API |
| 4-6주 | 백엔드 | REST API 개발 |
| 7-10주 | 프론트엔드 | 대시보드, 캠페인, 분석 화면 |
| 11-12주 | 인사이트 | 데이터 분석 및 추천 엔진 |
| 13주 | 테스트 | 단위/통합/E2E 테스트 |
| 14주 | 배포 | AWS/Docker 배포 |
| 15주 | 최적화 | 성능 개선 및 버그 수정 |

## 🔑 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일을 편집하여 실제 값 입력
# 특히 다음 항목들은 반드시 변경:
# - DB_PASSWORD
# - JWT_SECRET
# - GOOGLE_ADS_* (API 연동 시)
# - META_* (API 연동 시)
# - NAVER_* (API 연동 시)
```

## 🛠️ 개발 도구

### 백엔드
- **프레임워크**: Express.js (Node.js) 또는 FastAPI (Python)
- **ORM**: Prisma 또는 SQLAlchemy
- **테스트**: Jest 또는 Pytest

### 프론트엔드
- **프레임워크**: React 18 + TypeScript
- **상태관리**: Redux Toolkit
- **UI**: Material-UI
- **차트**: Recharts
- **테스트**: Cypress

### 인프라
- **컨테이너**: Docker + Docker Compose
- **데이터베이스**: PostgreSQL 15
- **캐시**: Redis 7
- **배포**: AWS EC2, RDS

## 📚 참고 문서

### API 문서
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [네이버 광고 API](https://naver.github.io/searchad-apidoc/)

### 기술 문서
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/docs/)
- [React](https://react.dev/)
- [Material-UI](https://mui.com/)

## 💡 다음 단계

1. **즉시 시작**
   - Docker 컨테이너 실행
   - 데이터베이스 스키마 적용
   - 백엔드 프로젝트 초기화

2. **첫 주 목표**
   - 사용자 인증 API 구현
   - 기본 대시보드 UI 작성
   - Google Ads API 연동 테스트

3. **첫 달 목표**
   - 전체 API 엔드포인트 완성
   - 대시보드 및 캠페인 화면 완성
   - 실시간 데이터 수집 구현

## ❓ 문제 해결

### Docker 컨테이너가 시작되지 않을 때
```bash
# 컨테이너 로그 확인
docker-compose logs

# 컨테이너 재시작
docker-compose down
docker-compose up -d
```

### 데이터베이스 연결 오류
```bash
# PostgreSQL 접속 테스트
docker exec -it marketing_postgres psql -U admin -d marketing_platform

# 스키마 확인
\dt
```

### 포트 충돌 시
```yaml
# docker-compose.yml에서 포트 변경
ports:
  - "5433:5432"  # 5432 -> 5433
```

## 📧 지원

문제가 발생하면 다음을 확인하세요:
1. 환경 변수가 올바르게 설정되었는지
2. Docker 컨테이너가 실행 중인지
3. API 키가 유효한지
4. 네트워크 연결이 정상인지

---

**준비 완료!** 이제 `docker-compose up -d` 명령어로 개발을 시작하세요! 🚀
