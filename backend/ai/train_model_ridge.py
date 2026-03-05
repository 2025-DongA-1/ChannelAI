# train_model_ridge.py
# ============================================================
# 목적:
# - 기존 train_model_v2.py는 유지
# - 새로운 실험 파일(train_model_ridge.py)에서:
#   1) XGBoost (주 모델) 학습 + json 저장
#   2) Ridge (베이스라인/보조 모델) 학습 + joblib 저장
#
# 산출물(backend/ai 폴더):
# - optimal_budget_xgb_model_ridge.json      (XGB: 배포 안정성 좋음)
# - baseline_ridge_model.joblib             (Ridge: scaler 포함 pipeline)
#
# ※ predict_budget.py가 기본적으로 optimal_budget_xgb_model.json을 로드하고 있다면,
#   아래 json 파일명을 동일하게 맞추거나(predict 변경 최소),
#   predict_budget.py에서 로드 파일명을 바꿔줘야 함.
# ============================================================

import os
import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# ✅ Ridge baseline(정규화 선형 회귀) 관련
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import RidgeCV

# ✅ pipeline 저장
import joblib


# ============================================================
# 1) (MVP용) 학습 데이터 생성 함수
# ------------------------------------------------------------
# 지금은 실제 DB에서 학습하는 대신, 현실적인 형태의 데이터를 생성해 학습.
# 향후 DB 학습으로 갈 경우 이 부분을 DB 로딩 로직으로 교체.
# ============================================================
def generate_realistic_data(n_samples: int = 5000) -> pd.DataFrame:
    print("⚡ [train_model_ridge] 현실적인(가상) 학습 데이터를 생성 중...")
    np.random.seed(42)
    data = []

    # 채널별 기본 효율(평균 성능)
    base_roas_map = {
        "naver": 3.5,
        "meta": 2.2,
        "google": 2.8,
        "karrot": 3.0
    }

    for _ in range(n_samples):
        channel = np.random.choice(list(base_roas_map.keys()))

        # 예산(비용): 1만원 ~ 200만원
        cost = np.random.randint(10_000, 2_000_000)

        # 트렌드 점수: 30 ~ 100
        trend_score = np.random.randint(30, 100)

        # 수확 체감(예산이 커질수록 효율이 떨어지는 느낌)
        penalty_factor = np.log10(cost / 10_000.0) * 0.5

        # 트렌드 영향(50점 기준)
        trend_impact = (trend_score - 50) * 0.05

        # "진짜 성능" 값(노이즈 없는 근본 값)
        base_roas = base_roas_map[channel]
        true_value = max(0.5, base_roas - penalty_factor + trend_impact)

        # 과거 힌트(입력)와 미래 정답(타겟)을 분리해서 노이즈를 다르게 줌
        past_noise = np.random.normal(0, 0.3)
        future_noise = np.random.normal(0, 0.3)

        past_roas = np.clip(true_value + past_noise, 0.5, 8.0)
        target_roas = np.clip(true_value + future_noise, 0.5, 8.0)

        # feature: predict_budget.py의 model_columns와 이름/구성이 같아야 함
        row = {
            "비용": cost,
            "CPC": np.random.randint(300, 1500),
            "CTR": 1.0 + (past_roas * 0.2),
            "ROAS_3d_trend": past_roas * 100,  # 입력(과거)
            "trend_score": trend_score,

            # 채널 원핫
            "channel_naver": 1 if channel == "naver" else 0,
            "channel_meta": 1 if channel == "meta" else 0,
            "channel_google": 1 if channel == "google" else 0,
            "channel_karrot": 1 if channel == "karrot" else 0,

            # 타겟(미래 ROAS)
            "Target_ROAS": target_roas * 100
        }
        data.append(row)

    return pd.DataFrame(data)


