import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

csv_path = "d:/최성훈/프로잭트/실전/ChannelAI/ChannelAI/channel_ai_db_export_1771812133027.csv"
print(f"Loading data from {csv_path}...")
raw_df = pd.read_csv(csv_path)

# 날짜별 총 비용, 클릭수 계산 (일별 통합)
df = raw_df.groupby('날짜').agg({
    '비용': 'sum',
    '클릭': 'sum'
}).reset_index()

# 컬럼명 변경 (기존 머신러닝 코드와 호환을 위해)
df = df.rename(columns={'날짜': 'date', '비용': 'cost', '클릭': 'clicks'})

# 날짜 오름차순 정렬
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values('date').reset_index(drop=True)

print("\n--- Data Head ---")
print(df.head())
print("--- Data Tail ---")
print(df.tail())

print("\n--- 2. 선형 회귀 (Linear Regression) 미래 예측 ---")
# 머신러닝을 위해 날짜를 단순 숫자로 차원 변환 (0, 1, 2 ...)
X = np.arange(len(df)).reshape(-1, 1)
y = df['cost'].values

# 선형회귀 모델 학습
model = LinearRegression()
model.fit(X, y)

# 향후 3일 예측 (마지막 인덱스 + 1, + 2, + 3)
last_idx = len(df)
future_X = np.array([[last_idx], [last_idx+1], [last_idx+2]])
future_pred = model.predict(future_X)

print(f"오늘까지의 마지막 비용: {df['cost'].iloc[-1]}")
print(f"내일 예상 비용: {int(future_pred[0])}")

print("\n--- 3. 이상 탐지 (Anomaly Detection) - Z-Score 방식 ---")
mean_cost = df['cost'].mean()
std_cost = df['cost'].std()

df['z_score'] = (df['cost'] - mean_cost) / std_cost
df['anomaly'] = df['z_score'].apply(lambda x: True if abs(x) > 2 else False)

# 이상치 발생한 날만 뽑아보기
anomalies = df[df['anomaly'] == True]
print(f"Z-score 평균: {mean_cost}, 표준편차: {std_cost}")
if not anomalies.empty:
    print("🚨 [경고] 비정상적인 데이터가 감지되었습니다:")
    print(anomalies[['date', 'cost', 'z_score']])
else:
    print("✅ 비정상적인 데이터가 발견되지 않았습니다. (z_score > 2 인 데이터가 없음)")
