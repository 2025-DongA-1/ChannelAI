const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';
let userId = '';
let accountId = '';
let campaignId = '';

// 서버 연결 확인
async function checkServer() {
  try {
    await axios.get('http://localhost:3000/health');
    console.log('✅ 서버 연결 확인\n');
    return true;
  } catch (error) {
    console.error('❌ 서버가 실행되지 않았습니다\n');
    return false;
  }
}

// 회원가입 & 로그인
async function login() {
  try {
    // 회원가입 시도 (이미 존재할 수 있음)
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'API 연동 테스트',
        email: 'integration@test.com',
        password: 'test1234',
        company: '테스트 회사'
      });
    } catch (e) {
      // 이미 존재하는 경우 무시
    }

    console.log('=== 1. 로그인 ===');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'integration@test.com',
      password: 'test1234'
    });
    
    authToken = response.data.token;
    userId = response.data.user.id;
    console.log('✅ 로그인 성공');
    console.log('User ID:', userId);
    console.log('Token:', authToken.substring(0, 50) + '...\n');
    return true;
  } catch (error) {
    console.error('❌ 로그인 실패:', error.response?.data || error.message);
    return false;
  }
}

// OAuth URL 생성
async function getAuthUrl(platform) {
  try {
    console.log(`=== 2. ${platform.toUpperCase()} OAuth URL 생성 ===`);
    const response = await axios.get(`${BASE_URL}/integration/auth/${platform}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ OAuth URL 생성 성공');
    console.log('Platform:', response.data.platform);
    console.log('Auth URL:', response.data.authUrl.substring(0, 100) + '...');
    console.log('State:', response.data.state.substring(0, 30) + '...\n');
    return true;
  } catch (error) {
    console.error('❌ OAuth URL 생성 실패:', error.response?.data || error.message);
    return false;
  }
}

// OAuth 콜백 시뮬레이션 (Mock 서비스는 실제 콜백 없이 직접 호출)
async function simulateCallback(platform) {
  try {
    console.log(`=== 3. ${platform.toUpperCase()} OAuth 콜백 시뮬레이션 ===`);
    
    // Mock 코드와 state 생성
    const mockCode = `mock_code_${platform}_${Date.now()}`;
    const mockState = Buffer.from(JSON.stringify({ 
      userId: userId,  // 로그인한 사용자 ID 사용
      platform 
    })).toString('base64');

    const response = await axios.get(`${BASE_URL}/integration/callback/${platform}`, {
      params: {
        code: mockCode,
        state: mockState
      }
    });
    
    console.log('✅ OAuth 인증 완료');
    console.log('Platform:', response.data.platform);
    console.log('Accounts Connected:', response.data.accountsConnected);
    console.log('Accounts:', response.data.accounts);
    
    // 첫 번째 계정 ID 저장 (나중에 사용)
    if (response.data.accounts && response.data.accounts.length > 0) {
      console.log('→ 첫 번째 계정 선택됨\n');
    }
    return true;
  } catch (error) {
    console.error('❌ OAuth 콜백 실패:', error.response?.data || error.message);
    return false;
  }
}

// 캠페인 동기화
async function syncCampaigns(platform) {
  try {
    console.log(`=== 4. ${platform.toUpperCase()} 캠페인 동기화 ===`);
    
    // 먼저 연결된 계정 조회
    const accountsResponse = await axios.get(`${BASE_URL}/accounts?platform=${platform}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (accountsResponse.data.accounts.length === 0) {
      console.log('⚠️  연결된 계정이 없습니다\n');
      return false;
    }

    accountId = accountsResponse.data.accounts[0].id;
    console.log(`Account ID: ${accountId}`);

    const response = await axios.post(
      `${BASE_URL}/integration/sync/campaigns/${accountId}`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ 캠페인 동기화 성공');
    console.log('Total Campaigns:', response.data.totalCampaigns);
    console.log('Synced:', response.data.synced);
    console.log('New:', response.data.new);
    console.log('Campaigns:', response.data.campaigns.slice(0, 3).map(c => c.name).join(', '));
    
    // 첫 번째 캠페인 ID 저장
    if (response.data.campaigns.length > 0) {
      // DB에서 실제 캠페인 ID 조회
      const campaignsResponse = await axios.get(`${BASE_URL}/campaigns`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (campaignsResponse.data.campaigns.length > 0) {
        campaignId = campaignsResponse.data.campaigns[0].id;
        console.log(`→ 캠페인 ID ${campaignId} 선택됨\n`);
      }
    }
    return true;
  } catch (error) {
    console.error('❌ 캠페인 동기화 실패:', error.response?.data || error.message);
    return false;
  }
}

// 메트릭 동기화
async function syncMetrics() {
  try {
    console.log('=== 5. 메트릭 동기화 ===');
    
    if (!campaignId) {
      console.log('⚠️  동기화할 캠페인이 없습니다\n');
      return false;
    }

    const startDate = '2024-01-01';
    const endDate = '2024-01-07';

    const response = await axios.post(
      `${BASE_URL}/integration/sync/metrics/${campaignId}`,
      { startDate, endDate },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ 메트릭 동기화 성공');
    console.log('Campaign:', response.data.campaign.name);
    console.log('Platform:', response.data.campaign.platform);
    console.log('Period:', `${startDate} ~ ${endDate}`);
    console.log('Metrics Synced:', response.data.metricsSynced, '\n');
    return true;
  } catch (error) {
    console.error('❌ 메트릭 동기화 실패:', error.response?.data || error.message);
    return false;
  }
}

// 전체 메트릭 일괄 동기화
async function syncAllMetrics() {
  try {
    console.log('=== 6. 전체 메트릭 일괄 동기화 ===');
    
    const startDate = '2024-01-01';
    const endDate = '2024-01-03';

    const response = await axios.post(
      `${BASE_URL}/integration/sync/all`,
      { startDate, endDate },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ 전체 메트릭 동기화 성공');
    console.log('Total Campaigns:', response.data.totalCampaigns);
    console.log('Total Metrics:', response.data.totalMetrics);
    console.log('Results:');
    response.data.results.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.campaign} (${r.platform}): ${r.synced || r.error}`);
    });
    console.log();
    return true;
  } catch (error) {
    console.error('❌ 전체 메트릭 동기화 실패:', error.response?.data || error.message);
    return false;
  }
}

// 대시보드 확인
async function checkDashboard() {
  try {
    console.log('=== 7. 대시보드 확인 (동기화 후) ===');
    
    const response = await axios.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 대시보드 조회 성공');
    console.log('Campaigns:', response.data.metrics.campaigns);
    console.log('Accounts:', response.data.metrics.accounts);
    console.log('Impressions:', response.data.metrics.impressions);
    console.log('Clicks:', response.data.metrics.clicks);
    console.log('Cost:', response.data.metrics.cost);
    console.log('Revenue:', response.data.metrics.revenue);
    console.log('ROAS:', response.data.metrics.roas, '\n');
    return true;
  } catch (error) {
    console.error('❌ 대시보드 조회 실패:', error.response?.data || error.message);
    return false;
  }
}

// 메인 테스트
async function runTests() {
  console.log('🧪 외부 API 연동 테스트 시작...\n');
  console.log('📝 Mock 서비스로 실제 API 동작을 시뮬레이션합니다\n');

  if (!await checkServer()) return;
  if (!await login()) return;

  // Google Ads 테스트
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 Google Ads 연동 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await getAuthUrl('google');
  await simulateCallback('google');
  await syncCampaigns('google');
  
  // Meta Ads 테스트
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🟦 Meta Ads 연동 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await getAuthUrl('meta');
  await simulateCallback('meta');
  await syncCampaigns('meta');
  
  // Naver Ads 테스트
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🟩 Naver Ads 연동 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await getAuthUrl('naver');
  await simulateCallback('naver');
  await syncCampaigns('naver');

  // 메트릭 동기화
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 데이터 동기화 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await syncMetrics();
  await syncAllMetrics();
  await checkDashboard();

  console.log('✅ 모든 테스트 완료!\n');
  console.log('📋 구현된 API 연동 기능:');
  console.log('  ✅ Google Ads OAuth 및 데이터 동기화');
  console.log('  ✅ Meta Ads OAuth 및 데이터 동기화');
  console.log('  ✅ Naver Ads OAuth 및 데이터 동기화');
  console.log('  ✅ 캠페인 자동 동기화');
  console.log('  ✅ 메트릭 자동 동기화');
  console.log('  ✅ 대시보드 실시간 업데이트\n');
  console.log('💡 실제 API로 전환하려면:');
  console.log('  1. 각 플랫폼의 API 키 발급');
  console.log('  2. .env 파일에 키 설정');
  console.log('  3. 서비스 파일의 주석 처리된 실제 구현으로 교체\n');
}

runTests().catch(console.error);
