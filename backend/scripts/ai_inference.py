#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 추론 스크립트
Node.js에서 호출되어 사전학습된 모델로 추론 수행
"""

import sys
import os
import json
from pathlib import Path
import warnings

# UTF-8 인코딩을 위한 환경 변수 설정
os.environ['PYTHONIOENCODING'] = 'utf-8'

# 모든 경고 억제 (Node.js stderr 혼란 방지)
warnings.filterwarnings('ignore')

# 프로젝트 루트를 Python 경로에 추가
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

from src.services.ml.aiRecommendationService import get_ai_engine


def main():
    try:
        # Node.js로부터 JSON 입력 받기
        if len(sys.argv) < 2:
            print(json.dumps({
                'error': 'No input provided',
                'usage': 'python ai_inference.py <json_payload>'
            }))
            sys.exit(1)
        
        input_json = sys.argv[1]
        product_info = json.loads(input_json)
        
        # AI 엔진 로드
        engine = get_ai_engine()
        
        # 추론 수행
        result = engine.recommend_for_product(product_info)
        
        # JSON 출력 (stdout)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
        
    except FileNotFoundError as e:
        print(json.dumps({
            'error': 'Model files not found',
            'message': str(e),
            'solution': 'Run the Google Colab notebook to train models and copy .pkl files to backend/ml_models/'
        }, ensure_ascii=False))
        sys.exit(1)
        
    except Exception as e:
        print(json.dumps({
            'error': 'Inference failed',
            'message': str(e),
            'type': type(e).__name__
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
