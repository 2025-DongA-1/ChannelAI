# ensemble_model.py

# ============================================================
# [라이브러리 import]
# ============================================================
# os                : 현재 파일 위치 기준으로 저장 경로를 만들기 위해 사용
# numpy             : 난수 생성, 수학 연산, 배열 계산용
# pandas            : 데이터프레임 생성 및 전처리용
# xgboost           : 비선형 패턴을 잘 잡는 트리 기반 부스팅 모델
# joblib            : 학습된 모델/스케일러를 파일로 저장하고 불러오기 위한 라이브러리
import os
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib

# sklearn 관련 모듈
# train_test_split  : 데이터를 학습/검증/테스트 셋으로 분리
# GridSearchCV      : 하이퍼파라미터 최적 조합 탐색
# mean_squared_error: RMSE 계산용
# r2_score          : 결정계수(R²) 계산용
# Ridge             : 선형회귀 + L2 규제 모델
# VotingRegressor   : 여러 회귀 모델의 예측을 가중 평균하여 앙상블
# StandardScaler    : 각 feature를 평균 0, 표준편차 1 기준으로 스케일링
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.linear_model import Ridge
from sklearn.ensemble import VotingRegressor
from sklearn.preprocessing import StandardScaler


# ============================================================
# 1) 학습 데이터 생성 및 파생 변수(Feature Engineering) 추가
# ============================================================
def generate_realistic_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    광고 채널별 특성을 반영한 가상의 학습 데이터를 생성하는 함수

    Parameters
    ----------
    n_samples : int
        생성할 데이터 샘플 수

    Returns
    -------
    pd.DataFrame
        모델 학습에 사용할 feature + target_roas 컬럼이 포함된 데이터프레임

    설명
    ----
    실제 운영 데이터가 충분하지 않거나,
    모델 구조를 먼저 검증하고 싶을 때 사용할 수 있는 시뮬레이션 데이터 생성 함수이다.

    여기서는 다음과 같은 가정을 반영한다.
    1. 채널마다 기본 ROAS / CPC / CTR 성향이 다르다.
    2. 채널마다 어느 정도 '효율이 좋은 예산 구간(optimal budget)'이 있다.
    3. 현재 집행 예산이 적정 예산에서 멀어질수록 성과가 나빠질 수 있다.
    4. trend_score가 높을수록 광고 효율이 좋아질 가능성이 있다.
    5. 실제 데이터처럼 완벽하지 않도록 noise(잡음)를 추가한다.
    """

    print("⚡ [ensemble_model] 데이터 생성 및 파생 변수(Feature Engineering) 주입 중...")

    # 난수 고정:
    # 실행할 때마다 같은 랜덤 데이터가 생성되도록 하여
    # 실험 재현성을 확보한다.
    np.random.seed(42)

    # 생성된 각 샘플(row)을 저장할 리스트
    data = []

    # ------------------------------------------------------------
    # 채널별 기본 성향 설정
    # ------------------------------------------------------------
    # roas : 기본 수익률 성향
    # cpc  : 평균 클릭당 비용 성향
    # ctr  : 평균 클릭률 성향
    #
    # 이 값들은 "채널별 특성이 다르다"는 점을 시뮬레이션하기 위한 기준값이다.
    base_metrics = {
        "naver": {"roas": 3.5, "cpc": 800, "ctr": 2.5},
        "meta": {"roas": 2.2, "cpc": 400, "ctr": 1.2},
        "google": {"roas": 2.8, "cpc": 600, "ctr": 1.8},
        "karrot": {"roas": 3.0, "cpc": 300, "ctr": 3.0}
    }

    # n_samples 개수만큼 샘플 생성
    for _ in range(n_samples):
        # --------------------------------------------------------
        # 1. 채널 무작위 선택
        # --------------------------------------------------------
        channel = np.random.choice(list(base_metrics.keys()))

        # 광고비(cost): 1만원 ~ 200만원 사이 랜덤
        cost = np.random.randint(10_000, 2_000_000)

        # 트렌드 점수: 30 ~ 100 사이 랜덤
        # 실제로는 검색량, 시즌성, 이슈성 등을 반영한 점수라고 가정
        trend_score = np.random.randint(30, 100)

        # --------------------------------------------------------
        # 2. 채널별 "적정 예산" 가정
        # --------------------------------------------------------
        # 각 채널은 너무 적게 써도 비효율, 너무 많이 써도 효율이 떨어질 수 있다고 가정
        # 이 적정 예산으로부터 멀어질수록 penalty를 주기 위한 기준값
        optimal_budget_map = {
            "naver": 500_000,
            "meta": 300_000,
            "google": 400_000,
            "karrot": 100_000
        }
        optimal_budget = optimal_budget_map[channel]

        # 현재 예산이 적정 예산에서 얼마나 떨어져 있는지 비율로 계산
        # 예: optimal_budget = 500,000, cost = 750,000 이면 diff_ratio = 0.5
        diff_ratio = abs(cost - optimal_budget) / optimal_budget

        # penalty_factor:
        # 적정 예산에서 벗어날수록 ROAS에 불이익을 주기 위한 패널티 값
        # 제곱을 사용해 차이가 클수록 패널티가 더 빠르게 커지도록 설계
        # 최대 2.0까지만 반영하여 과도한 영향 방지
        penalty_factor = min((diff_ratio ** 2) * 1.5, 2.0)

        # --------------------------------------------------------
        # 3. trend_score가 성과에 미치는 영향
        # --------------------------------------------------------
        # trend_score가 50보다 높으면 +영향, 낮으면 -영향이 가도록 설정
        # 예: trend_score=70 -> +1.0, trend_score=40 -> -0.5
        trend_impact = (trend_score - 50) * 0.05

        # 현재 채널의 기본 CPC / CTR 값 가져오기
        base_cpc = base_metrics[channel]["cpc"]
        base_ctr = base_metrics[channel]["ctr"]

        # --------------------------------------------------------
        # 4. CPC / CTR 생성
        # --------------------------------------------------------
        # CPC:
        # 적정 예산에서 너무 멀어지면 경쟁이 비효율적으로 발생한다고 가정하여
        # CPC가 조금 올라가게 설계
        # 여기에 0.9 ~ 1.1 랜덤 계수를 곱해 현실적인 흔들림 추가
        cpc = base_cpc * (1.0 + (penalty_factor * 0.2)) * np.random.uniform(0.9, 1.1)

        # CTR:
        # trend가 좋으면 상승, penalty가 크면 하락하도록 설계
        # 역시 랜덤 계수로 자연스러운 변동 반영
        ctr = base_ctr * (1.0 + (trend_impact * 0.1) - (penalty_factor * 0.1)) * np.random.uniform(0.9, 1.1)

        # 비정상적으로 작은 값 방지용 하한 처리
        cpc = max(100, cpc)
        ctr = max(0.1, ctr)

        # --------------------------------------------------------
        # 5. target ROAS 생성
        # --------------------------------------------------------
        # 채널별 기본 ROAS에서
        # - 적정 예산 이탈 패널티는 빼고
        # + 트렌드 영향은 더한다
        base_roas = base_metrics[channel]["roas"]
        true_value = base_roas - penalty_factor + trend_impact

        # 미래 성과는 항상 불확실성이 있기 때문에 noise 추가
        # 평균 0, 표준편차 0.5인 정규분포 잡음
        future_noise = np.random.normal(0, 0.5)

        # 최종 타겟 ROAS를 0.5 ~ 8.0 범위로 제한
        # 너무 극단적인 값은 학습을 불안정하게 만들 수 있어 clip 처리
        target_roas = np.clip(true_value + future_noise, 0.5, 8.0)

        # --------------------------------------------------------
        # 6. 학습용 feature 구성
        # --------------------------------------------------------
        # 영문 변수명 유지 이유:
        # predict_budget.py 또는 배포 단계에서 feature 이름 일관성이 중요하기 때문
        #
        # one-hot encoding:
        # channel 정보를 숫자 입력으로 넣기 위해 사용
        #
        # 파생 변수 3개:
        # 1) expected_clicks    : 비용 / CPC -> 이 예산으로 기대되는 클릭 수
        # 2) trend_efficiency   : trend_score / log1p(cost)
        #                         -> 예산 대비 트렌드 효율을 간단히 표현
        # 3) click_value        : (cost / cpc) * ctr
        #                         -> 클릭 수와 CTR을 함께 반영한 지표
        row = {
            "cost": cost,
            "cpc": cpc,
            "ctr": ctr,
            "trend_score": trend_score,

            # 채널 원-핫 인코딩
            "channel_naver": 1 if channel == "naver" else 0,
            "channel_meta": 1 if channel == "meta" else 0,
            "channel_google": 1 if channel == "google" else 0,
            "channel_karrot": 1 if channel == "karrot" else 0,

            # 파생 변수
            "expected_clicks": cost / cpc,
            "trend_efficiency": trend_score / np.log1p(cost),
            "click_value": (cost / cpc) * ctr,

            # target은 % 단위처럼 보기 좋게 100배 스케일
            # 예: ROAS 2.31 -> 231.0
            "target_roas": target_roas * 100
        }

        data.append(row)

    # 리스트를 데이터프레임으로 변환하여 반환
    return pd.DataFrame(data)


# ============================================================
# 2) 메인 실행부
# ============================================================
if __name__ == "__main__":
    # --------------------------------------------------------
    # Step 1. 데이터 생성
    # --------------------------------------------------------
    df = generate_realistic_data(n_samples=5000)

    # feature(X)와 target(y) 분리
    # target_roas만 정답값(y)이고, 나머지는 입력값(X)
    X = df.drop(["target_roas"], axis=1)
    y = df["target_roas"]

    # --------------------------------------------------------
    # Step 2. 데이터 3분할
    # --------------------------------------------------------
    # [중요]
    # 테스트셋은 "최종 성능 확인용"이므로 처음부터 분리해두고 절대 튜닝에 사용하지 않는다.
    #
    # 1차 분할:
    #   - train+val: 80%
    #   - test     : 20%
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 2차 분할:
    #   - train: 60%
    #   - val  : 20%
    #   - test : 20%
    # X_temp의 25%를 val로 떼면 전체 기준 20%가 된다.
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.25, random_state=42
    )

    # --------------------------------------------------------
    # Step 3. 스케일링
    # --------------------------------------------------------
    # Ridge 같은 선형 모델은 feature 스케일에 민감하므로 표준화가 중요하다.
    #
    # [중요] 데이터 누수 방지:
    # scaler는 반드시 train 데이터로만 fit 해야 한다.
    # val/test에는 train에서 학습한 기준(mean, std)만 적용(transform)
    scaler = StandardScaler()

    # fit_transform: train 데이터 기준으로 평균/표준편차를 계산하고 바로 변환
    X_train_scaled = pd.DataFrame(
        scaler.fit_transform(X_train),
        columns=X.columns
    )

    # transform: train에서 학습한 기준으로만 변환
    X_val_scaled = pd.DataFrame(
        scaler.transform(X_val),
        columns=X.columns
    )
    X_test_scaled = pd.DataFrame(
        scaler.transform(X_test),
        columns=X.columns
    )

    print("\n🔍 ★ [단계 1] 개별 모델 하이퍼파라미터 자동 튜닝 (GridSearchCV) ★")

    # --------------------------------------------------------
    # Step 4. Ridge 하이퍼파라미터 튜닝
    # --------------------------------------------------------
    # alpha:
    # 규제 강도. 값이 클수록 계수를 더 강하게 제한하여 과적합 방지
    ridge_params = {
        'alpha': [0.1, 1.0, 10.0, 50.0]
    }

    # scoring='neg_root_mean_squared_error'
    # sklearn은 score가 "클수록 좋다" 체계이므로 RMSE 앞에 음수를 붙여 사용
    grid_ridge = GridSearchCV(
        Ridge(random_state=42),
        ridge_params,
        cv=3,
        scoring='neg_root_mean_squared_error'
    )

    # .values를 사용해 numpy array 형태로 전달
    grid_ridge.fit(X_train_scaled.values, y_train.values)

    # 최적 하이퍼파라미터를 찾은 Ridge 모델
    best_ridge = grid_ridge.best_estimator_

    print(f"  👉 Ridge 최적 파라미터 발견: alpha = {best_ridge.alpha}")

    # --------------------------------------------------------
    # Step 5. XGBoost 하이퍼파라미터 튜닝
    # --------------------------------------------------------
    # max_depth     : 트리 깊이
    # learning_rate : 한 번 학습할 때 반영하는 정도
    # n_estimators  : 트리 개수
    #
    # 일반적으로:
    # - depth가 깊을수록 복잡한 패턴을 잡지만 과적합 위험 증가
    # - learning_rate가 작을수록 천천히 학습
    # - n_estimators가 많을수록 더 많은 트리를 사용
    xgb_params = {
        'max_depth': [3, 5, 7],
        'learning_rate': [0.05, 0.1, 0.2],
        'n_estimators': [100, 200]
    }

    grid_xgb = GridSearchCV(
        xgb.XGBRegressor(random_state=42),
        xgb_params,
        cv=3,
        scoring='neg_root_mean_squared_error'
    )

    grid_xgb.fit(X_train_scaled.values, y_train.values)

    # 최적 하이퍼파라미터를 찾은 XGBoost 모델
    best_xgb = grid_xgb.best_estimator_

    print(
        f"  👉 XGBoost 최적 파라미터 발견: "
        f"max_depth={best_xgb.max_depth}, "
        f"learning_rate={best_xgb.learning_rate}, "
        f"n_estimators={best_xgb.n_estimators}"
    )

    # ============================================================
    # Step 6. Validation 셋을 이용한 최적 앙상블 비율 탐색
    # ============================================================
    print("\n⚖️ ★ [단계 2] Validation 셋을 이용한 최적의 앙상블 비율 탐색 ★")

    # Ridge와 XGBoost의 가중치를 다르게 주면서
    # 어떤 조합이 validation 성능이 가장 좋은지 비교
    #
    # 예: [0.8, 0.2] -> Ridge 예측 80%, XGB 예측 20% 반영
    weight_candidates = [
        ([0.8, 0.2], "Ridge 80% : XGB 20%"),
        ([0.7, 0.3], "Ridge 70% : XGB 30%"),
        ([0.5, 0.5], "Ridge 50% : XGB 50%"),
        ([0.3, 0.7], "Ridge 30% : XGB 70%"),
        ([0.2, 0.8], "Ridge 20% : XGB 80%")
    ]

    # 각 비율별 validation 결과 저장용
    val_results = []

    # 보고서 비교용으로 5:5 모델도 따로 보관
    ens_55_model = None

    for weights, label in weight_candidates:
        # VotingRegressor:
        # 여러 회귀 모델의 예측값을 평균내는 앙상블 모델
        ensemble = VotingRegressor(
            estimators=[
                ('ridge', best_ridge),
                ('xgb', best_xgb)
            ],
            weights=weights
        )

        # 학습은 train 데이터로만 수행
        ensemble.fit(X_train_scaled.values, y_train.values)

        # validation 데이터로 성능 평가
        val_pred = ensemble.predict(X_val_scaled.values)

        # RMSE: 낮을수록 좋음
        val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))

        # R²: 1에 가까울수록 좋음
        val_r2 = r2_score(y_val, val_pred)

        # 결과 저장
        val_results.append({
            'label': label,
            'weights': weights,
            'val_rmse': val_rmse,
            'val_r2': val_r2,
            'model': ensemble
        })

        # 보고서용 5:5 앙상블 따로 저장
        if weights == [0.5, 0.5]:
            ens_55_model = ensemble

    # validation RMSE가 가장 낮은 조합을 최종 선택
    best_result = min(val_results, key=lambda x: x['val_rmse'])
    best_ensemble_model = best_result['model']
    best_weight_label = best_result['label']

    # 각 비율별 성능 출력
    for res in val_results:
        marker = "  [👑 최적의 앙상블]" if res == best_result else ""
        print(
            f"  - 비율 테스트 [{res['label']}] "
            f"-> RMSE: {res['val_rmse']:.2f}%p | "
            f"R2: {res['val_r2']:.4f}{marker}"
        )

    # ============================================================
    # Step 7. Test 셋 기준 최종 성능 비교
    # ============================================================
    # test 셋은 지금 이 단계에서만 사용해야 한다.
    # 여기서 나온 값이 실제 "최종 성능"에 가장 가까운 지표이다.
    print("\n" + "=" * 65)
    print("📊 [보고서용] Test 셋 기준 단독 모델 vs 앙상블 성능 비교표")
    print("=" * 65)
    print(f"{'모델명':<25} | {'RMSE (%p) (↓좋음)':<18} | {'R2 Score (↑좋음)':<15}")
    print("-" * 65)

    # 비교할 모델 목록
    models_to_evaluate = {
        "1. L2 Ridge 단독": best_ridge,
        "2. XGBoost 단독": best_xgb,
        "3. 앙상블 (5:5)": ens_55_model,
        f"4. 최적 앙상블 ({best_weight_label})": best_ensemble_model
    }

    # test 셋으로 각 모델 성능 계산
    for name, model in models_to_evaluate.items():
        pred = model.predict(X_test_scaled.values)
        rmse = np.sqrt(mean_squared_error(y_test, pred))
        r2 = r2_score(y_test, pred)

        print(f"{name:<25} | {rmse:>14.2f}    | {r2:>12.4f}")

    print("=" * 65 + "\n")

    # ============================================================
    # Step 8. 모델 및 스케일러 저장
    # ============================================================
    # __file__ 기준 현재 파일이 있는 폴더 경로를 구한다.
    # 이렇게 해야 실행 위치와 상관없이 항상 같은 폴더에 저장 가능
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # 저장 파일 경로 생성
    ensemble_path = os.path.join(current_dir, "ensemble_roas_model.pkl")
    scaler_path = os.path.join(current_dir, "roas_scaler.pkl")

    # joblib.dump():
    # 학습이 끝난 모델과 scaler를 파일로 저장
    # 이후 predict_budget.py 등에서 그대로 불러와 재사용 가능
    joblib.dump(best_ensemble_model, ensemble_path)
    joblib.dump(scaler, scaler_path)

    print(f"✅ 최적화된 앙상블 모델 저장 완료: {ensemble_path}")
    print(f"✅ 데이터 스케일러 저장 완료: {scaler_path}")