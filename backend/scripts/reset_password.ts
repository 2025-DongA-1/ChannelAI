
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetPassword() {
  console.log('🔄 비밀번호 초기화 중...');
  const newPasswordHash = '$2b$10$qbHyCMYK.InuAQP8unEXG.T8wzLBttlc9eHyaMIcxDuhqAlF8zCgW'; // '1234'
  const email = 'test@test.com';

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
    });

    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [newPasswordHash, email]
    );

    if ((result as any).affectedRows > 0) {
      console.log(`✅ ${email} 비밀번호 초기화 완료! (새 비번: 1234)`);
    } else {
      console.log(`⚠️ ${email} 사용자를 찾을 수 없습니다. (먼저 회원가입 필요)`);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 비밀번호 초기화 실패:', error);
  }
}

resetPassword();
