import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middlewares/auth';
import { generateCreative, getHistory, getDetail } from '../controllers/creativeAgentController';

const router = Router();

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '../../../uploads/creative');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정 (문서 + 이미지 업로드)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB 제한으로 상향
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  },
});

const uploadFields = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// 소재 패키지 생성 (파일 업로드 포함)
router.post('/generate', authenticate, uploadFields, generateCreative);

// 생성 이력 조회
router.get('/history', authenticate, getHistory);

// 생성 결과 상세 조회
router.get('/:id', authenticate, getDetail);

export default router;
