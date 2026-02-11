const http = require('http');

let authToken = '';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData ? JSON.parse(responseData) : null,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function login() {
  console.log('\n=== 1. 로그인 ===');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }, {
    email: 'test@example.com',
    password: 'Test1234!',
  });

  console.log('Status:', result.statusCode);
  if (result.statusCode === 200) {
    authToken = result.data.token;
    console.log('✅ 로그인 성공');
    console.log('Token:', authToken.substring(0, 50) + '...');
  } else {
    console.log('❌ 로그인 실패:', result.data);
    process.exit(1);
  }
}

async function createAccount() {
  console.log('\n=== 2. 마케팅 계정 연결 ===');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/accounts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  }, {
    platform: 'google',
    account_name: '테스트 구글 광고 계정',
    account_id: 'google-123456',
    access_token: 'dummy_access_token',
  });

  console.log('Status:', result.statusCode);
  if (result.statusCode === 201) {
    console.log('✅ 계정 연결 성공');
    console.log('Account:', result.data.account);
    return result.data.account.id;
  } else {
    console.log('Response:', result.data);
    return null;
  }
}

async function getAccounts() {
  console.log('\n=== 3. 마케팅 계정 목록 조회 ===');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/accounts',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  console.log('Status:', result.statusCode);
  if (result.statusCode === 200) {
    console.log('✅ 계정 목록 조회 성공');
    console.log('Total accounts:', result.data.accounts.length);
    return result.data.accounts;
  }
  return [];
}

async function createCampaign(accountId) {
  console.log('\n=== 4. 캠페인 생성 ===');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/campaigns',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  }, {
    marketing_account_id: accountId,
    platform: 'google',
    campaign_name: '2024 신제품 런칭 캠페인',
    campaign_id: 'camp-001',
    objective: '브랜드 인지도 향상',
    daily_budget: 150000,
    total_budget: 5000000,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: 'active',
  });

  console.log('Status:', result.statusCode);
  if (result.statusCode === 201) {
    console.log('✅ 캠페인 생성 성공');
    console.log('Campaign:', result.data.campaign);
    return result.data.campaign.id;
  } else {
    console.log('Response:', result.data);
    return null;
  }
}

async function getCampaigns() {
  console.log('\n=== 5. 캠페인 목록 조회 ===');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/campaigns?page=1&limit=10',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  console.log('Status:', result.statusCode);
  if (result.statusCode === 200) {
    console.log('✅ 캠페인 목록 조회 성공');
    console.log('Total campaigns:', result.data.campaigns.length);
    console.log('Pagination:', result.data.pagination);
    if (result.data.campaigns.length > 0) {
      console.log('First campaign:', result.data.campaigns[0].campaign_name);
    }
  }
}

async function getCampaignDetail(campaignId) {
  console.log('\n=== 6. 캠페인 상세 조회 ===');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/campaigns/${campaignId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  console.log('Status:', result.statusCode);
  if (result.statusCode === 200) {
    console.log('✅ 캠페인 상세 조회 성공');
    console.log('Campaign:', result.data.campaign.campaign_name);
    console.log('Channel:', result.data.campaign.channel_name);
    console.log('Budget:', result.data.campaign.budget);
  }
}

async function updateCampaign(campaignId) {
  console.log('\n=== 7. 캠페인 수정 ===');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/campaigns/${campaignId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  }, {
    daily_budget: 200000,
    total_budget: 7000000,
    status: 'active',
  });

  console.log('Status:', result.statusCode);
  if (result.statusCode === 200) {
    console.log('✅ 캠페인 수정 성공');
    console.log('Updated budget:', result.data.campaign.daily_budget, '/', result.data.campaign.total_budget);
  }
}

async function runTests() {
  try {
    console.log('🧪 캠페인 관리 API 테스트 시작...');
    
    // 1. 로그인
    await login();
    
    // 2. 마케팅 계정 연결
    const accountId = await createAccount();
    if (!accountId) {
      console.log('\n⚠️  계정이 이미 존재합니다. 기존 계정을 사용합니다.');
    }
    
    // 3. 계정 목록 조회
    const accounts = await getAccounts();
    const validAccountId = accountId || (accounts.length > 0 ? accounts[0].id : null);
    
    if (!validAccountId) {
      console.log('\n❌ 사용 가능한 계정이 없습니다.');
      process.exit(1);
    }
    
    // 4. 캠페인 생성
    const campaignId = await createCampaign(validAccountId);
    if (!campaignId) {
      console.log('\n❌ 캠페인 생성 실패');
      process.exit(1);
    }
    
    // 5. 캠페인 목록 조회
    await getCampaigns();
    
    // 6. 캠페인 상세 조회
    await getCampaignDetail(campaignId);
    
    // 7. 캠페인 수정
    await updateCampaign(campaignId);
    
    console.log('\n✅ 모든 테스트 완료!');
    console.log('\n📊 구현된 API:');
    console.log('  - POST   /api/v1/accounts          - 마케팅 계정 연결');
    console.log('  - GET    /api/v1/accounts          - 계정 목록 조회');
    console.log('  - GET    /api/v1/accounts/:id      - 계정 상세 조회');
    console.log('  - PUT    /api/v1/accounts/:id      - 계정 수정');
    console.log('  - DELETE /api/v1/accounts/:id      - 계정 삭제');
    console.log('  - POST   /api/v1/campaigns         - 캠페인 생성');
    console.log('  - GET    /api/v1/campaigns         - 캠페인 목록 조회');
    console.log('  - GET    /api/v1/campaigns/:id     - 캠페인 상세 조회');
    console.log('  - PUT    /api/v1/campaigns/:id     - 캠페인 수정');
    console.log('  - DELETE /api/v1/campaigns/:id     - 캠페인 삭제');
    console.log('  - GET    /api/v1/campaigns/:id/metrics - 캠페인 메트릭');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

// Health check 먼저
function testHealth() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ 서버 연결 확인');
      setTimeout(() => runTests(), 500);
    }
  });

  req.on('error', (error) => {
    console.error('❌ 서버가 실행되지 않았습니다:', error.message);
    console.log('\n서버를 먼저 시작해주세요:');
    console.log('cd backend && npx ts-node src/app.ts');
    process.exit(1);
  });

  req.end();
}

testHealth();
