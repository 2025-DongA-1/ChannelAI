import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  let connection;
  try {
    console.log('🔄 DB 마이그레이션 실행 중 (직접 연결)...');
    
    // Pool 대신 직접 Connection 생성
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'ad_mate_db',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ DB 연결 성공');

    const queries = [
      "ALTER TABLE users ADD COLUMN naver_id VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN kakao_id VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) DEFAULT NULL"
    ];

    for (const query of queries) {
      try {
        await connection.query(query);
        console.log(`✅ 실행 성공: ${query}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️ 이미 존재하는 컬럼입니다: ${query}`);
        } else {
          console.error(`❌ 실행 실패: ${query}`, error);
        }
      }
    }
    
    console.log('✨ 마이그레이션 완료!');
  } catch (error) {
    console.error('❌ 마이그레이션 치명적 오류:', error);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
};

runMigration();
