import { Router } from 'express';
import {
  getAllMetrics,
  updateMetric,
  deleteMetric,
  deleteBulkMetrics,
} from '../controllers/metricController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 메트릭 데이터 CRUD (확인, 편집, 삭제)
router.post('/bulk-delete', deleteBulkMetrics);
router.get('/', getAllMetrics);
router.put('/:id', updateMetric);
router.delete('/:id', deleteMetric);

export default router;
