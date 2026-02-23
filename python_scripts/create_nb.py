import nbformat as nbf

nb = nbf.v4.new_notebook()

text = """\
# 🎯 AI 광고 최적화 모델 사전학습 및 테스트

이 노트북에서는 지정된 실제 CSV 데이터를 로드하여 다음과 같은 3가지 테스트를 진행합니다.
1. **데이터 전처리 및 병합**: 날짜별 비용, 클릭 통합
2. **선형 회귀 (Linear Regression)**: 비용 소진 패턴을 학습해 내일의 광고비를 예측합니다.
3. **이상 탐지 (Anomaly Detection)**: Z-score 방식을 사용해 비정상적인 비용 지출이 발생한 날짜를 찾아냅니다.
"""

code_1 = """\
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

# 한글 폰트 설정 (윈도우 환경: 맑은 고딕)
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

# 1. 다운로드 받은 실제 CSV 데이터 로드
csv_path = "channel_ai_db_export_1771812133027.csv"
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

print("✅ 실제 CSV 데이터 로드 완료!\\n")
display(df.tail(10)) # 생성된 데이터 끝부분 확인
"""

code_2 = """\
# --- 2. 선형 회귀 (Linear Regression) 미래 예측 ---
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

print(f"오늘까지의 마지막 비용: {df['cost'].iloc[-1]:,.0f} 원")
print(f"내일 예상 비용: {int(future_pred[0]):,.0f} 원")

# 시각화
plt.figure(figsize=(10, 5))
plt.plot(df['date'], df['cost'], label='실제 광고비', marker='o')
plt.plot(pd.date_range(start=df['date'].iloc[-1], periods=4)[1:], future_pred, 
         label='향후 예측', linestyle='--', color='red', marker='x')
plt.title("머신러닝(선형회귀) 기반 예산 소진 예측")
plt.legend()
plt.show()
"""

code_3 = """\
# --- 3. 이상 탐지 (Anomaly Detection) - Z-Score 방식 ---
mean_cost = df['cost'].mean()
std_cost = df['cost'].std()

df['z_score'] = (df['cost'] - mean_cost) / std_cost
df['anomaly'] = df['z_score'].apply(lambda x: True if abs(x) > 2 else False)

# 이상치 발생한 날만 뽑아보기
anomalies = df[df['anomaly'] == True]
print(f"Z-score 평균: {mean_cost:,.0f}, 표준편차: {std_cost:,.0f}")
print("-" * 50)
if not anomalies.empty:
    print("🚨 [경고] 비정상적인 데이터가 감지되었습니다:")
    display(anomalies[['date', 'cost', 'z_score']])
else:
    print("✅ 비정상적인 데이터가 발견되지 않았습니다. (z_score > 2 인 데이터가 없음)")

# 시각화
plt.figure(figsize=(10, 5))
plt.plot(df['date'], df['cost'], color='blue', alpha=0.5)
plt.scatter(anomalies['date'], anomalies['cost'], color='red', s=100, label='이상 탐지(위험)')
plt.title("비정상적 광고비 지출 알람")
plt.legend()
plt.show()
"""

nb['cells'] = [nbf.v4.new_markdown_cell(text),
               nbf.v4.new_code_cell(code_1),
               nbf.v4.new_code_cell(code_2),
               nbf.v4.new_code_cell(code_3)]

with open('ai_experiments_csv.ipynb', 'w', encoding='utf-8') as f:
    nbf.write(nb, f)