# ============================================================
# 2) 메인: XGB + Ridge 학습/평가/저장
# ============================================================
if __name__ == "__main__":
    # --------------------------
    # (1) 데이터 준비
    # --------------------------
    df = generate_realistic_data(n_samples=5000)

    X = df.drop(["Target_ROAS"], axis=1)
    y = df["Target_ROAS"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("\n🧠 [train_model_ridge] 모델 학습 시작 (XGB + Ridge baseline)\n")

    # ========================================================
    # (2) XGBoost 학습 (주 모델)
    # ========================================================
    xgb_model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        random_state=42
    )
    xgb_model.fit(X_train, y_train)

    # 평가
    xgb_train_pred = xgb_model.predict(X_train)
    xgb_test_pred = xgb_model.predict(X_test)

    xgb_train_rmse = np.sqrt(mean_squared_error(y_train, xgb_train_pred))
    xgb_train_r2 = r2_score(y_train, xgb_train_pred)
    xgb_test_rmse = np.sqrt(mean_squared_error(y_test, xgb_test_pred))
    xgb_test_r2 = r2_score(y_test, xgb_test_pred)

    print("=" * 55)
    print("📊 XGBoost 성능")
    print("=" * 55)
    print(f"✅ Train R2 : {xgb_train_r2:.4f} | RMSE: {xgb_train_rmse:.2f}%p")
    print(f"✅ Test  R2 : {xgb_test_r2:.4f} | RMSE: {xgb_test_rmse:.2f}%p")

    # ========================================================
    # (3) Ridge Baseline 학습 (보조 모델)
    # --------------------------------------------------------
    # - StandardScaler: 스케일 차이 보정
    # - RidgeCV: alpha(규제 강도)를 교차검증으로 자동 선택
    # ========================================================
    ridge_pipeline = Pipeline(steps=[
        ("scaler", StandardScaler()),
        ("ridge", RidgeCV(alphas=[0.1, 1.0, 10.0, 50.0, 100.0], cv=5))
    ])
    ridge_pipeline.fit(X_train, y_train)

    ridge_train_pred = ridge_pipeline.predict(X_train)
    ridge_test_pred = ridge_pipeline.predict(X_test)

    ridge_train_rmse = np.sqrt(mean_squared_error(y_train, ridge_train_pred))
    ridge_train_r2 = r2_score(y_train, ridge_train_pred)
    ridge_test_rmse = np.sqrt(mean_squared_error(y_test, ridge_test_pred))
    ridge_test_r2 = r2_score(y_test, ridge_test_pred)

    best_alpha = float(ridge_pipeline.named_steps["ridge"].alpha_)

    print("-" * 55)
    print("📊 Ridge Baseline 성능")
    print("-" * 55)
    print(f"✅ Selected alpha: {best_alpha}")
    print(f"✅ Train R2 : {ridge_train_r2:.4f} | RMSE: {ridge_train_rmse:.2f}%p")
    print(f"✅ Test  R2 : {ridge_test_r2:.4f} | RMSE: {ridge_test_rmse:.2f}%p")
    print("=" * 55 + "\n")

    # --------------------------
    # (4) 저장
    # --------------------------
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # ✅ 선택 1) 기존 predict_budget.py가 'optimal_budget_xgb_model.json'을 로드한다면
    #          파일명을 그대로 유지하는 게 변경 최소.
    xgb_path = os.path.join(current_dir, "optimal_budget_xgb_model.json")
    xgb_model.save_model(xgb_path)
    print(f"✅ XGB 모델 저장 완료: {xgb_path}")

    # ✅ Ridge 저장 (predict_budget.py에서 joblib.load로 사용)
    ridge_path = os.path.join(current_dir, "baseline_ridge_model.joblib")
    joblib.dump(ridge_pipeline, ridge_path)
    print(f"✅ Ridge 모델 저장 완료: {ridge_path}")

    # --------------------------
    # (5) 운영 안내
    # --------------------------
    print("\n📝 운영 안내")
    print("- 두 파일을 backend/ai 폴더에 같이 둔 뒤 predict_budget.py를 실행하세요.")
    print("- predict_budget.py에서 USE_ENSEMBLE=True면 XGB+Ridge 앙상블을 사용합니다.")
    print("- XGB가 실패하면 Ridge로 폴백할 수 있습니다.\n")