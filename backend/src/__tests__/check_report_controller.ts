/**
 * 점검 스크립트: reportController (월별 리포트 조회, 리포트 발송)
 * 실행: npx ts-node src/__tests__/check_report_controller.ts
 */

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3001';

// ─── Mock 상태 ──────────────────────────────────────────────────────────────
let _queryResponses: Array<{ rows: any[]; insertId?: number }> = [];
let _qIdx = 0;

const mockPool = {
  query: async (_sql: string, _params?: any[]) => {
    const r = _queryResponses[_qIdx] ?? { rows: [] };
    _qIdx++;
    return r;
  },
};

function setQueries(...results: Array<{ rows: any[]; insertId?: number }>) {
  _queryResponses = results;
  _qIdx = 0;
}

// ─── require.cache 주입 ──────────────────────────────────────────────────────
require.cache[require.resolve('../config/database')] = {
  id: require.resolve('../config/database'),
  filename: require.resolve('../config/database'),
  loaded: true,
  exports: { __esModule: true, default: mockPool },
  paths: [], children: [], parent: null,
} as any;

// reportService mock
require.cache[require.resolve('../services/reportService')] = {
  id: require.resolve('../services/reportService'),
  filename: require.resolve('../services/reportService'),
  loaded: true,
  exports: {
    __esModule: true,
    sendWeeklyReports: async () => {},
    sendDailyReports: async () => {},
    sendTestToEmail: async () => {},
  },
  paths: [], children: [], parent: null,
} as any;

// emailService mock
require.cache[require.resolve('../services/emailService')] = {
  id: require.resolve('../services/emailService'),
  filename: require.resolve('../services/emailService'),
  loaded: true,
  exports: {
    __esModule: true,
    sendEmail: async () => ({ success: true }),
  },
  paths: [], children: [], parent: null,
} as any;

// puppeteer mock (Puppeteer는 실제 브라우저 필요 — mock 처리)
require.cache[require.resolve('puppeteer')] = {
  id: require.resolve('puppeteer'),
  filename: require.resolve('puppeteer'),
  loaded: true,
  exports: {
    __esModule: true,
    default: {
      launch: async () => ({
        newPage: async () => ({
          goto: async () => {},
          evaluate: async (_fn: Function) => {},
          waitForSelector: async () => {},
          pdf: async () => Buffer.from('mock-pdf'),
          close: async () => {},
        }),
        close: async () => {},
      }),
    },
  },
  paths: [], children: [], parent: null,
} as any;

const {
  triggerWeeklyReport,
  triggerDailyReport,
  triggerTestReport,
  triggerSendToEmail,
  getMonthlyReportData,
  sendPdfByEmail,
} = require('../controllers/reportController');

// ─── 유틸 ────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

function mockReqRes(body: any = {}, params: any = {}, query: any = {}, user: any = { id: 1 }, file?: any) {
  const req: any = { body, params, query, user, file };
  const res: any = {
    statusCode: 200,
    body: null as any,
    headers: {} as any,
    status(code: number) { this.statusCode = code; return this; },
    json(b: any) { this.body = b; return this; },
    set(key: string, val: string) { this.headers[key] = val; return this; },
    send(b: any) { this.body = b; return this; },
    end() { return this; },
  };
  return { req, res };
}

