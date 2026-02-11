#!/bin/bash
# ============================================
# WAS 서버 배포 스크립트
# MobaXterm에서 mywas-server(10.10.20.6)에 접속 후 실행
# ============================================

set -e
APP_DIR="/opt/marketing-platform"

echo "=========================================="
echo "  WAS 서버 배포 시작"
echo "=========================================="

# 1. 백엔드 소스 복사 확인
if [ ! -d "$APP_DIR/backend" ]; then
    echo "❌ $APP_DIR/backend 디렉토리가 없습니다."
    echo "   먼저 소스 파일을 업로드해주세요."
    exit 1
fi

# 2. 의존성 설치
echo ""
echo "[1/5] npm 의존성 설치..."
cd $APP_DIR/backend
npm ci --production=false

# 3. TypeScript 빌드
echo ""
echo "[2/5] TypeScript 빌드..."
npx tsc
echo "✅ 빌드 완료: $APP_DIR/backend/dist/"

# 4. 데이터베이스 스키마 적용
echo ""
echo "[3/5] 데이터베이스 스키마 확인..."
if [ -f "$APP_DIR/database/schema.sql" ]; then
    PGPASSWORD='Marketing@2026!Secure' psql -U marketing_admin -d marketing_platform -h localhost -f $APP_DIR/database/schema.sql 2>/dev/null || echo "⚠️  스키마 이미 적용됨 (무시 가능)"
fi

if [ -f "$APP_DIR/database/add-karrot-data.sql" ]; then
    PGPASSWORD='Marketing@2026!Secure' psql -U marketing_admin -d marketing_platform -h localhost -f $APP_DIR/database/add-karrot-data.sql 2>/dev/null || echo "⚠️  기초 데이터 이미 적용됨 (무시 가능)"
fi

# 5. Python 환경 설정 (AI 추천 서비스)
echo ""
echo "[4/5] Python 가상환경 설정..."
if [ ! -d "$APP_DIR/backend/.venv" ]; then
    python3 -m venv $APP_DIR/backend/.venv
fi
source $APP_DIR/backend/.venv/bin/activate
pip install --quiet numpy pandas scikit-learn joblib
deactivate
echo "✅ Python 환경 설정 완료"

# 6. PM2로 애플리케이션 시작
echo ""
echo "[5/5] PM2로 애플리케이션 시작..."
cd $APP_DIR

# 기존 프로세스 중지
pm2 delete marketing-api 2>/dev/null || true

# PM2로 시작
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=========================================="
echo "  ✅ WAS 서버 배포 완료!"
echo "=========================================="
echo ""
echo "  PM2 상태 확인: pm2 status"
echo "  로그 확인: pm2 logs marketing-api"
echo "  헬스 체크: curl http://localhost:3000/health"
echo ""
