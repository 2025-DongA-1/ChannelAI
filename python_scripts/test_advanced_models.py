import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, accuracy_score, precision_score, recall_score
import warnings
warnings.filterwarnings('ignore')

# 1. 데이터 로드 및 전처리
print("Loading data...")
csv_path = "channel_ai_db_export_1771812133027.csv"
raw_df = pd.read_csv(csv_path)

# 결측치를 0으로 채움
df = raw_df.fillna(0).copy()

# 요일을 숫자로 변환 (예: 월요일 -> 0)
le_day = LabelEncoder()
df['요일_encoded'] = le_day.fit_transform(df['요일'].astype(str))

# 매체 종류를 숫자로 변환 (예: Naver -> 0, Google -> 1)
le_platform = LabelEncoder()
df['platform_encoded'] = le_platform.fit_transform(df['매체'].astype(str))

# -------------------------------------------------------------
# [모델 1] XGBoost 전환(설치 수) 예측 모델 (Regressor)
# 비용, 노출, 클릭, 요일, 매체 정보를 넣으면 얼마나 "설치"될지 예측
# -------------------------------------------------------------
print("\n--- 1. XGBoost 앱 설치(전환) 예측 모델 학습 ---")
features = ['platform_encoded', '요일_encoded', '노출', '비용', '클릭']
target_roas = '설치' 

X = df[features]
y_reg = df[target_roas]

X_train, X_test, y_train, y_test = train_test_split(X, y_reg, test_size=0.2, random_state=42)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

xgb_model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
xgb_model.fit(X_train_scaled, y_train)

y_pred = xgb_model.predict(X_test_scaled)
mae = mean_absolute_error(y_test, y_pred)
print(f"XGBoost 전체 MAE (실제 설치 수와의 평균 오차): {mae:.2f}건")

print("\n[매체별 오차(MAE)]")
unique_platforms = sorted(X_test['platform_encoded'].unique())
for p_num in unique_platforms:
    idx = X_test['platform_encoded'] == p_num
    if sum(idx) > 0:
        p_name = le_platform.inverse_transform([p_num])[0]
        p_mae = mean_absolute_error(y_test[idx], y_pred[idx])
        print(f" - {p_name}: {p_mae:.2f}건")

# 랜덤 샘플 테스트 시연
if len(X_test) > 0:
    sample_idx = 0
    sample_features = X_test.iloc[sample_idx]
    sample_actual = y_test.iloc[sample_idx]
    sample_pred = y_pred[sample_idx]
    platform_name = le_platform.inverse_transform([int(sample_features['platform_encoded'])])[0]

    print(f"\n[XGBoost 예측 샘플 테스트]")
    print(f"조건: 매체= {platform_name}, 지출 비용= {sample_features['비용']:,.0f}원, 노출= {sample_features['노출']:,.0f}회, 클릭= {sample_features['클릭']:.0f}회")
    print(f"결과: [실제 설치 수 = {sample_actual:,.0f} 단말기] vs [AI 에측 설치 수 = {sample_pred:,.1f} 단말기]")

# -------------------------------------------------------------
# [모델 2] Random Forest 기반 AI 광고 매체 1순위 추천
# -------------------------------------------------------------
# 날짜별로 비용 대비 효율(설치 1건 당 비용이 가장 적은 곳, 즉 1원당 설치가 많은 곳) 매체 찾기
print("\n--- 2. Random Forest 최고 효율 매체 추천 모델 학습 ---")
df['효율점수'] = df['설치'] / (df['비용'] + 1) # +1은 0나누기 방지

# 날짜별 1등 효율 매체 구하기
idx = df.groupby('날짜')['효율점수'].idxmax()
best_daily_df = df.loc[idx]

# 각 날짜의 총 "노출", "클릭", "비용" 환경 상황
daily_agg = df.groupby('날짜').agg({
    '노출': 'sum',
    '비용': 'sum',
    '클릭': 'sum'
}).reset_index()

best_daily_df = best_daily_df[['날짜', '매체']].rename(columns={'매체': 'best_platform'})
rf_data = pd.merge(daily_agg, best_daily_df, on='날짜')

if len(rf_data) > 5:
    X_rf = rf_data[['노출', '비용', '클릭']]
    y_rf = rf_data['best_platform']
    
    X_train_rf, X_test_rf, y_train_rf, y_test_rf = train_test_split(X_rf, y_rf, test_size=0.2, random_state=42)
    
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train_rf, y_train_rf)
    
    y_pred_rf = rf_model.predict(X_test_rf)
    acc = accuracy_score(y_test_rf, y_pred_rf)
    precision = precision_score(y_test_rf, y_pred_rf, average='weighted', zero_division=0)
    recall = recall_score(y_test_rf, y_pred_rf, average='weighted', zero_division=0)
    print(f"Random Forest 플랫폼 추천 전체 정확도 (Accuracy): {acc:.2f}")
    print(f"Random Forest 플랫폼 추천 전체 정밀도 (Precision): {precision:.2f}")
    print(f"Random Forest 플랫폼 추천 전체 재현율 (Recall): {recall:.2f}")

    print("\n[매체별 추천 정밀도 및 재현율]")
    precision_arr = precision_score(y_test_rf, y_pred_rf, average=None, labels=rf_model.classes_, zero_division=0)
    recall_arr = recall_score(y_test_rf, y_pred_rf, average=None, labels=rf_model.classes_, zero_division=0)
    for i, p_class in enumerate(rf_model.classes_):
        print(f" - {p_class}: 정밀도 {precision_arr[i]:.2f}, 재현율 {recall_arr[i]:.2f}")
    
    if len(X_test_rf) > 0:
        sample_rf_idx = 0
        test_case = X_test_rf.iloc[sample_rf_idx].to_frame().T
        pred_best = rf_model.predict(test_case)[0]
        actual_best = y_test_rf.iloc[sample_rf_idx]
        
        print(f"\n[Random Forest 추천 샘플 테스트]")
        print(f"해당 일자의 광고 환경 조건:")
        print(f"총 예상 노출 수: {test_case['노출'].iloc[0]:,.0f}회, 총 예상 비용: {test_case['비용'].iloc[0]:,.0f}원")
        print(f"👉 AI가 추천하는 최적의 매체: {pred_best}")
        print(f"👉 (실제 데이터에서 해당 날짜 효율 1등 매체: {actual_best})")
else:
    print("데이터 건수가 부족하여 Random Forest 모델링을 진행하지 않습니다.")


print("\n-------------------------------------------------------------")
print("[데이터 기반 분석] 매체별 최우수 / 최하위 효율 캠페인 (1원당 설치수 기준)")
print("-------------------------------------------------------------")

raw_df['효율점수'] = raw_df['설치'] / (raw_df['비용'] + 1)
campaign_agg = raw_df.groupby(['매체', '캠페인'])['효율점수'].mean().reset_index()

unique_platforms_raw = campaign_agg['매체'].unique()
for p in unique_platforms_raw:
    p_data = campaign_agg[campaign_agg['매체'] == p].sort_values(by='효율점수', ascending=False)
    if len(p_data) > 0:
        best_camp = p_data.iloc[0]
        worst_camp = p_data.iloc[-1]
        print(f"🔵 {p}")
        print(f"   - 1등 캠페인: {best_camp['캠페인']} (효율점수: {best_camp['효율점수']:.6f})")
        if len(p_data) > 1:
            print(f"   - 꼴등 캠페인: {worst_camp['캠페인']} (효율점수: {worst_camp['효율점수']:.6f})")
        else:
            print(f"   - (등록된 캠페인이 1개뿐입니다)")

