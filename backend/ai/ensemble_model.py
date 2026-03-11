# ensemble_model.py
# ============================================================
# 목적: 
# - 기획서에 명시된 "L2 Ridge(80%) + XGBoost(20%) 하이브리드 가중 평균 앙상블" 모델 학습
# - 데이터 전처리(StandardScaler)와 앙상블 모델을 모두 joblib으로 저장
#
# 산출물(backend/ai 폴더):
# - ensemble_roas_model.pkl (8:2 앙상블 모델)
# - roas_scaler.pkl (데이터 스케일러)
# ============================================================

import os
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.linear_model import Ridge
from sklearn.ensemble import VotingRegressor
from sklearn.preprocessing import StandardScaler

# ============================================================
# 1) 학습 데이터 생성 함수 (기존 로직 유지, ROAS_3d_trend 제거됨)
# ============================================================
def generate_realistic_data(n_samples: int = 5000) -> pd.DataFrame:
    print("⚡ [ensemble_model] 현실적인(가상) 학습 데이터를 생성 중...")
    np.random.seed(42)
    data = []
    base_roas_map = {"naver": 3.5, "meta": 2.2, "google": 2.8, "karrot": 3.0}

    for _ in range(n_samples):
        channel = np.random.choice(list(base_roas_map.keys()))
        cost = np.random.randint(10_000, 2_000_000)
        trend_score = np.random.randint(30, 100)
        penalty_factor = np.log10(cost / 10_000.0) * 0.5
        trend_impact = (trend_score - 50) * 0.05
        
        base_roas = base_roas_map[channel]
        true_value = max(0.5, base_roas - penalty_factor + trend_impact)
        
        future_noise = np.random.normal(0, 0.3)
        target_roas = np.clip(true_value + future_noise, 0.5, 8.0)

        # 🚨 주의: predict_budget.py에서 받는 입력값과 순서/이름이 완벽히 일치해야 함!
        row = {
            "비용": cost,
            "CPC": np.random.randint(300, 1500),
            "CTR": np.clip(1.0 + (true_value * 0.3) + np.random.normal(0, 0.3), 0.5, 5.0), # 수정됨
            "trend_score": trend_score,
            "channel_naver": 1 if channel == "naver" else 0,
            "channel_meta": 1 if channel == "meta" else 0,
            "channel_google": 1 if channel == "google" else 0,
            "channel_karrot": 1 if channel == "karrot" else 0,
            "Target_ROAS": target_roas * 100
        }
        data.append(row)
    return pd.DataFrame(data)

# ============================================================
# 2) 메인: 8:2 앙상블 학습 및 저장
# ============================================================
if __name__ == "__main__":
    df = generate_realistic_data(n_samples=5000)
    X = df.drop(["Target_ROAS"], axis=1)
    y = df["Target_ROAS"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("\n🧠 [ensemble_model] 모델 학습 시작 (L2 Ridge 80% + XGBoost 20%)\n")

    # 1. 필수! 스케일러 적용 (Ridge 모델 성능을 위해)
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train), columns=X.columns)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=X.columns)

    # 2. 기반 모델 정의
    ridge = Ridge(alpha=0.1, random_state=42)
    xgboost = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)

    # 3. 앙상블 모델 정의 (기획서대로 8:2 가중치 부여)
    ensemble = VotingRegressor(estimators=[('ridge', ridge), ('xgb', xgboost)], weights=[0.8, 0.2])
    
    # 4. 앙상블 모델 학습
    ensemble.fit(X_train_scaled, y_train)

    # 5. 성능 평가
    ens_train_pred = ensemble.predict(X_train_scaled)
    ens_test_pred = ensemble.predict(X_test_scaled)
    
    ens_train_rmse = np.sqrt(mean_squared_error(y_train, ens_train_pred))
    ens_test_rmse = np.sqrt(mean_squared_error(y_test, ens_test_pred))
    
    print("=" * 55)
    print("📊 8:2 앙상블(Voting Regressor) 성능")
    print("=" * 55)
    print(f"✅ Train RMSE: {ens_train_rmse:.2f}%p")
    print(f"✅ Test  RMSE: {ens_test_rmse:.2f}%p")
    print("=" * 55 + "\n")

    # 6. 저장 로직 (모델과 스케일러 모두 저장)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    ensemble_path = os.path.join(current_dir, "ensemble_roas_model.pkl")
    scaler_path = os.path.join(current_dir, "roas_scaler.pkl")

    joblib.dump(ensemble, ensemble_path)
    joblib.dump(scaler, scaler_path)

    print(f"✅ 앙상블 모델 저장 완료: {ensemble_path}")
    print(f"✅ 데이터 스케일러 저장 완료: {scaler_path}")
    print("\n📝 운영 안내")
    print("- 이제 백엔드의 predict_budget.py에서 이 두 개의 .pkl 파일을 불러와 사용하십시오.")