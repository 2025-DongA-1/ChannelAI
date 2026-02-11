const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

// 서버 연결 확인
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ 서버 연결 확인');
    return true;
  } catch (error) {
    console.error('❌ 서버가 실행되지 않았습니다:', error.message);
    console.log('\n서버를 먼저 시작해주세요:');
    console.log('cd backend && npx ts-node src/app.ts\n');
    return false;
  }
}

// 회원가입 (필요시)
async function register() {
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: '대시보드 테스트',
      email: 'dashboard@test.com',
      password: 'test1234',
      company: '테스트 회사'
    });
    console.log('✅ 회원가입 완료');
  } catch (error) {
    // 이미 존재하는 경우 무시
    console.log('ℹ️  회원가입 스킵 (이미 존재)');
  }
}

// 로그인
async function login() {
  try {
    console.log('\n=== 1. 로그인 ===');
    
    // 회원가입 시도
    await register();
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'dashboard@test.com',
      password: 'test1234'
    });
    
    console.log('Status:', response.status);
    console.log('✅ 로그인 성공');
    authToken = response.data.token;
    console.log('Token:', authToken.substring(0, 50) + '...');
    return true;
  } catch (error) {
    console.error('❌ 로그인 실패:', error.response?.data || error.message);
    return false;
  }
}

// 대시보드 요약 조회
async function getSummary() {
  try {
    console.log('\n=== 2. 대시보드 요약 조회 ===');
    const response = await axios.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('Status:', response.status);
    console.log('✅ 요약 조회 성공');
    console.log('Metrics:', {
      campaigns: response.data.metrics.campaigns,
      accounts: response.data.metrics.accounts,
      impressions: response.data.metrics.impressions,
      clicks: response.data.metrics.clicks,
      conversions: response.data.metrics.conversions,
      cost: response.data.metrics.cost,
      revenue: response.data.metrics.revenue,
      ctr: response.data.metrics.ctr + '%',
      cpc: response.data.metrics.cpc,
      roas: response.data.metrics.roas
    });
    console.log('Status:', response.data.status);
    console.log('Budget:', {
      total: response.data.budget.total,
      spent: response.data.budget.spent,
      remaining: response.data.budget.remaining,
      utilizationRate: response.data.budget.utilizationRate + '%'
    });
    return true;
  } catch (error) {
    console.error('❌ 요약 조회 실패:', error.response?.data || error.message);
    return false;
  }
}

// 채널별 성과 조회
async function getChannelPerformance() {
  try {
    console.log('\n=== 3. 채널별 성과 조회 ===');
    const response = await axios.get(`${BASE_URL}/dashboard/channel-performance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('Status:', response.status);
    console.log('✅ 채널별 성과 조회 성공');
    console.log('Total platforms:', response.data.performance.length);
    
    if (response.data.performance.length > 0) {
      console.log('\n첫 번째 채널:');
      const first = response.data.performance[0];
      console.log('Platform:', first.platform);
      console.log('Campaigns:', first.campaigns);
      console.log('Metrics:', {
        impressions: first.metrics.impressions,
        clicks: first.metrics.clicks,
        conversions: first.metrics.conversions,
        cost: first.metrics.cost,
        revenue: first.metrics.revenue,
        ctr: first.metrics.ctr + '%',
        cpc: first.metrics.cpc,
        roas: first.metrics.roas
      });
    }
    return true;
  } catch (error) {
    console.error('❌ 채널별 성과 조회 실패:', error.response?.data || error.message);
    return false;
  }
}

// 인사이트 조회
async function getInsights() {
  try {
    console.log('\n=== 4. 인사이트 조회 ===');
    const response = await axios.get(`${BASE_URL}/dashboard/insights?limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('Status:', response.status);
    console.log('✅ 인사이트 조회 성공');
    console.log('Total insights:', response.data.total);
    
    if (response.data.insights.length > 0) {
      console.log('\n최근 인사이트:');
      response.data.insights.forEach((insight, idx) => {
        console.log(`${idx + 1}. [${insight.priority.toUpperCase()}] ${insight.title}`);
        console.log(`   Type: ${insight.type}, Status: ${insight.status}`);
      });
    } else {
      console.log('인사이트가 없습니다.');
    }
    return true;
  } catch (error) {
    console.error('❌ 인사이트 조회 실패:', error.response?.data || error.message);
    return false;
  }
}

// 예산 현황 조회 (플랫폼별)
async function getBudgetByPlatform() {
  try {
    console.log('\n=== 5. 예산 현황 조회 (플랫폼별) ===');
    const response = await axios.get(`${BASE_URL}/dashboard/budget?groupBy=platform`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('Status:', response.status);
    console.log('✅ 예산 현황 조회 성공');
    console.log('Group by:', response.data.groupBy);
    console.log('Total platforms:', response.data.budgets.length);
    
    if (response.data.budgets.length > 0) {
      console.log('\n플랫폼별 예산:');
      response.data.budgets.forEach((budget, idx) => {
        console.log(`${idx + 1}. ${budget.platform.toUpperCase()}`);
        console.log(`   Total Budget: ${budget.totalBudget}, Spent: ${budget.spent}`);
        console.log(`   Remaining: ${budget.remaining}, Usage: ${budget.utilizationRate}%`);
        console.log(`   Status: ${budget.status}`);
      });
    }
    return true;
  } catch (error) {
    console.error('❌ 예산 현황 조회 실패:', error.response?.data || error.message);
    return false;
  }
}

// 예산 현황 조회 (캠페인별)
async function getBudgetByCampaign() {
  try {
    console.log('\n=== 6. 예산 현황 조회 (캠페인별) ===');
    const response = await axios.get(`${BASE_URL}/dashboard/budget?groupBy=campaign`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('Status:', response.status);
    console.log('✅ 예산 현황 조회 성공');
    console.log('Group by:', response.data.groupBy);
    console.log('Total campaigns:', response.data.budgets.length);
    
    if (response.data.budgets.length > 0) {
      console.log('\n상위 캠페인 예산:');
      response.data.budgets.slice(0, 3).forEach((budget, idx) => {
        console.log(`${idx + 1}. ${budget.name} (${budget.platform})`);
        console.log(`   Total Budget: ${budget.totalBudget}, Spent: ${budget.spent}`);
        console.log(`   Usage: ${budget.utilizationRate}%, Status: ${budget.status}`);
      });
    }
    return true;
  } catch (error) {
    console.error('❌ 예산 현황 조회 실패:', error.response?.data || error.message);
    return false;
  }
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 대시보드 API 테스트 시작...\n');

  // 서버 확인
  const serverOk = await checkServer();
  if (!serverOk) return;

  // 로그인
  const loginOk = await login();
  if (!loginOk) return;

  // 대시보드 테스트
  await getSummary();
  await getChannelPerformance();
  await getInsights();
  await getBudgetByPlatform();
  await getBudgetByCampaign();

  console.log('\n✅ 모든 테스트 완료!\n');
  console.log('📊 구현된 대시보드 API:');
  console.log('  - GET  /api/v1/dashboard/summary              - 전체 요약 통계');
  console.log('  - GET  /api/v1/dashboard/channel-performance  - 채널별 성과');
  console.log('  - GET  /api/v1/dashboard/insights             - 최근 인사이트');
  console.log('  - GET  /api/v1/dashboard/budget               - 예산 현황');
}

// 테스트 실행
runTests().catch(console.error);