(async () => {
  console.log('\n========================================');
  console.log('  🔍 REPORT CONTROLLER 점검 시작');
  console.log('========================================');

  // ── triggerWeeklyReport ──────────────────────────────────────────────────────
  console.log('\n▶ triggerWeeklyReport');

  console.log('\n[1] 주간 리포트 발송 시작 → 200 success');
  {
    const { req, res } = mockReqRes();
    await triggerWeeklyReport(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
    check('message 포함', typeof res.body?.message === 'string');
  }

  // ── triggerDailyReport ───────────────────────────────────────────────────────
  console.log('\n▶ triggerDailyReport');

  console.log('\n[2] 일간 리포트 발송 시작 → 200 success');
  {
    const { req, res } = mockReqRes();
    await triggerDailyReport(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
    check('message 포함', typeof res.body?.message === 'string');
  }

  // ── triggerTestReport ────────────────────────────────────────────────────────
  console.log('\n▶ triggerTestReport');

  console.log('\n[3] 테스트 리포트 발송 → 200 success');
  {
    const { req, res } = mockReqRes();
    await triggerTestReport(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
  }

  // ── triggerSendToEmail ───────────────────────────────────────────────────────
  console.log('\n▶ triggerSendToEmail');

  console.log('\n[4] email 없음 → 400');
  {
    const { req, res } = mockReqRes({ email: '' });
    await triggerSendToEmail(req, res);
    check('400 반환', res.statusCode === 400);
    check('success = false', res.body?.success === false);
  }

  console.log('\n[5] 정상 email → 200 (백그라운드 발송)');
  {
    setQueries({ rows: [{ name: '테스트유저' }] });
    const { req, res } = mockReqRes({ email: 'test@example.com' });
    await triggerSendToEmail(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
  }

  // ── getMonthlyReportData ─────────────────────────────────────────────────────
  console.log('\n▶ getMonthlyReportData');

  console.log('\n[6] 데이터 없을 때 → 200 + 빈 객체');
  {
    // 3개 쿼리: summaryRows, platformRows, campaignRows 모두 빈 배열
    setQueries({ rows: [] }, { rows: [] }, { rows: [] });
    const { req, res } = mockReqRes({}, {}, {});
    await getMonthlyReportData(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
    check('data 객체', typeof res.body?.data === 'object');
    check('data 빈 객체', Object.keys(res.body?.data ?? {}).length === 0);
  }

  console.log('\n[7] 정상 데이터 → 200 + 월별 집계');
  {
    const summaryRow = {
      month: '2026-02',
      impressions: 100000,
      clicks: 3000,
      cost: 1000000,
      conversions: 60,
      revenue: 3000000,
      ctr: 3.0,
      cpc: 333,
      roas: 300,
    };
    const platformRow = {
      month: '2026-02',
      platform: 'meta',
      spend: 600000,
      impressions: 60000,
      clicks: 1800,
      conversions: 36,
    };
    const campaignRow = {
      month: '2026-02',
      campaign_id: 1,
      campaign_name: '봄 캠페인',
      platform: 'meta',
      status: 'active',
      cost: 600000,
      impressions: 60000,
      clicks: 1800,
      conversions: 36,
      revenue: 1800000,
      ctr: 3.0,
      cpc: 333,
      roas: 300,
    };
    setQueries({ rows: [summaryRow] }, { rows: [platformRow] }, { rows: [campaignRow] });
    const { req, res } = mockReqRes({}, {}, { startMonth: '2026-02', endMonth: '2026-02' });
    await getMonthlyReportData(req, res);
    check('200 반환', res.statusCode === 200);
    check('2026-02 키 존재', res.body?.data?.['2026-02'] !== undefined);
    check('impressions 숫자', res.body?.data?.['2026-02']?.impressions === 100000);
    check('platforms.meta 존재', res.body?.data?.['2026-02']?.platforms?.meta !== undefined);
    check('campaigns 배열', Array.isArray(res.body?.data?.['2026-02']?.campaigns));
    check('campaigns 1개', res.body?.data?.['2026-02']?.campaigns?.length === 1);
  }

  console.log('\n[8] 기간 필터 포함 → 200 + 정상 처리');
  {
    setQueries({ rows: [] }, { rows: [] }, { rows: [] });
    const { req, res } = mockReqRes({}, {}, { startMonth: '2025-10', endMonth: '2026-03' });
    await getMonthlyReportData(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
  }

  // ── sendPdfByEmail ───────────────────────────────────────────────────────────
  console.log('\n▶ sendPdfByEmail');

  console.log('\n[9] email 없음 → 400');
  {
    const { req, res } = mockReqRes({});
    await sendPdfByEmail(req, res);
    check('400 반환', res.statusCode === 400);
  }

  console.log('\n[10] file 없음 → 400');
  {
    const { req, res } = mockReqRes({ email: 'test@example.com' }, {}, {}, { id: 1 }, undefined);
    await sendPdfByEmail(req, res);
    check('400 반환', res.statusCode === 400);
  }

  console.log('\n[11] 정상 PDF 발송 → 200');
  {
    setQueries({ rows: [{ name: '테스트유저' }] });
    const mockFile = { buffer: Buffer.from('mock-pdf-content'), originalname: 'report.pdf' };
    const { req, res } = mockReqRes({ email: 'test@example.com', month: '2026-02' }, {}, {}, { id: 1 }, mockFile);
    await sendPdfByEmail(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
  }

  // ─── 결과 ─────────────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`  결과: ${passed}개 통과 / ${failed}개 실패`);
  if (failed === 0) {
    console.log('  🎉 모든 점검 통과!');
  } else {
    console.log('  ⚠️  일부 점검 실패 - 위 항목 확인 필요');
    process.exit(1);
  }
  console.log('========================================\n');
})();
