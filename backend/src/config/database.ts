import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ResultSetHeader } from 'mysql2';

dotenv.config();

// 원본 리모트 DB 풀 (항상 유지)
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

// 임시 커스텀 풀 (ngrok 등 임시 DB용, null이면 remotePool 사용)
let customPool: mysql.Pool | null = null;
let customConfig: { host: string; port: number; database: string; user: string } | null = null;

export const getDbStatus = () => ({
  mode: customPool ? 'custom' : 'remote',
  config: customConfig,
});

export const switchToCustomDb = async (config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}) => {
  // 기존 커스텀 풀 종료
  if (customPool) {
    await customPool.end().catch(() => {});
    customPool = null;
  }
  const newPool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10000,
  });
  // 연결 테스트
  const conn = await newPool.getConnection();
  conn.release();
  customPool = newPool;
  customConfig = { host: config.host, port: config.port, database: config.database, user: config.user };
};

export const switchToRemoteDb = async () => {
  if (customPool) {
    await customPool.end().catch(() => {});
    customPool = null;
    customConfig = null;
  }
};

const getActivePool = () => customPool ?? remotePool;

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
    return executeQuery(getActivePool(), sql, params);
  },

  connect: async (): Promise<PoolClient> => {
    const connection = await getActivePool().getConnection();
    return {
      query: async (sql: string, params?: any[]): Promise<QueryResult> => {
        return executeQuery(connection, sql, params);
      },
      release: () => connection.release(),
    };
  },

  originalPool: remotePool,
};

export default pool;
