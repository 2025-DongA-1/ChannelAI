import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import {
  generateCreativePackage,
  saveCreativeGeneration,
  getCreativeHistory,
  getCreativeDetail,
  CreativeInput,
} from '../services/ai/creativeAgentService';

/**
 * POST /api/v1/ai/creative/generate
 * 광고 소재 패키지 생성 (파일 업로드 포함)
 */
export const generateCreative = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { businessType, productName, targetAudience, tone, objective, additionalInfo, campaignId } = req.body;

    if (!businessType || !productName || !targetAudience || !tone || !objective) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: '업종, 상품명, 타겟 고객, 톤앤매너, 광고 목적은 필수입니다.',
      });
    }

    const input: CreativeInput = {
      businessType,
      productName,
      targetAudience,
      tone,
      objective,
      additionalInfo,
      userId: user.id,
      campaignId: campaignId ? Number(campaignId) : undefined,
    };

    // multer가 처리한 파일 경로
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const documentFile = files?.document?.[0];
    const imageFile = files?.image?.[0];

    // 파일 확장자 검증
    if (documentFile) {
      const ext = documentFile.originalname.toLowerCase();
      if (!['.pdf', '.txt', '.md', '.csv'].some(e => ext.endsWith(e))) {
        return res.status(400).json({
          error: 'INVALID_FILE_TYPE',
          message: '문서 파일은 PDF, TXT, MD, CSV만 지원합니다.',
        });
      }
    }
    if (imageFile) {
      const ext = imageFile.originalname.toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(e => ext.endsWith(e))) {
        return res.status(400).json({
          error: 'INVALID_FILE_TYPE',
          message: '이미지 파일은 JPG, PNG, GIF, WEBP만 지원합니다.',
        });
      }
    }

    const result = await generateCreativePackage(
      input,
      documentFile?.path,
      imageFile?.path,
    );

    // DB 저장
    const generationId = await saveCreativeGeneration(
      user.id, input, result,
      !!documentFile, !!imageFile,
    );

    return res.json({
      success: true,
      generationId,
      data: result,
    });
  } catch (error: any) {
    console.error('[Creative Controller] 생성 오류:', error);
    return res.status(500).json({
      error: 'GENERATION_FAILED',
      message: error.message || '소재 생성 중 오류가 발생했습니다.',
    });
  }
};

/**
 * GET /api/v1/ai/creative/history
 * 사용자의 소재 생성 이력 조회
 */
export const getHistory = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const history = await getCreativeHistory(user.id);
    return res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('[Creative Controller] 이력 조회 오류:', error);
    return res.status(500).json({ error: 'HISTORY_FAILED', message: error.message });
  }
};

/**
 * GET /api/v1/ai/creative/:id
 * 특정 소재 생성 결과 상세 조회
 */
export const getDetail = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'INVALID_ID' });

    const detail = await getCreativeDetail(user.id, id);
    if (!detail) return res.status(404).json({ error: 'NOT_FOUND' });

    // JSON 필드 파싱
    if (typeof detail.generated_copies === 'string') {
      detail.generated_copies = JSON.parse(detail.generated_copies);
    }
    if (typeof detail.visual_guide === 'string') {
      detail.visual_guide = JSON.parse(detail.visual_guide);
    }

    return res.json({ success: true, data: detail });
  } catch (error: any) {
    console.error('[Creative Controller] 상세 조회 오류:', error);
    return res.status(500).json({ error: 'DETAIL_FAILED', message: error.message });
  }
};
