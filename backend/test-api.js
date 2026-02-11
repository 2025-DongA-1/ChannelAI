const http = require('http');

// 회원가입 테스트
function testRegister() {
  const data = JSON.stringify({
    email: 'test@example.com',
    password: 'Test1234!',
    name: '테스트사용자',
    company_name: '테스트회사'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('\n=== 회원가입 테스트 ===');
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.parse(responseData));
      
      if (res.statusCode === 201) {
        const result = JSON.parse(responseData);
        testLogin(result.token);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(data);
  req.end();
}

// 로그인 테스트
function testLogin(registerToken) {
  const data = JSON.stringify({
    email: 'test@example.com',
    password: 'Test1234!'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('\n=== 로그인 테스트 ===');
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.parse(responseData));
      
      if (res.statusCode === 200) {
        const result = JSON.parse(responseData);
        testGetMe(result.token);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(data);
  req.end();
}

// 내 정보 조회 테스트
function testGetMe(token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('\n=== 내 정보 조회 테스트 ===');
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.parse(responseData));
      console.log('\n✅ 모든 테스트 완료!');
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.end();
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
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('=== Health Check ===');
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.parse(responseData));
      
      if (res.statusCode === 200) {
        setTimeout(() => testRegister(), 500);
      }
    });
  });

  req.on('error', (error) => {
    console.error('서버가 실행되지 않았습니다:', error.message);
    console.log('\n서버를 먼저 시작해주세요:');
    console.log('cd backend && npx ts-node src/app.ts');
    process.exit(1);
  });

  req.end();
}

console.log('🧪 API 테스트 시작...\n');
testHealth();
