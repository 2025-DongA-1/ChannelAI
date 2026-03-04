import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import pool from './config/database';
import { connectRedis } from './config/redis';
import { verifyEmailConnection } from './services/emailService';
import { sendWeeklyReports, sendDailyReports } from './services/reportService';
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignRoutes';
import accountRoutes from './routes/accountRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import integrationRoutes from './routes/integrationRoutes';
import budgetRoutes from './routes/budgetRoutes';
import insightRoutes from './routes/insightRoutes';
import aiRoutes from './routes/aiRoutes';
import reportRoutes from './routes/reportRoutes';
import metricRoutes from './routes/metricRoutes';
import { spawn } from 'child_process';
import path from 'path';

// 환경 변수 로드
dotenv.config();



const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// 미들웨어
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://211.188.63.79',
  'http://channelai.kro.kr',
  'https://channelai.kro.kr',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // 서버 간 요청(origin 없음) 또는 허용 목록에 있으면 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
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

// ─────────────────────────────────────────────────────────────
// [추가됨] AI 마케팅 예산 분석 (Python 연동)
// ─────────────────────────────────────────────────────────────
app.post('/api/v1/ai/recommend', (req: Request, res: Response) => {
  console.log("🤖 [AI] 예산 분석 요청 수신");

  const inputData = req.body;

  // 금액 상한선 설정(200만원)
  if (inputData.total_budget > 2000000) {
    return res.status(400).json({
      error: "맞춤형 AI 분석은 최대 2,000,000원까지만 지원합니다."
    })
  }
  // 1. 파이썬 스크립트 경로 찾기
  // process.cwd()는 현재 서버가 실행되는 루트 폴더(backend)를 가리킵니다.
  const pythonScriptPath = path.join(process.cwd(), 'ai', 'predict_budget.py');

  // 2. 파이썬 실행
  const pythonProcess = spawn('python', [pythonScriptPath, JSON.stringify(inputData)]);

  let resultString = '';
  let errorString = '';

  // 데이터 수신
  pythonProcess.stdout.on('data', (data) => {
    resultString += data.toString();
  });

  // 에러 수신
  pythonProcess.stderr.on('data', (data) => {
    errorString += data.toString();
  });

  // 종료 처리
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ [AI Error]', errorString);
      return res.status(500).json({ 
        error: "AI 분석 중 오류 발생", 
        details: errorString 
      });
    }

    try {
      // 파이썬 결과를 JSON으로 변환
      const result = JSON.parse(resultString);
      
      // ⚡ [핵심 1] 프론트엔드로 3초 만에 결과 먼저 즉시 반환! (기존 코드)
      res.json(result);

      // 💾 [핵심 2] 화면은 이미 넘어갔고, 여기서부터 조용히 비동기 DB 저장을 시작합니다.
      const bestChannelIndex = result.allocated_budget.indexOf(Math.max(...result.allocated_budget));
      const channelNames = ["네이버", "메타", "구글", "당근"];
      const bestChannel = channelNames[bestChannelIndex];

      (async () => {
        try {
          if (!inputData.user_id) return;

          const query = `
            INSERT INTO ai_history (user_id, duration, budget, best_channel, expected_revenue, full_report) 
            VALUES (?, ?, ?, ?, ?, ?)
          `;

          // 💡 [수정] import한 기존 'pool'을 그대로 사용합니다.
          await pool.query(query, [
            inputData.user_id,
            inputData.duration || 7,
            inputData.total_budget,
            bestChannel,
            result.expected_revenue,
            JSON.stringify(result)
          ]);
          
          console.log(`✅ [플랜be] 유저(${inputData.user_id}) 리포트 저장 완료!`);
        } catch (dbErr) {
          console.error("❌ [플랜be AI DB 저장 에러]:", dbErr);
        }
      })();
    } catch (e) {
      console.error('❌ [Parsing Error]', e);
      if (!res.headersSent) {
        res.status(500).json({ error: "결과 파싱 실패" });
      }
    } 
  });
});

// AI추천 모델 DB 데이터 불러오기 - 특정 유저의 과거 AI 분석 내역 조회

app.get('/api/v1/ai/history/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  console.log(`📜 [AI] 유저(${userId})의 히스토리 조회 요청`);

  try {
    // 💡 질문자님의 pool.query는 이미 결과값만 반환하므로 [rows]가 아닌 rows로 받습니다.
    const rows = await pool.query(
      'SELECT id, budget, best_channel, expected_revenue, created_at FROM ai_history WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // 데이터가 없을 경우 빈 배열([])이 반환될 것입니다.
    res.json(rows);
    
  } catch (error) {
    console.error('❌ [AI History Error]:', error);
    res.status(500).json({ 
      error: "내역 조회 중 오류 발생",
      message: error instanceof Error ? error.message : "Internal Server Error"
    });
  }
});


// ─────────────────────────────────────────────────────────────

// API 라우트
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/integration', integrationRoutes);
app.use('/api/v1/budget', budgetRoutes);
app.use('/api/v1/insights', insightRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/report', reportRoutes);   // 리포트 이메일 발송 API
app.use('/api/v1/metrics', metricRoutes);  // 로우 데이터/메트릭 관리 API

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
      metrics: '/api/v1/metrics',
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

    // 이메일 서버 연결 확인
    const emailEnabled = await verifyEmailConnection();

    // ── cron 스케줄 등록 ───────────────────────────────────────────────
    if (emailEnabled) {
      // 주간 리포트: 매주 월요일 오전 9시 (기본)
      cron.schedule('0 9 * * 1', async () => {
        console.log('⏰ [CRON] 주간 리포트 발송 시작');
        await sendWeeklyReports();
      }, { timezone: 'Asia/Seoul' });
      console.log('📅 주간 리포트 스케줄 등록: 매주 월요일 오전 9시');

      // 일간 리포트: 매일 오전 9시 (ENABLE_DAILY_REPORT=true 일 때만 활성화)
      if (process.env.ENABLE_DAILY_REPORT === 'true') {
        cron.schedule('0 9 * * *', async () => {
          console.log('⏰ [CRON] 일간 리포트 발송 시작');
          await sendDailyReports();
        }, { timezone: 'Asia/Seoul' });
        console.log('📅 일간 리포트 스케줄 등록: 매일 오전 9시');
      }
    }
    
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
