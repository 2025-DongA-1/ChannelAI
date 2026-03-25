import { Router, Request, Response } from 'express';
import pool, { switchToCustomPool, restoreOriginalPool, getActiveDbInfo } from '../config/database';

const router = Router();

// 시간 기반 인증 키 검증 (현재 HHMM 또는 1분 전 HHMM 허용)
const verifyTimeKey = (key: string): boolean => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const h = String(kst.getUTCHours()).padStart(2, '0');
  const m = String(kst.getUTCMinutes()).padStart(2, '0');
  const currentKey = `${h}${m}`;

  const prev = new Date(kst.getTime() - 60 * 1000);
  const ph = String(prev.getUTCHours()).padStart(2, '0');
  const pm = String(prev.getUTCMinutes()).padStart(2, '0');
  const prevKey = `${ph}${pm}`;

  return key === currentKey || key === prevKey;
};

// GET /api/admin/db-status - 현재 DB 상태 확인
router.get('/db-status', async (req: Request, res: Response) => {
  const info = getActiveDbInfo();
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, connected: true, ...info });
  } catch (err: any) {
    res.json({ success: true, connected: false, ...info, error: err.message });
  }
});

// POST /api/admin/switch-db - 로컬 DB로 전환
router.post('/switch-db', async (req: Request, res: Response) => {
  const { host, port, user, password, database, key } = req.body;

  if (!verifyTimeKey(String(key))) {
    return res.status(401).json({ success: false, error: '인증 키가 올바르지 않습니다. 현재 시각(HHMM)을 입력하세요.' });
  }

  if (!host || !user || !database) {
    return res.status(400).json({ success: false, error: 'host, user, database는 필수입니다.' });
  }

  try {
    switchToCustomPool(host, parseInt(port) || 3306, user, password || '', database);
    // 연결 테스트
    await pool.query('SELECT 1');
    res.json({ success: true, message: `로컬 DB (${host}:${port}/${database}) 연결 성공` });
  } catch (err: any) {
    restoreOriginalPool();
    res.status(500).json({ success: false, error: `연결 실패: ${err.message}` });
  }
});

// POST /api/admin/restore-db - 원래 DB로 복원
router.post('/restore-db', async (req: Request, res: Response) => {
  const { key } = req.body;

  if (!verifyTimeKey(String(key))) {
    return res.status(401).json({ success: false, error: '인증 키가 올바르지 않습니다.' });
  }

  restoreOriginalPool();
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: '원격 DB로 복원 성공' });
  } catch (err: any) {
    res.json({ success: true, message: '원격 DB로 복원됨 (연결 확인 실패: DB가 아직 다운 상태일 수 있음)', warning: err.message });
  }
});

export default router;
