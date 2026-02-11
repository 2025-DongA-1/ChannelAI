#!/bin/bash
# ============================================
# WEB 서버 배포 스크립트
# MobaXterm에서 myweb-server(49.50.135.249)에 접속 후 실행
# ============================================

set -e

echo "=========================================="
echo "  WEB 서버 배포 시작"
echo "=========================================="

# 1. 프론트엔드 빌드 파일 확인
if [ ! -d "/tmp/frontend-dist" ]; then
    echo "❌ /tmp/frontend-dist 디렉토리가 없습니다."
    echo "   먼저 프론트엔드 빌드 파일을 업로드해주세요."
    exit 1
fi

# 2. 프론트엔드 파일 배포
echo ""
echo "[1/3] 프론트엔드 파일 배포..."
rm -rf /var/www/marketing-platform/*
cp -r /tmp/frontend-dist/* /var/www/marketing-platform/
chown -R www-data:www-data /var/www/marketing-platform
echo "✅ 프론트엔드 파일 배포 완료"

# 3. nginx 설정 적용
echo ""
echo "[2/3] nginx 설정 적용..."
cp /tmp/nginx.conf /etc/nginx/sites-available/marketing-platform

# 기본 사이트 비활성화, 마케팅 플랫폼 활성화
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/marketing-platform /etc/nginx/sites-enabled/

# nginx 설정 검증
nginx -t
echo "✅ nginx 설정 유효"

# 4. nginx 재시작
echo ""
echo "[3/3] nginx 재시작..."
systemctl restart nginx
echo "✅ nginx 재시작 완료"

echo ""
echo "=========================================="
echo "  ✅ WEB 서버 배포 완료!"
echo "=========================================="
echo ""
echo "  사이트 접속: http://49.50.135.249"
echo "  nginx 상태: systemctl status nginx"
echo "  로그: tail -f /var/log/nginx/marketing-platform.access.log"
echo ""
