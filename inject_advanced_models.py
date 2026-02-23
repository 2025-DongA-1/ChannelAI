import nbformat as nbf
try:
    with open('ai_experiments.ipynb', 'r', encoding='utf-8') as f:
        nb = nbf.read(f, as_version=4)

    text_xg = "## 4. XGBoost 기반 앱 설치(전환) 예측 모델\n비용, 노출, 클릭 정보 및 매체 정보를 입력하면 발생할 **설치 수**를 예측하는 고급 모델입니다."
    code_xg = """\
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

# 결측치를 0으로 채움
df_ml = raw_df.fillna(0).copy()

# 요일 및 매체 종류를 기계가 인식할 수 있는 숫자로 변환 (Label Encoding)
le_day = LabelEncoder()
df_ml['요일_encoded'] = le_day.fit_transform(df_ml['요일'].astype(str))

le_platform = LabelEncoder()
df_ml['platform_encoded'] = le_platform.fit_transform(df_ml['매체'].astype(str))

# [모델 학습] 
features = ['platform_encoded', '요일_encoded', '노출', '비용', '클릭']
target = '설치' 

X = df_ml[features]
y_reg = df_ml[target]

# 데이터를 학습용 80%, 테스트용 20%로 나눔
X_train, X_test, y_train, y_test = train_test_split(X, y_reg, test_size=0.2, random_state=42)

# 데이터 스케일링 (값의 범위 표준화)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# XGBoost 회귀 모델 (Regressor)
xgb_model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
xgb_model.fit(X_train_scaled, y_train)

# 정확도 평가
y_pred = xgb_model.predict(X_test_scaled)
mae = mean_absolute_error(y_test, y_pred)
print(f"✅ XGBoost 모델 학습 완료!")
print(f"📊 평균 오차(MAE): 약 {mae:.2f} 건")

# 샘플 데이터에 대한 AI 예측 결과 확인
if len(X_test) > 0:
    sample_idx = 0
    sample_features = X_test.iloc[sample_idx]
    platform_name = le_platform.inverse_transform([int(sample_features['platform_encoded'])])[0]

    print(f"\\n[💡 샘플 예측 시뮬레이션]")
    print(f"입력: 매체= {platform_name}, 지출 비용= {sample_features['비용']:,.0f}원, 노출= {sample_features['노출']:,.0f}회, 클릭= {sample_features['클릭']:.0f}회")
    print(f"👉 예측 설치 수: {y_pred[sample_idx]:.1f} 개 (실제 데이터: {y_test.iloc[sample_idx]:.0f} 개)")
"""

    text_rf = "## 5. Random Forest 기반 최고 효율 매체 추천 모델\n여러 매체 중 동일한 조건(일일 총 예산, 총 노출수 등)이 주어졌을 때 **어떤 매체가 가장 성과(비용 대비 설치수)가 좋을지 1순위를 추천**합니다."
    
    code_rf = """\
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# 1. 일자별로 효율(비용 대비 설치 수)이 가장 좋았던 1등 매체 도출
df_ml['효율점수'] = df_ml['설치'] / (df_ml['비용'] + 1) # 0으로 나누는 것 방지
best_idx = df_ml.groupby('날짜')['효율점수'].idxmax()
best_daily_df = df_ml.loc[best_idx]

# 2. 해당 날짜 전체의 광고 환경 요약(총 노출, 총 비용, 총 클릭)
daily_agg = df_ml.groupby('날짜').agg({
    '노출': 'sum',
    '비용': 'sum',
    '클릭': 'sum'
}).reset_index()

best_daily_df = best_daily_df[['날짜', '매체']].rename(columns={'매체': 'best_platform'})
rf_data = pd.merge(daily_agg, best_daily_df, on='날짜')

if len(rf_data) > 5: # 학습을 하려면 최소한의 일자 데이터가 필요함
    X_rf = rf_data[['노출', '비용', '클릭']]
    y_rf = rf_data['best_platform']
    
    X_train_rf, X_test_rf, y_train_rf, y_test_rf = train_test_split(X_rf, y_rf, test_size=0.2, random_state=42)
    
    # 3. Random Forest 분류 모델 (Classifier)
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train_rf, y_train_rf)
    
    # 정확도 평가
    y_pred_rf = rf_model.predict(X_test_rf)
    acc = accuracy_score(y_test_rf, y_pred_rf)
    
    print(f"✅ Random Forest 매체 추천 모델 학습 완료!")
    print(f"📊 모델 정확도: {acc:.2f}")
    
    if len(X_test_rf) > 0:
        sample_rf_idx = 0
        test_case = X_test_rf.iloc[sample_rf_idx].to_frame().T
        pred_best = rf_model.predict(test_case)[0]
        actual_best = y_test_rf.iloc[sample_rf_idx]
        
        print(f"\\n[💡 최적 매체 추천 시뮬레이션]")
        print(f"입력: 오늘의 예상 총 노출 수 '{test_case['노출'].iloc[0]:,.0f}회', 총 광고 예산 '{test_case['비용'].iloc[0]:,.0f}원'")
        print(f"👉 AI 추천 집중 매체: **{pred_best}**")
        print(f"   (참고: 실제 과거 데이터에서 위의 상황일 때 가장 효율 높았던 매체는 '{actual_best}')")
else:
    print("가져온 CSV 데이터의 일자 수가 학습을 하기에는 조금 부족합니다. 데이터가 더 누적되면 정확한 결과를 얻을 수 있습니다!")
    display(rf_data)
"""

    nb.cells.extend([
        nbf.v4.new_markdown_cell(text_xg),
        nbf.v4.new_code_cell(code_xg),
        nbf.v4.new_markdown_cell(text_rf),
        nbf.v4.new_code_cell(code_rf)
    ])

    with open('ai_experiments.ipynb', 'w', encoding='utf-8') as f:
        nbf.write(nb, f)
        
    print("SUCCESS")
except Exception as e:
    print(e)
