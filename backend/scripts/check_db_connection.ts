import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkConnection() {
  console.log('🔄 DB 접속 테스트 중...');
  console.log(`- Host: ${process.env.DB_HOST}`);
  console.log(`- User: ${process.env.DB_USER}`);
  console.log(`- Port: ${process.env.DB_PORT}`);
  console.log(`- Database: ${process.env.DB_NAME}`);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
    });

    console.log('✅ DB 연결 성공!');
    
    // 간단한 쿼리 테스트 (users 테이블 카운트)
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 현재 사용자 수: ${(rows as any)[0].count}명`);

    await connection.end();
  } catch (error) {
    console.error('❌ DB 연결 실패:', error);
  }
}

checkConnection();
