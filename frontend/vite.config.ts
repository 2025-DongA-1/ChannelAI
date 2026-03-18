import { defineConfig } from 'vitest/config'
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    alias: {
      '@/': path.resolve(__dirname, './src') + '/',
    },
  },
  server: {
    allowedHosts: true, // 터널(localtunnel, pinggy 등) 외부 접속 허용
    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        timeout: 300000, // [추가] AI 응답 대기 시간 확보용(5분)
      },
    },
  },
})
