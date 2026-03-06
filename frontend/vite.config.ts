import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: true, // 터널(localtunnel, pinggy 등) 외부 접속 허용
    proxy: {
      '/api': {
        // [2026-03-06 10:57] 수정 이유: 로컬 개발 환경에서는 5000번 포트로 통신하도록 서버/로컬 환경 분기를 위한 롤백
        target: 'http://localhost:5000', 
        changeOrigin: true,
      },
    },
  },
})
