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
    allowedHosts: 'all', // 터널(localtunnel, pinggy 등) 외부 접속 허용
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // 백엔드 실제 포트 (5000번)으로 수정
        changeOrigin: true,
      },
    },
  },
})
