#!/bin/bash
# ============================================
# WEB 서버 (myweb-server) 초기 설정 스크립트
# 서버: 49.50.135.249 (Public Subnet)
# 용도: nginx 리버스 프록시 + 프론트엔드 정적 파일
# ============================================

set -e
echo "=========================================="
echo "  WEB 서버 초기 설정 시작"
echo "  서버: myweb-server (49.50.135.249)"
echo "=========================================="

# 1. 시스템 업데이트
echo ""
echo "[1/4] 시스템 업데이트..."
apt-get update && apt-get upgrade -y

# 2. nginx 설치
echo ""
echo "[2/4] nginx 설치..."
apt-get install -y nginx
systemctl enable nginx
echo "nginx 버전: $(nginx -v 2>&1)"

# 3. 프론트엔드 디렉토리 생성
echo ""
echo "[3/4] 프론트엔드 디렉토리 생성..."
mkdir -p /var/www/marketing-platform
chown -R www-data:www-data /var/www/marketing-platform

# 4. 방화벽 설정
echo ""
echo "[4/4] 방화벽 설정..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS (향후 SSL 적용)
ufw allow 22/tcp     # SSH
ufw --force enable

echo ""
echo "=========================================="
echo "  ✅ WEB 서버 초기 설정 완료!"
echo "=========================================="
echo "  nginx: $(nginx -v 2>&1)"
echo "  프론트엔드 경로: /var/www/marketing-platform"
echo "=========================================="
