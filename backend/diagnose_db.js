const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function testUser4() {
  console.log('=== user_id=4 JWT 토큰 생성 + API 테스트 ===\n');

  // 1. JWT 토큰 생성 (user_id=4)
  const token = jwt.sign(
    { id: 4, email: 'copyguswk@naver.com', role: 'user' },
    process.env.JWT_SECRET || 'channel_ai_secret_key_2024',
    { expiresIn: '1h' }
  );
  console.log('🔑 생성된 JWT 토큰:');
  console.log(token);
  console.log('');

  // 2. 백엔드 포트 감지 (5000 or 3000)
  const ports = [5000, 3000];
  let baseUrl = null;

  for (const port of ports) {
    try {
      const res = await axios.get(`http://localhost:${port}/api/v1/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 3000
      });
      baseUrl = `http://localhost:${port}`;
      console.log(`✅ 백엔드 실행 중: port ${port}`);
      console.log('\n📊 대시보드 Summary API 응답:');
      console.log(JSON.stringify(res.data, null, 2));
      break;
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        console.log(`❌ port ${port}: 서버 없음`);
      } else if (e.response) {
        baseUrl = `http://localhost:${port}`;
        console.log(`⚠️ port ${port}: 서버 있음, 응답코드 ${e.response.status}`);
        console.log('응답:', JSON.stringify(e.response.data, null, 2));
        break;
      } else {
        console.log(`⚠️ port ${port}: ${e.message}`);
      }
    }
  }

  if (!baseUrl) {
    console.log('\n❌ 백엔드 서버가 실행 중이지 않습니다!');
    console.log('아래 명령어로 백엔드를 먼저 시작해주세요:');
    console.log('  cd backend && npm run dev');
    console.log('\n💡 위에서 생성한 JWT 토큰을 브라우저 localStorage에 직접 넣어 테스트할 수도 있어요:');
    console.log('  localStorage.setItem("token", "<위 토큰>")');
    return;
  }

  // 3. 추가 API 테스트
  try {
    console.log('\n📈 채널별 성과 API:');
    const perf = await axios.get(`${baseUrl}/api/v1/dashboard/channel-performance`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    });
    console.log(JSON.stringify(perf.data, null, 2));
  } catch (e) {
    console.log('오류:', e.response?.data || e.message);
  }
}

testUser4().catch(e => { console.error('실패:', e.message); process.exit(1); });
