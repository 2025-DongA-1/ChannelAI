import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';

/**
 * AI 추천 컨트롤러
 * Python ML 서비스를 호출하여 추천 결과 반환
 */

export const getAIRecommendation = async (req: Request, res: Response) => {
  try {
    const productInfo = req.body;

    // 필수 필드 검증
    const requiredFields = ['name', 'industry'];
    for (const field of requiredFields) {
      if (!productInfo[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`,
        });
      }
    }

    // 기본값 설정
    const payload = {
      name: productInfo.name,
      industry: productInfo.industry || 'ecommerce',
      region: productInfo.region || 'seoul',
      age_group: productInfo.age_group || '25-34',
      gender: productInfo.gender || 'all',
      daily_budget: productInfo.daily_budget || 100000,
      total_budget: productInfo.total_budget || 3000000,
      campaign_duration: productInfo.campaign_duration || 30,
      target_audience_size: productInfo.target_audience_size || 50000,
    };

    // Python 스크립트 실행
    const pythonScriptPath = path.join(__dirname, '../../scripts/ai_inference.py');
    const pythonPath = process.env.PYTHON_PATH || path.join(__dirname, '../../../.venv/Scripts/python.exe');

    const pythonProcess = spawn(pythonPath, [
      pythonScriptPath,
      JSON.stringify(payload),
    ], {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONLEGACYWINDOWSSTDIO: 'utf-8'
      }
    });

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('=== Python Script Error ===');
        console.error('Exit code:', code);
        console.error('stderr:', errorString);
        console.error('stdout:', dataString);
        console.error('==========================');
        return res.status(500).json({
          success: false,
          error: 'AI 추론 실패',
          details: errorString || 'Python script exited with non-zero code',
          stdout: dataString,
        });
      }

      try {
        const result = JSON.parse(dataString);
        return res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('JSON 파싱 오류:', error);
        console.error('Received data:', dataString);
        return res.status(500).json({
          success: false,
          error: 'AI 추론 결과 파싱 실패',
        });
      }
    });
  } catch (error: any) {
    console.error('AI 추천 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
};

/**
 * 모델 상태 확인
 */
export const checkModelStatus = async (req: Request, res: Response) => {
  try {
    const modelDir = path.join(__dirname, '../../../ml_models');
    const fs = require('fs');

    const requiredFiles = [
      'roas_predictor.pkl',
      'platform_recommender.pkl',
      'scaler.pkl',
      'scaler_platform.pkl',
      'label_encoders.pkl',
    ];

    const status: any = {
      model_directory: modelDir,
      models: {},
    };

    let allPresent = true;

    for (const file of requiredFiles) {
      const filepath = path.join(modelDir, file);
      const exists = fs.existsSync(filepath);
      status.models[file] = exists;
      if (!exists) allPresent = false;
    }

    status.ready = allPresent;

    if (allPresent) {
      return res.json({
        success: true,
        data: status,
        message: '모든 모델이 준비되었습니다.',
      });
    } else {
      return res.status(503).json({
        success: false,
        data: status,
        message: '일부 모델 파일이 없습니다. Google Colab에서 학습한 .pkl 파일을 ml_models/ 폴더에 복사하세요.',
      });
    }
  } catch (error: any) {
    console.error('모델 상태 확인 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
};
