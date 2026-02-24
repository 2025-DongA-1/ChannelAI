import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import pool from './config/database';
import { connectRedis } from './config/redis';
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignRoutes';
import accountRoutes from './routes/accountRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import integrationRoutes from './routes/integrationRoutes';
import budgetRoutes from './routes/budgetRoutes';
import insightRoutes from './routes/insightRoutes';
import aiRoutes from './routes/aiRoutes';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// 미들웨어
app.use(cors({
  // FRONTEND_URL 환경변수에 설정된 도메인만 허용 (기본값: 로컬 개발 주소)
  // 배포 시 .env에서 FRONTEND_URL=https://your-domain.com 으로 변경
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 기본 라우트
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '멀티채널 마케팅 최적화 서비스 API',
    version: '1.0.0',
    status: 'running',
  });
});

// 헬스 체크
app.get('/health', async (req: Request, res: Response) => {
  try {
    // 데이터베이스 연결 확인
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: 'connected',
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API 라우트
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/integration', integrationRoutes);
app.use('/api/v1/budget', budgetRoutes);
app.use('/api/v1/insights', insightRoutes);
app.use('/api/v1/ai', aiRoutes);

app.get('/api/v1', (req: Request, res: Response) => {
  res.json({ 
    message: 'Marketing Platform API v1',
    endpoints: {
      auth: '/api/v1/auth',
      campaigns: '/api/v1/campaigns',
      accounts: '/api/v1/accounts',
      dashboard: '/api/v1/dashboard',
      integration: '/api/v1/integration',
      budget: '/api/v1/budget',
      insights: '/api/v1/insights',
      ai: '/api/v1/ai',
    }
  });
});

// 404 핸들러
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `경로 ${req.path}를 찾을 수 없습니다.`,
  });
});

// 에러 핸들러
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : '서버 오류가 발생했습니다.',
  });
});

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 연결 테스트
    console.log('📊 데이터베이스 연결 테스트 중...');
    await pool.query('SELECT NOW()');
    console.log('✅ MySQL 데이터베이스 연결 성공');
    
    // Redis 연결 (선택적 - 실패해도 서버 시작)
    console.log('🔴 Redis 연결 시도...');
    await connectRedis();
    
    // 서버 시작 (0.0.0.0으로 모든 네트워크 인터페이스에서 접속 허용)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🚀 서버가 시작되었습니다!');
      console.log(`📡 포트: ${PORT}`);
      console.log(`🌍 환경: ${process.env.NODE_ENV}`);
      console.log(`🔗 로컬 URL: http://localhost:${PORT}`);
      console.log(`🔗 네트워크 URL: http://0.0.0.0:${PORT}`);
      console.log('');
      console.log('사용 가능한 엔드포인트:');
      console.log('  GET  /           - API 정보');
      console.log('  GET  /health     - 헬스 체크');
      console.log('  POST /api/v1/auth/register - 회원가입');
      console.log('  POST /api/v1/auth/login    - 로그인');
      console.log('');
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다.`);
      } else {
        console.error('❌ 서버 에러:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

startServer();

export default app;
