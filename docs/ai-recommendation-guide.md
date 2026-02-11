# 🎯 AI 광고 최적화 추천 시스템 사용 가이드

## 📋 목차
1. [개요](#개요)
2. [모델 학습 (Google Colab)](#모델-학습)
3. [백엔드 설정](#백엔드-설정)
4. [사용 방법](#사용-방법)
5. [API 명세](#api-명세)
6. [트러블슈팅](#트러블슈팅)

---

## 개요

AI 광고 최적화 추천 시스템은 **사전학습된 머신러닝 모델**을 사용하여 제품 정보만으로 최적의 광고 전략을 제안합니다.

### 주요 기능
- ✅ **ROAS 예측**: XGBoost 기반 광고 성과 예측
- ✅ **플랫폼 추천**: Random Forest 기반 최적 플랫폼 선정
- ✅ **예산 배분**: ROAS 기반 자동 예산 최적화
- ✅ **실행 전략**: 단계별 캠페인 실행 계획 제안

### 아키텍처
```
┌──────────────────┐
│  Google Colab    │ → 모델 사전학습 (1회)
│  10,000개 데이터 │    ↓ .pkl 파일 저장
└──────────────────┘
         ↓
┌──────────────────┐
│ backend/ml_models│ → 학습된 모델 파일
│  *.pkl files     │
└──────────────────┘
         ↓
┌──────────────────┐
│  Backend API     │ → Python 추론 서비스
│  /api/v1/ai      │    (실시간 예측)
└──────────────────┘
         ↓
┌──────────────────┐
│  Frontend UI     │ → 사용자 입력 → AI 추천
│  /ai-recommend   │
└──────────────────┘
```

---

## 모델 학습

### Step 1: Google Colab 노트북 실행

1. **파일 위치**: `ml_training/01_pretrain_models.ipynb`
2. **Google Colab에서 열기**:
   - https://colab.research.google.com/ 접속
   - "파일 업로드" → `01_pretrain_models.ipynb` 업로드

3. **노트북 실행**:
   ```python
   # 모든 셀 실행 (Runtime → Run all)
   # 약 5-10분 소요
   ```

4. **생성되는 파일**:
   - `roas_predictor.pkl` (ROAS 예측 모델)
   - `platform_recommender.pkl` (플랫폼 추천 모델)
   - `scaler.pkl` (Feature 정규화)
   - `scaler_platform.pkl` (플랫폼용 정규화)
   - `label_encoders.pkl` (카테고리 인코더)
   - `feature_columns.pkl` (Feature 메타데이터)
   - `platform_feature_columns.pkl` (플랫폼용 Feature)

### Step 2: 모델 파일 다운로드

노트북 마지막 셀 실행:
```python
# 모든 .pkl 파일을 ZIP으로 압축
!zip -r pretrained_models.zip *.pkl

# 다운로드
from google.colab import files
files.download('pretrained_models.zip')
```

### Step 3: 백엔드에 복사

1. `pretrained_models.zip` 압축 해제
2. 모든 `.pkl` 파일을 다음 경로에 복사:
   ```
   backend/ml_models/
   ├── roas_predictor.pkl
   ├── platform_recommender.pkl
   ├── scaler.pkl
   ├── scaler_platform.pkl
   ├── label_encoders.pkl
   ├── feature_columns.pkl
   └── platform_feature_columns.pkl
   ```

---

## 백엔드 설정

### 필수 라이브러리

이미 설치됨 (확인됨):
- ✅ Python 3.14
- ✅ scikit-learn 1.7.2
- ✅ numpy 2.3.5
- ✅ pandas 2.3.3
- ✅ xgboost (자동 설치됨)

### 환경 변수 (선택)

`.env` 파일에 추가 (선택사항):
```env
# Python 실행 경로 (자동 감지되므로 보통 불필요)
PYTHON_PATH=C:/Users/smhrd/AppData/Local/Programs/Python/Python314/python.exe
```

### 모델 상태 확인

백엔드 서버 시작 후:
```bash
curl http://localhost:3000/api/v1/ai/status
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "model_directory": "..../backend/ml_models",
    "models": {
      "roas_predictor.pkl": true,
      "platform_recommender.pkl": true,
      "scaler.pkl": true,
      "scaler_platform.pkl": true,
      "label_encoders.pkl": true
    },
    "ready": true
  },
  "message": "모든 모델이 준비되었습니다."
}
```

---

## 사용 방법

### 프론트엔드 UI

1. **접속**: http://localhost:3001/ai-recommend (로그인 필요)
2. **입력 폼 작성**:
   - 제품/서비스명: `수제 케이크 배달`
   - 업종: `음식 배달`
   - 지역: `서울`
   - 타겟 연령: `25-34세`
   - 타겟 성별: `전체`
   - 일일 예산: `100,000원`
   - 총 예산: `3,000,000원`
   - 캠페인 기간: `30일`
   - 타겟 규모: `50,000명`

3. **"AI 추천 받기" 버튼 클릭**

4. **결과 확인**:
   - 📊 신뢰도 (높음/중간/낮음)
   - 🎯 추천 플랫폼 (순위별)
   - 💰 플랫폼별 예상 성과 (ROAS, 수익, 비용)
   - ⚡ 추천 예산 배분
   - 📈 연계 플랫폼 전략 (실행 순서)

### API 직접 호출

```bash
# 인증 토큰 필요
curl -X POST http://localhost:3000/api/v1/ai/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "수제 케이크 배달",
    "industry": "food_delivery",
    "region": "seoul",
    "age_group": "25-34",
    "gender": "all",
    "daily_budget": 100000,
    "total_budget": 3000000,
    "campaign_duration": 30,
    "target_audience_size": 50000
  }'
```

---

## API 명세

### POST /api/v1/ai/recommend

AI 기반 광고 최적화 추천

**요청 본문**:
```json
{
  "name": "string (required)",
  "industry": "ecommerce|finance|education|food_delivery|fashion|tech|health|real_estate",
  "region": "seoul|busan|daegu|incheon|gwangju|daejeon|ulsan|others",
  "age_group": "18-24|25-34|35-44|45-54|55+",
  "gender": "male|female|all",
  "daily_budget": "number (default: 100000)",
  "total_budget": "number (default: 3000000)",
  "campaign_duration": "number (default: 30)",
  "target_audience_size": "number (default: 50000)"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "product_name": "수제 케이크 배달",
    "confidence": {
      "level": "low|medium|high",
      "score": 0.3,
      "message": "업계 평균 데이터 기반 추천입니다.",
      "data_source": "industry_benchmark"
    },
    "recommended_platforms": {
      "primary": {
        "platform": "karrot",
        "score": 0.85,
        "reason": "지역 음식점 홍보 최적"
      },
      "alternatives": [...]
    },
    "performance_forecast": {
      "google": {
        "roas": 4.2,
        "estimated_revenue": 12600000,
        "estimated_cost": 3000000,
        "estimated_profit": 9600000,
        "estimated_ctr": 0.035,
        "estimated_cvr": 0.025
      },
      ...
    },
    "budget_allocation": {
      "recommended_allocation": {
        "karrot": {
          "budget": 1500000,
          "percentage": 50.0,
          "expected_return": 6750000
        },
        ...
      },
      "total_budget": 3000000,
      "expected_total_return": 13500000
    },
    "cross_platform_strategy": {
      "primary_strategy": {...},
      "combination": ["karrot", "meta"],
      "combination_rationale": "소셜 미디어와 지역 커뮤니티의 시너지",
      "execution_order": [
        {
          "phase": 1,
          "platform": "karrot",
          "objective": "ROAS 최적화",
          "duration": "1-2주",
          "budget_ratio": 60
        },
        ...
      ]
    },
    "industry_benchmark": {
      "avg_ctr": 0.048,
      "avg_cvr": 0.038,
      "avg_roas": 4.5
    }
  }
}
```

### GET /api/v1/ai/status

모델 파일 상태 확인 (인증 불필요)

**응답**:
```json
{
  "success": true,
  "data": {
    "ready": true,
    "models": {
      "roas_predictor.pkl": true,
      "platform_recommender.pkl": true,
      ...
    }
  }
}
```

---

## 트러블슈팅

### 1. 모델 파일 없음 오류

**증상**:
```json
{
  "success": false,
  "error": "Model files not found"
}
```

**해결**:
1. Google Colab 노트북 실행 확인
2. `.pkl` 파일이 `backend/ml_models/`에 있는지 확인
3. 파일 권한 확인 (읽기 가능)

### 2. Python 실행 오류

**증상**:
```
Python 스크립트 오류: python: command not found
```

**해결**:
1. Python 설치 확인: `python --version`
2. `.env`에 `PYTHON_PATH` 설정
3. `backend/scripts/ai_inference.py` 실행 권한 확인

### 3. 추론 속도 느림

**원인**: 모델 로딩은 첫 요청 시 약 2-3초 소요

**최적화**:
- 모델이 메모리에 캐시되므로 두 번째 요청부터는 빠름 (<500ms)
- 서버 재시작 시 다시 로딩 필요

### 4. 예측 정확도 낮음

**원인**: 합성 데이터로 학습된 Global Model

**개선 방법**:
1. 사용자 캠페인 데이터가 5개 이상 쌓이면 개인화 모델로 전환 (향후)
2. 실제 광고 데이터로 재학습 (Colab 노트북에 데이터 교체)
3. 업종별 모델 분리 학습

---

## 다음 단계

### 단기 (1-2주)
- [ ] 사용자 캠페인 데이터 기반 fine-tuning
- [ ] 신뢰도별 UI 피드백 개선
- [ ] 추천 결과 저장 및 히스토리 기능

### 중기 (1-2개월)
- [ ] 실제 광고 데이터로 재학습
- [ ] 시계열 예측 모델 추가 (LSTM)
- [ ] A/B 테스트 추천 기능

### 장기 (3-6개월)
- [ ] GPT-4 기반 브랜딩 전략 생성
- [ ] 강화학습 기반 예산 자동 조정
- [ ] 실시간 학습 파이프라인

---

## 문의

모델 학습 또는 추론 관련 문제가 있으면:
1. `backend/logs/` 확인
2. `/api/v1/ai/status` 엔드포인트로 모델 상태 확인
3. Colab 노트북 재실행 및 모델 재다운로드

**Happy Recommending! 🎉**
