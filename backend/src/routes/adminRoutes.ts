import { Router, Request, Response } from 'express';
import { getDbStatus, switchToCustomDb, switchToRemoteDb } from '../config/database';

const router = Router();

// GET /api/admin/db-status
router.get('/db-status', (req: Request, res: Response) => {
  res.json(getDbStatus());
});

// POST /api/admin/db-switch/custom — 커스텀(ngrok) DB로 전환
router.post('/db-switch/custom', async (req: Request, res: Response) => {
  const { host, port, database, user, password } = req.body;
  if (!host || !port || !database || !user) {
    res.status(400).json({ error: 'host, port, database, user 는 필수입니다.' });
    return;
  }
  try {
    await switchToCustomDb({ host, port: Number(port), database, user, password: password || '' });
    res.json({ success: true, message: `${host}:${port} 연결 성공` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `연결 실패: ${err.message}` });
  }
});

// POST /api/admin/db-switch/remote — 원래 DB로 복귀
router.post('/db-switch/remote', async (req: Request, res: Response) => {
  try {
    await switchToRemoteDb();
    res.json({ success: true, message: '원래 DB로 복귀했습니다.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
