# PM2 프로세스 관리 설정
# 경로: /opt/marketing-platform/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'marketing-api',
      script: 'dist/app.js',
      cwd: '/opt/marketing-platform/backend',
      instances: 2,              // CPU 코어 수에 맞게 조정
      exec_mode: 'cluster',      // 클러스터 모드 (로드밸런싱)
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 로그 설정
      log_file: '/opt/marketing-platform/logs/combined.log',
      out_file: '/opt/marketing-platform/logs/out.log',
      error_file: '/opt/marketing-platform/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_size: '50M',           // 로그 파일 최대 크기
      retain: 10,                // 최대 보관 로그 수
      
      // 프로세스 관리
      max_memory_restart: '500M', // 메모리 500MB 초과 시 재시작
      watch: false,               // 프로덕션에서는 watch 비활성화
      autorestart: true,
      restart_delay: 3000,        // 재시작 딜레이 3초
      max_restarts: 10,           // 최대 재시작 횟수

      // 안정성
      kill_timeout: 5000,
      listen_timeout: 10000,
    }
  ]
};
