#!/bin/bash
# ============================================
# WAS 서버 (mywas-server) 초기 설정 스크립트
# 서버: 10.10.20.6 (Private Subnet)
# 용도: Node.js Backend + PostgreSQL + Redis
# ============================================

set -e
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

# 3. PostgreSQL 15 설치
echo ""
echo "[3/7] PostgreSQL 15 설치..."
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# PostgreSQL 사용자 및 데이터베이스 생성
echo "PostgreSQL 데이터베이스 설정..."
sudo -u postgres psql <<EOF
-- 사용자 생성
CREATE USER marketing_admin WITH PASSWORD 'Marketing@2026!Secure';

-- 데이터베이스 생성
CREATE DATABASE marketing_platform OWNER marketing_admin;

-- 권한 설정
GRANT ALL PRIVILEGES ON DATABASE marketing_platform TO marketing_admin;

-- 데이터베이스에 연결하여 스키마 권한 설정
\c marketing_platform
GRANT ALL ON SCHEMA public TO marketing_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO marketing_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO marketing_admin;
EOF

echo "✅ PostgreSQL 설정 완료"

# 4. Redis 설치
echo ""
echo "[4/7] Redis 설치..."
apt-get install -y redis-server

# Redis 설정 - 바인드 주소를 localhost로 제한
sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
sed -i 's/^# requirepass .*/requirepass Redis@2026!Secure/' /etc/redis/redis.conf
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
ufw allow from 10.10.20.0/24 to any port 5432   # PostgreSQL (내부)
ufw --force enable

echo ""
echo "=========================================="
echo "  ✅ WAS 서버 초기 설정 완료!"
echo "=========================================="
echo "  PostgreSQL: localhost:5432"
echo "    DB: marketing_platform"
echo "    User: marketing_admin"
echo "  Redis: localhost:6379"
echo "  Node.js: $(node -v)"
echo "  PM2: $(pm2 -v)"
echo "=========================================="
