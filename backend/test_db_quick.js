const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDB() {
  console.log('=== DB 연결 점검 시작 ===');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT);
  console.log('DB  :', process.env.DB_NAME);
  console.log('User:', process.env.DB_USER);
  console.log('');

  let pool;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'project-db-cgi.smhrd.com',
      port: parseInt(process.env.DB_PORT || '3307'),
      database: process.env.DB_NAME || 'cgi_25K_DA1_p3_1',
      user: process.env.DB_USER || 'cgi_25K_DA1_p3_1',
      password: process.env.DB_PASSWORD || 'smhrd1',
      connectTimeout: 15000,
      waitForConnections: true,
      connectionLimit: 1,
    });

    console.log('📡 연결 시도 중... (최대 15초)');
    const conn = await pool.getConnection();
    console.log('✅ DB 연결 성공!\n');

    // 1. 테이블 목록
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`📋 테이블 목록 (${tables.length}개):`);
    tables.forEach(t => console.log('  -', Object.values(t)[0]));

    // 2. 각 테이블 row 수
    console.log('\n📊 테이블별 데이터 수:');
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      try {
        const [countResult] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
        console.log(`  - ${tableName}: ${countResult[0].cnt}건`);
      } catch (e) {
        console.log(`  - ${tableName}: 조회 오류`);
      }
    }

    conn.release();
    console.log('\n✅ 점검 완료!');
  } catch (err) {
    console.error('\n❌ DB 연결 실패!');
    console.error('에러코드:', err.code);
    console.error('에러메시지:', err.message);
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.error('\n⚠️  서버에 접근할 수 없습니다. 네트워크 또는 방화벽 확인 필요.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️  계정/비밀번호가 틀렸습니다.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n⚠️  DB 이름이 틀렸습니다.');
    }
  } finally {
    if (pool) await pool.end().catch(() => {});
    process.exit(0);
  }
}

checkDB();
