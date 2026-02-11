import { Router } from 'express';
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/accountController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 마케팅 계정 CRUD
router.get('/', getAccounts);
router.get('/:id', getAccountById);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
