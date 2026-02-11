# 로컬 Python 환경에서 모델 학습 스크립트
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
import pickle
from pathlib import Path

print("Starting model training with local Python environment...")
print(f"Setting random seed...")
np.random.seed(42)

# 데이터 생성
n_samples = 10000
industries = ['ecommerce', 'finance', 'education', 'food_delivery', 'fashion', 'tech', 'health', 'real_estate']
platforms = ['google', 'meta', 'naver', 'karrot']
regions = ['seoul', 'busan', 'daegu', 'incheon', 'gwangju', 'daejeon', 'ulsan', 'others']
age_groups = ['18-24', '25-34', '35-44', '45-54', '55+']
genders = ['male', 'female', 'all']

data = {
    'industry': np.random.choice(industries, n_samples),
    'platform': np.random.choice(platforms, n_samples),
    'region': np.random.choice(regions, n_samples),
    'age_group': np.random.choice(age_groups, n_samples),
    'gender': np.random.choice(genders, n_samples),
    'daily_budget': np.random.uniform(10000, 500000, n_samples),
    'total_budget': np.random.uniform(300000, 10000000, n_samples),
    'campaign_duration': np.random.randint(7, 90, n_samples),
    'target_audience_size': np.random.randint(1000, 1000000, n_samples),
}

df = pd.DataFrame(data)
print(f"Generated {len(df)} synthetic campaigns")

# 플랫폼별 성과 특성
platform_characteristics = {
    'google': {'base_ctr': 0.035, 'base_cvr': 0.025, 'base_roas': 4.2},
    'meta': {'base_ctr': 0.042, 'base_cvr': 0.032, 'base_roas': 4.8},
    'naver': {'base_ctr': 0.038, 'base_cvr': 0.028, 'base_roas': 4.5},
    'karrot': {'base_ctr': 0.055, 'base_cvr': 0.045, 'base_roas': 3.8}
}

industry_multipliers = {
    'ecommerce': 1.2, 'finance': 0.9, 'education': 1.1, 'food_delivery': 1.3,
    'fashion': 1.15, 'tech': 0.95, 'health': 1.0, 'real_estate': 0.85
}

# ROAS 계산
df['ctr'] = df.apply(lambda row: 
    platform_characteristics[row['platform']]['base_ctr'] * 
    industry_multipliers[row['industry']] * 
    np.random.uniform(0.7, 1.3), axis=1)

budget_efficiency = 1 - (df['daily_budget'] / 500000) * 0.3

df['roas'] = df.apply(lambda row: 
    platform_characteristics[row['platform']]['base_roas'] * 
    industry_multipliers[row['industry']] * 
    budget_efficiency.loc[row.name] *
    np.random.uniform(0.5, 1.5), axis=1)

df['roas'] = df['roas'].clip(lower=0.5)

print("Calculated performance metrics")

# Feature Engineering
label_encoders = {}
categorical_cols = ['industry', 'platform', 'region', 'age_group', 'gender']

for col in categorical_cols:
    le = LabelEncoder()
    df[f'{col}_encoded'] = le.fit_transform(df[col])
    label_encoders[col] = le

feature_columns = [
    'industry_encoded', 'platform_encoded', 'region_encoded', 
    'age_group_encoded', 'gender_encoded',
    'daily_budget', 'total_budget', 'campaign_duration', 'target_audience_size'
]

X = df[feature_columns]
y_roas = df['roas']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("Feature engineering complete")

# ROAS 모델 학습
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y_roas, test_size=0.2, random_state=42
)

print("Training XGBoost ROAS predictor...")
roas_model = xgb.XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    min_child_weight=3,
    subsample=0.8,
    colsample_bytree=0.8,
    objective='reg:squarederror',
    random_state=42,
    n_jobs=-1
)

roas_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
print("✅ ROAS model trained")

# 플랫폼 추천 모델
best_platform_rules = {
    'food_delivery': 'karrot', 'real_estate': 'karrot',
    'ecommerce': 'meta', 'fashion': 'meta',
    'finance': 'google', 'tech': 'google',
    'education': 'naver', 'health': 'naver'
}

df['best_platform'] = df['industry'].map(best_platform_rules)

platform_feature_cols = [
    'industry_encoded', 'region_encoded', 
    'age_group_encoded', 'gender_encoded',
    'daily_budget', 'total_budget', 'campaign_duration', 'target_audience_size'
]

X_platform = df[platform_feature_cols]
y_best_platform = df['best_platform']

scaler_platform = StandardScaler()
X_platform_scaled = scaler_platform.fit_transform(X_platform)

X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(
    X_platform_scaled, y_best_platform, test_size=0.2, random_state=42
)

print("Training RandomForest platform recommender...")
platform_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

platform_model.fit(X_train_p, y_train_p)
print("✅ Platform model trained")

# 모델 저장
save_dir = Path(r"C:\Users\smhrd\Desktop\channel AI\backend\ml_models")
save_dir.mkdir(parents=True, exist_ok=True)

models_to_save = {
    'roas_predictor.pkl': roas_model,
    'platform_recommender.pkl': platform_model,
    'scaler.pkl': scaler,
    'scaler_platform.pkl': scaler_platform,
    'label_encoders.pkl': label_encoders,
    'feature_columns.pkl': feature_columns,
    'platform_feature_columns.pkl': platform_feature_cols
}

print("\nSaving models...")
for filename, obj in models_to_save.items():
    filepath = save_dir / filename
    with open(filepath, 'wb') as f:
        pickle.dump(obj, f)
    print(f"  ✅ {filename}")

print(f"\n🎉 All models saved to: {save_dir}")

# 버전 확인
import sklearn
print(f"\n📌 Trained with sklearn: {sklearn.__version__}")
