/**
 * 점검 스크립트: aiAgentController (analyzeAndRecommend, getAgentStatus)
 * 실행: npx ts-node src/__tests__/check_creative_agent_controller.ts
 */

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.PYTHON_PATH = '/usr/bin/python3';

// ─── Mock 상태 ──────────────────────────────────────────────────────────────
let _queryResponses: Array<{ rows: any[]; insertId?: number }> = [];
let _qIdx = 0;

const mockPool = {
  query: async (_sql: string, _params?: any[]) => {
    const r = _queryResponses[_qIdx] ?? { rows: [] };
    _qIdx++;
    return r;
  },
  connect: async () => ({
    query: async (_sql: string, _params?: any[]) => {
      const r = _queryResponses[_qIdx] ?? { rows: [] };
      _qIdx++;
      return r;
    },
    release: () => {},
  }),
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

// AIAnalysisService mock
require.cache[require.resolve('../services/ai/aiAnalysisService')] = {
  id: require.resolve('../services/ai/aiAnalysisService'),
  filename: require.resolve('../services/ai/aiAnalysisService'),
  loaded: true,
  exports: {
    __esModule: true,
    AIAnalysisService: class {
      async analyzeCampaignRanks() {
        return { topCampaigns: [], bottomCampaigns: [], analysis: 'mock' };
      }
      async analyzeWithGroq() { return 'mock analysis'; }
      async analyzeData() { return 'mock'; }
    },
  },
  paths: [], children: [], parent: null,
} as any;

// LangChain mock
require.cache[require.resolve('@langchain/openai')] = {
  id: require.resolve('@langchain/openai'),
  filename: require.resolve('@langchain/openai'),
  loaded: true,
  exports: {
    __esModule: true,
    ChatOpenAI: class {
      constructor(_opts: any) {}
      async invoke(_prompt: any) { return { content: 'mock AI insight' }; }
    },
  },
  paths: [], children: [], parent: null,
} as any;

require.cache[require.resolve('@langchain/core/prompts')] = {
  id: require.resolve('@langchain/core/prompts'),
  filename: require.resolve('@langchain/core/prompts'),
  loaded: true,
  exports: {
    __esModule: true,
    PromptTemplate: class {
      static fromTemplate(_tpl: string) {
        return { format: async (_vars: any) => 'mock prompt' };
      }
    },
  },
  paths: [], children: [], parent: null,
} as any;

const { analyzeAndRecommend, getAgentStatus } = require('../controllers/aiAgentController');

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

function mockReqRes(body: any = {}, params: any = {}, query: any = {}, user: any = { id: 1 }) {
  const req: any = { body, params, query, user };
  const res: any = {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(b: any) { this.body = b; return this; },
  };
  return { req, res };
}

(async () => {
  console.log('\n========================================');
  console.log('  🔍 AI AGENT CONTROLLER 점검 시작');
  console.log('========================================');

  // ── analyzeAndRecommend ──────────────────────────────────────────────────────
  console.log('\n▶ analyzeAndRecommend');

  console.log('\n[1] userId 없음 → 401');
  {
    setQueries();
    const { req, res } = mockReqRes({}, {}, {}, undefined);
    req.user = undefined;
    await analyzeAndRecommend(req, res);
    check('401 반환', res.statusCode === 401);
    check('success = false', res.body?.success === false);
  }

  console.log('\n[2] 광고 데이터 없을 때 → 200 + 빈 platforms');
  {
    // 3개 쿼리: platformData, trendData, campaignList 모두 빈 배열
    setQueries({ rows: [] }, { rows: [] }, { rows: [] });
    const { req, res } = mockReqRes({ period: 7 }, {}, {}, { id: 1 });
    await analyzeAndRecommend(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
    check('platforms 배열', Array.isArray(res.body?.data?.platforms));
    check('platforms 빈 배열', res.body?.data?.platforms?.length === 0);
    check('recommendations 배열', Array.isArray(res.body?.data?.recommendations));
    check('overallInsight 키 존재', 'overallInsight' in (res.body?.data ?? {}));
  }

  console.log('\n[3] 정상 플랫폼 데이터 → 200 + 분석 결과');
  {
    const platformRow = {
      platform: 'meta',
      campaign_count: 2,
      total_daily_budget: 100000,
      total_budget: 3000000,
      impressions: 50000,
      clicks: 1500,
      conversions: 30,
      cost: 500000,
      revenue: 1500000,
      ctr: 3.0,
      cpc: 333.33,
      roas: 3.0,
      cpa: 16667,
    };
    const trendRow = {
      date: '2026-03-01',
      platform: 'meta',
      impressions: 5000,
      clicks: 150,
      conversions: 3,
      cost: 50000,
      revenue: 150000,
    };
    setQueries({ rows: [platformRow] }, { rows: [trendRow] }, { rows: [] });
    const { req, res } = mockReqRes({ totalBudget: 5000000, period: 30 }, {}, {}, { id: 1 });
    await analyzeAndRecommend(req, res);
    check('200 반환', res.statusCode === 200);
    check('platforms 1개', res.body?.data?.platforms?.length === 1);
    check('platform = meta', res.body?.data?.platforms?.[0]?.platform === 'meta');
    check('spent 계산', res.body?.data?.platforms?.[0]?.spent === 500000);
    check('analysis.period 포함', res.body?.data?.analysis?.period !== undefined);
    check('totalBudget 반영', res.body?.data?.analysis?.totalBudget === 5000000);
  }

  console.log('\n[4] campaignId 필터 포함 → 200 + 정상 처리');
  {
    setQueries({ rows: [] }, { rows: [] }, { rows: [] });
    const { req, res } = mockReqRes({ campaignId: '5', period: 30 }, {}, {}, { id: 1 });
    await analyzeAndRecommend(req, res);
    check('200 반환', res.statusCode === 200);
    check('availableCampaigns 포함', Array.isArray(res.body?.data?.availableCampaigns));
  }

  // ── getAgentStatus ───────────────────────────────────────────────────────────
  console.log('\n▶ getAgentStatus');

  console.log('\n[5] 데이터 없을 때 → 200 + 0 카운트');
  {
    // 3개 카운트 쿼리: accounts, campaigns, metrics
    setQueries(
      { rows: [{ count: 0 }] },
      { rows: [{ count: 0 }] },
      { rows: [{ count: 0 }] },
    );
    const { req, res } = mockReqRes({}, {}, {}, { id: 1 });
    await getAgentStatus(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
  }

  console.log('\n[6] 정상 데이터 → 200 + 상태 정보');
  {
    setQueries(
      { rows: [{ count: 3 }] },
      { rows: [{ count: 12 }] },
      { rows: [{ count: 500 }] },
    );
    const { req, res } = mockReqRes({}, {}, {}, { id: 1 });
    await getAgentStatus(req, res);
    check('200 반환', res.statusCode === 200);
    check('success = true', res.body?.success === true);
    check('status 또는 data 포함', res.body?.status !== undefined || res.body?.data !== undefined);
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
