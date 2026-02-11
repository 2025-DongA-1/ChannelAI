import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'marketing_platform',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'changeme',
});

// 데이터베이스 연결 테스트
pool.on('connect', () => {
  console.log('✅ PostgreSQL 데이터베이스에 연결되었습니다.');
});

pool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL 연결 오류:', err);
  process.exit(-1);
});

export default pool;
