import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ResultSetHeader } from 'mysql2';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

// 오버라이드 설정 파일 (모든 PM2 인스턴스가 공유)
const OVERRIDE_FILE = path.join(os.tmpdir(), 'channelai_db_override.json');

// MySQL 연결 풀 생성
const mysqlPool = mysql.createPool({
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

// 현재 활성 풀
let activePool = mysqlPool;
let activeDbInfo: { host: string; port: number; database: string } = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'ad_mate_db',
};

// 오버라이드 파일 로드 (모든 인스턴스가 공유 파일에서 읽음)
const loadOverrideFile = () => {
  try {
    if (fs.existsSync(OVERRIDE_FILE)) {
      const config = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf-8'));
      activePool = mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000,
      });
      activeDbInfo = { host: config.host, port: config.port, database: config.database };
      console.log(`[DB] 로컬 DB로 전환: ${config.host}:${config.port}/${config.database}`);
    } else {
      activePool = mysqlPool;
      activeDbInfo = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME || 'ad_mate_db',
      };
    }
  } catch (err) {
    console.error('[DB] 오버라이드 파일 로드 실패:', err);
  }
};

// 시작 시 로드 + 파일 변경 감시 (모든 PM2 인스턴스가 자동 동기화)
loadOverrideFile();
fs.watchFile(OVERRIDE_FILE, { interval: 500 }, () => {
  console.log('[DB] 오버라이드 파일 변경 감지, 풀 재구성 중...');
  loadOverrideFile();
});

// 커스텀 DB로 전환 (파일에 저장 → 모든 인스턴스에 전파)
export const switchToCustomPool = (host: string, port: number, user: string, password: string, database: string) => {
  const config = { host, port, user, password, database };
  fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(config), 'utf-8');
  loadOverrideFile(); // 현재 인스턴스 즉시 반영
};

// 원래 원격 DB로 복원 (파일 삭제 → 모든 인스턴스에 전파)
export const restoreOriginalPool = () => {
  try { fs.unlinkSync(OVERRIDE_FILE); } catch {}
  loadOverrideFile(); // 현재 인스턴스 즉시 반영
};

export const getActiveDbInfo = () => ({
  ...activeDbInfo,
  isCustom: activePool !== mysqlPool,
});

// ─────────────────────────────────────────────────────────────
// 기존 코드와의 호환성을 위한 래퍼(Wrapper)
// ─────────────────────────────────────────────────────────────

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
    return executeQuery(activePool, sql, params);
  },

  connect: async (): Promise<PoolClient> => {
    const connection = await activePool.getConnection();
    return {
      query: async (sql: string, params?: any[]): Promise<QueryResult> => {
        return executeQuery(connection, sql, params);
      },
      release: () => connection.release(),
    };
  },

  originalPool: mysqlPool
};

export default pool;
