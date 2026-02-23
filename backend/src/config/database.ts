import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ResultSetHeader } from 'mysql2';

dotenv.config();

// MySQL 연결 풀 생성
const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'ad_mate_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  waitForConnections: true,
  connectionLimit: 20, // 연결 제한 20개로 증가
  queueLimit: 0,
});

// 기존 코드와의 호환성을 위한 래퍼(Wrapper) 
// (다른 파일들이 pool.query(), pool.connect() 방식을 쓰고 있어서 유지해야 함)

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
    // INSERT, UPDATE 등의 결과 처리
    const header = result as ResultSetHeader;
    return {
      rows: [],
      insertId: header.insertId,
      affectedRows: header.affectedRows,
    };
  }
};

const pool = {
  // 1. pool.query() 지원
  query: async (sql: string, params?: any[]): Promise<QueryResult> => {
    return executeQuery(mysqlPool, sql, params);
  },

  // 2. pool.connect() 지원
  connect: async (): Promise<PoolClient> => {
    const connection = await mysqlPool.getConnection();
    return {
      query: async (sql: string, params?: any[]): Promise<QueryResult> => {
        return executeQuery(connection, sql, params);
      },
      release: () => connection.release(),
    };
  },
  
  // 3. 네이티브 풀 접근이 필요할 경우를 대비해 노출
  originalPool: mysqlPool
};

export default pool;
