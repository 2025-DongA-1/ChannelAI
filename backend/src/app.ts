import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import pool from './config/database';
import { connectRedis } from './config/redis';
import { verifyEmailConnection } from './services/emailService';
import { sendWeeklyReports, sendDailyReports, sendMonthlyReports } from './services/reportService';
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
import creativeRoutes from './routes/creativeRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { spawn } from 'child_process';
import path from 'path';

// 환경 변수 로드
dotenv.config();

// 서버 환경에서 외부 API(Resend 등) 호출 시 프록시를 통하도록 설정
// Node.js native fetch는 HTTP_PROXY 환경변수를 자동으로 따르지 않으므로 명시적으로 설정
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  const { setGlobalDispatcher, ProxyAgent } = require('undici');
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}


const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// 미들웨어
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
});
app.use('/api', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

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
  if (inputData.total_budget > 3000000) {
    return res.status(400).json({
      error: "맞춤형 AI 분석은 최대 3,000,000원까지만 지원합니다."
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

// 특정 AI 분석 리포트의 상세 내용(full_report) 가져오기
app.get('/api/v1/ai/report/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // 🔥 [수정] 대괄호([])를 빼고 결과를 통째로 받습니다.
    const result: any = await pool.query(
      'SELECT full_report FROM ai_history WHERE id = ?',
      [id]
    );

    // 🔥 [수정] 상자(Object) 안에 있는 rows 배열만 안전하게 꺼냅니다.
    const rows = result.rows ? result.rows : (Array.isArray(result) ? result : []);

    if (rows.length === 0) {
      return res.status(404).json({ error: "리포트를 찾을 수 없습니다." });
    }

    // full_report를 꺼내서 프론트엔드로 전달
    const reportData = rows[0].full_report;
    res.json(reportData);

  } catch (error) {
    console.error('❌ [AI Report Detail Error]:', error);
    res.status(500).json({ error: "상세 리포트 조회 실패" });
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
app.use('/api/v1/ai/creative', creativeRoutes);  // AI 소재 에이전트 API
app.use('/api/v1/report', reportRoutes);   // 리포트 이메일 발송 API
app.use('/api/v1/metrics', metricRoutes);  // 로우 데이터/메트릭 관리 API
app.use('/api/v1/payment', paymentRoutes); // 결제 API

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
      creative: '/api/v1/ai/creative',
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

    // 1️⃣ 기존 user_profiles에 잘못 추가된 결제 관련 컬럼들을 정리 (오류 방지를 위해 try-catch 처리)
    const colsToDrop = [
      'plan_started_at', 'plan_expires_at', 'pay_method', 
      'pay_card_company', 'pay_card_last4', 'pay_monthly_amt', 'pay_auto_renew'
    ];
    for (const col of colsToDrop) {
      try {
        await pool.query(`ALTER TABLE user_profiles DROP COLUMN ${col}`);
        console.log(`✅ user_profiles.${col} 컬럼 정리 완료`);
      } catch (e) {
        // 이미 없으면 무시
      }
    }

    // 2️⃣ 결제 수단 전용 payment_methods 테이블 자동 생성 (원상복구)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_methods (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          method VARCHAR(50) DEFAULT 'card',
          monthly_amount DECIMAL(10,2) DEFAULT 9900.00,
          auto_renew TINYINT(1) DEFAULT 1,
          card_company VARCHAR(50),
          card_last4 CHAR(4),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_payment_methods_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ payment_methods 테이블 확인/생성 완료');
    } catch (e) {
      console.warn('⚠️ payment_methods 테이블 생성 실패:', e);
    }

    // 3️⃣ v_subscription 뷰 업데이트 (user_profiles와 payment_methods 조인)
    try {
      await pool.query(`
        CREATE OR REPLACE VIEW v_subscription AS
        SELECT 
          u.user_id,
          u.plan,
          (SELECT plan_started_at FROM payments p WHERE p.user_id = u.user_id AND p.status='success' ORDER BY paid_at DESC LIMIT 1) as plan_started_at,
          (SELECT plan_expires_at FROM payments p WHERE p.user_id = u.user_id AND p.status='success' ORDER BY paid_at DESC LIMIT 1) as plan_expires_at,
          pm.method as pay_method,
          pm.auto_renew as pay_auto_renew,
          pm.card_company as pay_card_company,
          pm.card_last4 as pay_card_last4,
          pm.monthly_amount as pay_monthly_amt
        FROM user_profiles u
        LEFT JOIN payment_methods pm ON u.user_id = pm.user_id
      `);
      console.log('✅ v_subscription 뷰 최신화 완료');
    } catch (e) {
      console.warn('⚠️ v_subscription 뷰 생성 실패:', e);
    }

    // payments 테이블 자동 생성 (없을 경우)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id             BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id        BIGINT       NOT NULL                    COMMENT '결제한 사용자 ID',
          amount         INT          NOT NULL                    COMMENT '결제 금액 (원, 예: 9900)',
          plan           VARCHAR(20)  NOT NULL                    COMMENT '구독 플랜 (PRO 등)',
          pay_method     VARCHAR(50)  DEFAULT NULL                COMMENT '결제 수단 (card, kakao_pay 등)',
          status         VARCHAR(20)  NOT NULL DEFAULT 'success'  COMMENT '결제 상태 (success|failed|cancelled|refunded)',
          transaction_id VARCHAR(200) DEFAULT NULL                COMMENT '외부 PG사 거래 ID',
          period_start   DATETIME     DEFAULT NULL                COMMENT '구독 시작일',
          period_end     DATETIME     DEFAULT NULL                COMMENT '구독 만료일',
          note           VARCHAR(500) DEFAULT NULL                COMMENT '비고 (수동 처리 사유 등)',
          paid_at        DATETIME     NOT NULL DEFAULT NOW()      COMMENT '결제 일시',
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_payments_user_id (user_id),
          INDEX idx_payments_status  (status),
          INDEX idx_payments_paid_at (paid_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='결제 이력'
      `);
      console.log('✅ payments 테이블 확인/생성 완료');
    } catch (e) {
      console.warn('⚠️ payments 테이블 생성 실패 (무시):', e);
    }

    // creative_generations 테이블 자동 생성 (없을 경우)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS creative_generations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          business_type VARCHAR(100) NOT NULL,
          product_name VARCHAR(200) NOT NULL,
          target_audience VARCHAR(300) NOT NULL,
          tone VARCHAR(100) NOT NULL,
          objective VARCHAR(100) NOT NULL,
          additional_info TEXT DEFAULT NULL,
          had_document TINYINT(1) DEFAULT 0,
          had_image TINYINT(1) DEFAULT 0,
          usp_analysis TEXT DEFAULT NULL,
          generated_copies JSON NOT NULL,
          visual_guide JSON DEFAULT NULL,
          strategy_summary TEXT DEFAULT NULL,
          compliance_notes TEXT DEFAULT NULL,
          user_rating TINYINT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_creative_user (user_id),
          INDEX idx_creative_created (created_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ creative_generations 테이블 확인/생성 완료');
    } catch (e) {
      console.warn('⚠️ creative_generations 테이블 생성 실패 (무시):', e);
    }

    // Redis 연결 (선택적 - 실패해도 서버 시작)
    console.log('🔴 Redis 연결 시도...');
    await connectRedis();

    // 이메일 서버 연결 확인
    const emailEnabled = await verifyEmailConnection();

    // ── cron 스케줄 등록 ───────────────────────────────────────────────
    // PM2 cluster 모드에서 인스턴스 0번에서만 cron 실행 (중복 방지)
    const isCronInstance =
      process.env.NODE_APP_INSTANCE === undefined ||
      process.env.NODE_APP_INSTANCE === '0';

    if (!isCronInstance) {
      console.log(`⏭️  [CRON] 인스턴스 #${process.env.NODE_APP_INSTANCE} → cron 스케줄 등록 건너뜀 (중복 방지)`);
    } else {

    // 구독 자동 갱신: 매일 자정 (결제정보 있는 만료 계정 자동 결제 후 연장)
    cron.schedule('0 0 * * *', async () => {
      console.log('⏰ [CRON] 구독 만료 처리 시작');
      try {
        // auto_renew=1: 만료된 PRO 구독 → 1개월 연장
        const toRenew = await pool.query(`
          SELECT user_id FROM v_subscription
          WHERE plan = 'PRO' AND plan_expires_at <= NOW() AND pay_auto_renew = 1
        `);
        for (const row of (toRenew.rows as any[])) {
          const renewNow = new Date();
          const newExpiry = new Date(renewNow);
          newExpiry.setMonth(newExpiry.getMonth() + 1);
          await pool.query(
            `INSERT INTO payments (user_id, plan, amount, status, plan_started_at, plan_expires_at, paid_at)
             VALUES (?, 'PRO', 9900, 'success', ?, ?, NOW())`,
            [row.user_id, renewNow, newExpiry]
          );
          console.log(`  ✅ 구독 연장 - user_id: ${row.user_id}, 새 만료일: ${newExpiry.toISOString()}`);
        }
        // auto_renew=0: 만료된 PRO 구독 → FREE 전환
        const toExpire = await pool.query(`
          SELECT user_id FROM v_subscription
          WHERE plan = 'PRO' AND plan_expires_at <= NOW() AND pay_auto_renew = 0
        `);
        for (const row of (toExpire.rows as any[])) {
          await pool.query(
            `UPDATE user_profiles SET plan = NULL WHERE user_id = ?`,
            [row.user_id]
          );
        }
        if ((toExpire.rows as any[]).length > 0) {
          console.log(`  ✅ FREE 전환 완료 - ${(toExpire.rows as any[]).length}명`);
        }
        console.log('⏰ [CRON] 구독 만료 처리 완료');
      } catch (e) {
        console.error('❌ [CRON] 구독 자동 갱신 오류:', e);
      }
    }, { timezone: 'Asia/Seoul' });
    console.log('📅 구독 자동 갱신 크론 등록: 매일 자정');

    if (emailEnabled) {
      // 주간 리포트: 매주 월요일 오전 9시 (기본) - [사용 안함]
      /*
      cron.schedule('0 9 * * 1', async () => {
        console.log('⏰ [CRON] 주간 리포트 발송 시작');
        await sendWeeklyReports();
      }, { timezone: 'Asia/Seoul' });
      console.log('📅 주간 리포트 스케줄 등록: 매주 월요일 오전 9시');
      */

      // 매일 오후 5시 20분 월간 리포트 발송
      cron.schedule('20 9 * * *', async () => {
        console.log('⏰ [CRON] 월간 리포트 발송 시작 (report@channelai.kro.kr)');
        await sendMonthlyReports();
      }, { timezone: 'Asia/Seoul' });
      console.log('📅 월간 리포트 스케줄 등록: 매일 오전 9시 (Asia/Seoul)');
    }

    } // end isCronInstance
    
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
