"""
ml_predict.py
--------------
Node.js 백엔드에서 child_process.spawn 으로 호출되는 실시간 ML 예측 스크립트.

처리 흐름:
  1. 커맨드라인 인수로 DB 접속 정보 및 날짜 필터를 받음
  2. MySQL에서 campaign_metrics 데이터를 로드
  3. XGBoost 회귀 모델로 '전환(설치) 수' 예측
  4. RandomForest 분류 모델로 '최적 광고 매체' 예측
  5. 결과를 JSON으로 stdout에 출력 (Node.js가 파싱)

사용 방법 (Node.js에서 호출):
  python ml_predict.py \
    --host=<DB_HOST> --port=<DB_PORT> \
    --db=<DB_NAME> --user=<DB_USER> --password=<DB_PASSWORD> \
    [--start=YYYY-MM-DD] [--end=YYYY-MM-DD]
"""

import sys
import io
import json
import argparse
import warnings
warnings.filterwarnings('ignore')

# Windows 환경에서 Python stdout이 cp949로 출력되는 문제 해결
# Node.js가 UTF-8로 읽으므로 stdout을 UTF-8로 강제 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ---------- 커맨드라인 인수 파싱 ----------
parser = argparse.ArgumentParser()
parser.add_argument('--host',     required=True)
parser.add_argument('--port',     type=int, default=3306)
parser.add_argument('--db',       required=True)
parser.add_argument('--user',     required=True)
parser.add_argument('--password', required=True)
parser.add_argument('--start',    default=None)  # 시작일 필터 (선택)
parser.add_argument('--end',      default=None)  # 종료일 필터 (선택)
args = parser.parse_args()

try:
    import pandas as pd
    import pymysql
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, accuracy_score
    import xgboost as xgb
except ImportError as e:
    # 패키지 누락 시 에러 JSON 출력 후 종료
    print(json.dumps({"error": f"필수 패키지 누락: {str(e)}"}))
    sys.exit(1)

# ---------- DB 연결 및 데이터 로딩 ----------
try:
    conn = pymysql.connect(
        host=args.host,
        port=args.port,
        database=args.db,
        user=args.user,
        password=args.password,
        connect_timeout=10,   # 연결 최대 대기 시간 10초
        charset='utf8mb4'
    )

    # 날짜 필터 조건 동적 구성 (없으면 전체 기간)
    date_filter = ""
    if args.start and args.end:
        date_filter = f"AND cm.metric_date >= '{args.start}' AND cm.metric_date <= '{args.end}'"

    query = f"""
        SELECT
            ma.channel_code   AS platform,
            cm.metric_date    AS date,
            cm.impressions,
            cm.clicks,
            cm.cost,
            cm.conversions    AS installs
        FROM campaign_metrics cm
        JOIN campaigns c           ON cm.campaign_id = c.id
        JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
        WHERE 1=1 {date_filter}
    """
    df = pd.read_sql(query, conn)
    conn.close()
except Exception as e:
    print(json.dumps({"error": f"DB 연결 실패: {str(e)}"}))
    sys.exit(1)

# 데이터가 없는 경우
if df.empty:
    print(json.dumps({"error": "해당 기간에 분석할 데이터가 없습니다."}))
    sys.exit(0)

# 숫자형 변환 및 결측치 제거
for col in ['impressions', 'clicks', 'cost', 'installs']:
    df[col] = pd.to_numeric(df[col], errors='coerce')
df = df.dropna()

result = {}

