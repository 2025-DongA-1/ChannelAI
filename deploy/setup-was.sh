#!/bin/bash
# ============================================
# WAS 서버 (mywas-server) 초기 설정 스크립트
# 서버: 10.10.20.6 (Private Subnet)
# 용도: Node.js Backend + MySQL(외부) + Redis
# ============================================

set -e

# 환경변수에서 비밀번호 로드 (.env.production 또는 시스템 환경변수)
if [ -f "$(dirname "$0")/.env.production" ]; then
    source "$(dirname "$0")/.env.production"
fi

# 필수 환경변수 확인
DB_PASSWORD=${DB_PASSWORD:?"DB_PASSWORD 환경변수가 설정되지 않았습니다."}
REDIS_PASSWORD=${REDIS_PASSWORD:?"REDIS_PASSWORD 환경변수가 설정되지 않았습니다."}

echo "=========================================="
echo "  WAS 서버 초기 설정 시작"
echo "  서버: mywas-server (10.10.20.6)"
echo "=========================================="

# 1. 시스템 업데이트
echo ""
echo "[1/7] 시스템 업데이트..."
apt-get update && apt-get upgrade -y

# 2. Node.js 20 LTS 설치
echo ""
echo "[2/7] Node.js 20 LTS 설치..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "Node.js 버전: $(node -v)"
echo "npm 버전: $(npm -v)"

# 3. MySQL 클라이언트 설치 (외부 DB 접속용)
echo ""
echo "[3/7] MySQL 클라이언트 설치..."
apt-get install -y mysql-client

# 외부 MySQL 연결 테스트
DB_HOST=${DB_HOST:-"project-db-cgi.smhrd.com"}
DB_PORT=${DB_PORT:-3307}
DB_NAME=${DB_NAME:-"cgi_25K_DA1_p3_1"}
DB_USER=${DB_USER:-"cgi_25K_DA1_p3_1"}

echo "MySQL 연결 테스트..."
mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" -e "SELECT 1" && echo "✅ MySQL 연결 성공" || echo "⚠️  MySQL 연결 실패 - 나중에 설정 필요"

# 4. Redis 설치
echo ""
echo "[4/7] Redis 설치..."
apt-get install -y redis-server

# Redis 설정 - 바인드 주소를 localhost로 제한
sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
sed -i "s/^# requirepass .*/requirepass ${REDIS_PASSWORD}/" /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server
echo "✅ Redis 설정 완료"

# 5. Python 3 + pip 설치 (AI 추천 서비스용)
echo ""
echo "[5/7] Python 3 설치..."
apt-get install -y python3 python3-pip python3-venv
echo "Python 버전: $(python3 --version)"

# 6. PM2 설치 (Node.js 프로세스 관리)
echo ""
echo "[6/7] PM2 설치..."
npm install -g pm2
pm2 startup systemd -u root --hp /root
echo "✅ PM2 설정 완료"

# 7. 애플리케이션 디렉토리 생성
echo ""
echo "[7/7] 애플리케이션 디렉토리 생성..."
mkdir -p /opt/marketing-platform/backend
mkdir -p /opt/marketing-platform/ml_models
mkdir -p /opt/marketing-platform/logs

# 방화벽 설정 (private subnet이므로 내부 통신만 허용)
echo ""
echo "방화벽 설정..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow from 10.10.20.0/24 to any port 3000  # Node.js (WEB 서버에서만 접근)
ufw allow from 10.10.20.0/24 to any port 22     # SSH (같은 서브넷)
# MySQL은 외부 DB 사용으로 로컬 포트 불필요
ufw --force enable

echo ""
echo "=========================================="
echo "  ✅ WAS 서버 초기 설정 완료!"
echo "=========================================="
echo "  MySQL: project-db-cgi.smhrd.com:3307"
echo "    DB: cgi_25K_DA1_p3_1"
echo "    User: cgi_25K_DA1_p3_1"
echo "  Redis: localhost:6379"
echo "  Node.js: $(node -v)"
echo "  PM2: $(pm2 -v)"
echo "=========================================="
