import { Router, Request, Response } from 'express';
import { getDbMode, setDbMode } from '../config/database';
import pool from '../config/database';

const router = Router();

// GET /api/admin/db-status — 현재 DB 모드 조회
router.get('/db-status', async (req: Request, res: Response) => {
  const mode = getDbMode();
  try {
    await pool.query('SELECT 1');
    res.json({ mode, connected: true });
  } catch {
    res.json({ mode, connected: false });
  }
});

// POST /api/admin/db-switch — DB 모드 전환
router.post('/db-switch', async (req: Request, res: Response) => {
  const { mode } = req.body as { mode: 'remote' | 'local' };
  if (mode !== 'remote' && mode !== 'local') {
    res.status(400).json({ error: 'mode는 remote 또는 local이어야 합니다.' });
    return;
  }
  setDbMode(mode);
  try {
    await pool.query('SELECT 1');
    res.json({ mode, connected: true, message: `DB를 ${mode.toUpperCase()}로 전환했습니다.` });
  } catch (err: any) {
    res.status(500).json({ mode, connected: false, error: `연결 실패: ${err.message}` });
  }
});

export default router;