# ============================================================
# [1] XGBoost 회귀 모델 - 전환(설치) 수 예측
# ============================================================
try:
    from sklearn.preprocessing import LabelEncoder

    df_xgb = df.copy()
    # 매체명(문자열)을 숫자로 인코딩
    le = LabelEncoder()
    df_xgb['platform_enc'] = le.fit_transform(df_xgb['platform'])

    # 피처: 매체 코드, 노출, 비용, 클릭 / 타겟: 설치 수
    features = ['platform_enc', 'impressions', 'cost', 'clicks']
    target   = 'installs'

    X = df_xgb[features]
    y = df_xgb[target]

    if len(df_xgb) >= 10:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        # XGBoost 회귀 모델 학습
        model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)

        # 샘플 예측 (테스트셋 첫 번째 데이터)
        sample_idx    = 0
        sample_feat   = X_test.iloc[sample_idx]
        platform_name = le.inverse_transform([int(sample_feat['platform_enc'])])[0]

        # 매체별 MAE 계산
        df_xgb_test = X_test.copy()
        df_xgb_test['y_true'] = y_test.values
        df_xgb_test['y_pred'] = y_pred
        df_xgb_test['platform_name'] = le.inverse_transform(df_xgb_test['platform_enc'].astype(int))
        df_xgb_test['abs_err'] = abs(df_xgb_test['y_true'] - df_xgb_test['y_pred'])
        platform_mae = df_xgb_test.groupby('platform_name')['abs_err'].mean().round(2).to_dict()

        result['xgboost'] = {
            "status":   "success",
            "mae":      round(float(mae), 2),         # 전체 평균 절대 오차
            "dataSize": len(df_xgb),                  # 학습에 사용된 데이터 수
            "platformMae": [                           # 매체별 오차 리스트
                {"name": k, "error": v}
                for k, v in platform_mae.items()
            ],
            "sample": {                               # 샘플 예측 결과
                "platform":   platform_name,
                "cost":       round(float(sample_feat['cost']), 0),
                "impressions": round(float(sample_feat['impressions']), 0),
                "clicks":     round(float(sample_feat['clicks']), 0),
                "predicted":  round(float(y_pred[sample_idx]), 1),
                "actual":     int(y_test.iloc[sample_idx])
            }
        }
    else:
        result['xgboost'] = {"status": "insufficient", "message": f"데이터 부족 ({len(df_xgb)}건, 최소 10건 필요)"}
except Exception as e:
    result['xgboost'] = {"status": "error", "message": str(e)}

# ============================================================
# [2] RandomForest 분류 모델 - 최적 광고 매체 추천
# ============================================================
try:
    df_rf = df.copy()
    # 1원 당 설치 수(효율) 계산
    df_rf['efficiency'] = df_rf['installs'] / (df_rf['cost'] + 1)

    # 날짜별로 효율이 가장 높았던 매체(1등) 추출
    best_idx   = df_rf.groupby('date')['efficiency'].idxmax()
    best_daily = df_rf.loc[best_idx, ['date', 'platform']].rename(
        columns={'platform': 'best_platform'}
    )

    # 날짜별 전체 광고 환경 집계 (총 노출, 총 비용, 총 클릭)
    daily_agg = df_rf.groupby('date').agg(
        impressions=('impressions', 'sum'),
        cost=('cost', 'sum'),
        clicks=('clicks', 'sum')
    ).reset_index()

    rf_data = pd.merge(daily_agg, best_daily, on='date')

    if len(rf_data) >= 5:
        X_rf = rf_data[['impressions', 'cost', 'clicks']]
        y_rf = rf_data['best_platform']

        X_train_rf, X_test_rf, y_train_rf, y_test_rf = train_test_split(
            X_rf, y_rf, test_size=0.2, random_state=42
        )
        # RandomForest 분류 모델 학습
        rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        rf_model.fit(X_train_rf, y_train_rf)

        y_pred_rf = rf_model.predict(X_test_rf)
        acc       = accuracy_score(y_test_rf, y_pred_rf)

        # 클래스별 정밀도/재현율 계산
        from sklearn.metrics import classification_report as cr
        report = cr(y_test_rf, y_pred_rf, output_dict=True, zero_division=0)
        platform_metrics = [
            {
                "name":      k,
                "precision": round(v['precision'], 2),
                "recall":    round(v['recall'], 2)
            }
            for k, v in report.items()
            if k not in ('accuracy', 'macro avg', 'weighted avg')
        ]

        # 샘플 추천 결과
        sample_rf     = X_test_rf.iloc[0]
        pred_platform = rf_model.predict(sample_rf.to_frame().T)[0]
        actual_best   = y_test_rf.iloc[0]

        result['randomforest'] = {
            "status":          "success",
            "accuracy":        round(float(acc), 2),  # 전체 정확도
            "dataSize":        len(rf_data),           # 사용된 날짜 수
            "platformMetrics": platform_metrics,       # 매체별 추천 정밀도/재현율
            "sample": {                                # 샘플 추천 결과
                "totalImpressions": round(float(sample_rf['impressions']), 0),
                "totalCost":        round(float(sample_rf['cost']), 0),
                "predicted":        pred_platform,
                "actual":           actual_best
            }
        }
    else:
        result['randomforest'] = {"status": "insufficient", "message": f"날짜 데이터 부족 ({len(rf_data)}일치, 최소 5일 필요)"}
except Exception as e:
    result['randomforest'] = {"status": "error", "message": str(e)}

# ---------- 결과를 JSON으로 stdout 출력 (Node.js가 파싱) ----------
print(json.dumps(result, ensure_ascii=False))
