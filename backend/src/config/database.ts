import mysql from 'mysql2/promise';
import { ResultSetHeader } from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

// MySQL 연결 풀 생성
const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'project-db-cgi.smhrd.com',
  port: parseInt(process.env.DB_PORT || '3307'),
  database: process.env.DB_NAME || 'cgi_25K_DA1_p3_1',
  user: process.env.DB_USER || 'cgi_25K_DA1_p3_1',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 호환 인터페이스 (컨트롤러 코드 최소 변경)
interface QueryResult {
  rows: any[];
  insertId?: number;
  affectedRows?: number;
}

interface PoolClient {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  release(): void;
}

const executeQuery = async (
  executor: { query: Function },
  sql: string,
  params?: any[]
): Promise<QueryResult> => {
  const [result] = await executor.query(sql, params);
  if (Array.isArray(result)) {
    return { rows: result as any[] };
  } else {
    const header = result as ResultSetHeader;
    return {
      rows: [],
      insertId: header.insertId,
      affectedRows: header.affectedRows,
    };
  }
};

const pool = {
  query: async (sql: string, params?: any[]): Promise<QueryResult> => {
    return executeQuery(mysqlPool, sql, params);
  },

  connect: async (): Promise<PoolClient> => {
    const connection = await mysqlPool.getConnection();
    return {
      query: async (sql: string, params?: any[]): Promise<QueryResult> => {
        return executeQuery(connection, sql, params);
      },
      release: () => connection.release(),
    };
  },
};

// 데이터베이스 연결 테스트
(async () => {
  try {
    await mysqlPool.query('SELECT 1');
    console.log('✅ MySQL 데이터베이스에 연결되었습니다.');
  } catch (err) {
    console.error('❌ MySQL 연결 오류:', err);
  }
})();

export default pool;
