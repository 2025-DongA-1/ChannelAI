import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ResultSetHeader } from 'mysql2';

dotenv.config();

// 리모트 DB 풀 (기본, .env 기준)
const remotePool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'ad_mate_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// 로컬 DB 풀
const localPool = mysql.createPool({
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: parseInt(process.env.LOCAL_DB_PORT || '3306'),
  database: process.env.LOCAL_DB_NAME || process.env.DB_NAME || 'ad_mate_db',
  user: process.env.LOCAL_DB_USER || 'root',
  password: process.env.LOCAL_DB_PASSWORD || '1234',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// 현재 DB 모드 (서버 재시작 시 remote로 초기화)
let currentMode: 'remote' | 'local' = 'remote';

export const getDbMode = () => currentMode;
export const setDbMode = (mode: 'remote' | 'local') => {
  currentMode = mode;
  console.log(`[DB] 모드 전환: ${mode.toUpperCase()}`);
};

const getActivePool = () => currentMode === 'local' ? localPool : remotePool;

// 기존 코드와 호환되는 mysqlPool (하위 호환용)
const mysqlPool = remotePool;

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
  // 1. pool.query() 지원 — 현재 활성 풀 사용
  query: async (sql: string, params?: any[]): Promise<QueryResult> => {
    return executeQuery(getActivePool(), sql, params);
  },

  // 2. pool.connect() 지원 — 현재 활성 풀 사용
  connect: async (): Promise<PoolClient> => {
    const connection = await getActivePool().getConnection();
    return {
      query: async (sql: string, params?: any[]): Promise<QueryResult> => {
        return executeQuery(connection, sql, params);
      },
      release: () => connection.release(),
    };
  },

  // 3. 네이티브 풀 접근 (하위 호환)
  originalPool: mysqlPool
};

export default pool;
