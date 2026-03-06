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
        // [2026-03-06 10:32] 수정 이유: AI 분석 등 모든 백엔드 서버가 3000번으로 일원화되었으므로 5000번에서 3000번 프록시로 변경 (502 에러 해결)
        target: 'http://localhost:3000', 
        changeOrigin: true,
      },
    },
  },
})
