import sys
import json
import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.optimize import linprog
import os
from datetime import datetime
import joblib

# JSON 파싱 에러 방지
import warnings
warnings.filterwarnings("ignore")

# 앙상블 라이브러리 및 설정값

RIDGE_MODEL_FILENAME = 'baseline_ridge_model.joblib'
USE_ENSEMBLE = True     # True : XGB + Ridge 가중 평균 / False : XGB 우선(Ridge 폴백만) 
XGB_WEIGHT = 0.5        # XGBoost의 비중 (비선형 디테일)
RIDGE_WEIGHT = 0.5      # Ridge의 비중 (안정성 및 제동 장치)


# [추가] Windows(팀원) 환경에서 한글 깨짐 방지를 위한 입출력 강제 UTF-8 설정
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

# ==========================================
# ★ [여기를 추가해주세요] 윈도우 이모지 에러 방지 코드
# ==========================================
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')
# ==========================================

# ==========================================
# ★ [NEW] stderr 로깅 (stdout JSON 깨짐 방지)
# ==========================================
def log(*args):
    print(*args, file=sys.stderr)

# ==========================================
# 1. Numpy 숫자 변환기 (에러 방지용)
# ==========================================
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating) or isinstance(obj, float):
            return float(round(obj, 2))
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

# ==========================================
# ★ [NEW] 과거 데이터 생성 함수 (7일/30일 대응)
# ==========================================
def generate_past_history(predicted_roas, duration=7):
    history = []

    # 4개 매체별로 각기 다른 베이스라인 변동성 생성 (랜덤)
    volatility = [np.random.uniform(0.85, 1.15) for _ in range(4)]
    
    # 1일차부터 duration(7일 or 30일)일차까지 미래로 전진
    for step in range(1, duration + 1):
        day_label = f"{step}일차"

        # 노이즈를 10% 내외로 흔들어서 현실느낌 반영
        daily_noise = np.random.uniform(0.92, 1.08)

        row = {"day": day_label}

        # 각 매체별로 독립적인 흔들림 적용
        row["Naver"] = round(float(predicted_roas[0] * volatility[0] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Meta"] = round(float(predicted_roas[1] * volatility[1] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Google"] = round(float(predicted_roas[2] * volatility[2] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Karrot"] = round(float(predicted_roas[3] * volatility[3] * daily_noise * np.random.uniform(0.95, 1.05)), 2)

        history.append(row)

    # 마지막으로 '오늘(예측)' 데이터 추가
    history.append({
        "day": "D-Day",
        "Naver": round(float(predicted_roas[0]), 2),
        "Meta": round(float(predicted_roas[1]), 2),
        "Google": round(float(predicted_roas[2]), 2),
        "Karrot": round(float(predicted_roas[3]), 2)
    })

    # ✅ [FIX] day 라벨에 섞일 수 있는 공백/줄바꿈 최종 정리(방탄)
    for r in history:
        if "day" in r and isinstance(r["day"], str):
            r["day"] = r["day"].replace("\n", "").replace("\r", "").strip()

    return history

# ==========================================
# ★ [NEW] 예측 ROAS 클리핑 (비현실 튐 방지)
# ==========================================
def clip_predicted_roas(pred, min_roas=50.0, max_roas=800.0):
    pred = np.asarray(pred, dtype=float)
    return np.clip(pred, min_roas, max_roas)

# ==========================================
# ★ [NEW] 최적화 bounds를 총예산에 맞게 안전하게 만드는 함수
# ==========================================
def build_safe_bounds(n, total_budget, min_budget_default=30000, max_ratio_default=0.6):
    """
    - 총예산이 작아서 (n * 30000) 충족 못하면 자동으로 min을 낮춤
    - max도 total_budget*0.6이 min보다 작아지지 않게 보정
    """
    total_budget = float(total_budget)

    if n <= 0:
        return []

    # 채널당 최소 예산 (총예산이 작으면 자동으로 낮춘다)
    min_per = float(min_budget_default)
    if total_budget < n * min_per:
        min_per = 0.0

    # 채널당 최대 예산
    max_per = float(total_budget * max_ratio_default)

    # max가 min보다 작으면(총예산 매우 작음) max도 min으로 맞춤
    if max_per < min_per:
        max_per = min_per

    # 한 번 더 방어
    if total_budget - (n * min_per) < -1e-6:
        min_per = 0.0
        if max_per < min_per:
            max_per = min_per

    return [(min_per, max_per) for _ in range(n)]

# ==========================================
# ★ [NEW] PRO 리포트 생성 함수 (컨설팅 프레임워크)
# ==========================================
def build_pro_report(
    total_budget,
    allocated_budget,
    predicted_roas,
    expected_revenue,
    duration,
    clip_min=50.0,
    clip_max=800.0,
    min_budget_default=30000,
    max_ratio_default=0.6
):
    """
    리포트 구성:
    📢 Executive Summary
    🔍 플랫폼별 정밀 진단 (현상 → 데이터 근거 → 전략 → 기대효과)
    ✅ 실행 가이드 (액션 아이템)
    ⚠️ 한계/면책
    """
    # 순서 고정: [Naver, Meta, Google, Karrot]
    channel_codes = ["naver", "meta", "google", "karrot"]
    channel_names = ["네이버", "메타", "구글", "당근"]
    channel_names_kr = {
        "네이버": "네이버",
        "메타": "인스타그램/페이스북",
        "구글": "구글/유튜브",
        "당근": "당근"
    }
    channel_display = [channel_names_kr.get(n, n) for n in channel_names]

    total_budget = float(total_budget)
    alloc = np.asarray(allocated_budget, dtype=float)
    roas = np.asarray(predicted_roas, dtype=float)

    # 채널별 기대 매출(추정): 예산 * (ROAS/100)
    exp_rev_by_channel = alloc * (roas / 100.0)

    # 핵심 지표
    best_idx = int(np.argmax(roas))
    best_name = channel_display[best_idx]
    best_roas = float(roas[best_idx])
    best_alloc = float(alloc[best_idx])
    best_ratio = int(round((best_alloc / total_budget) * 100)) if total_budget > 0 else 0

    # 2등 대비 우위
    sorted_idx = np.argsort(-roas)
    top1 = sorted_idx[0]
    top2 = sorted_idx[1] if len(sorted_idx) > 1 else top1
    gap_vs_2nd = float(roas[top1] - roas[top2])

    # 제약조건 요약
    # (현 코드의 bounds 룰을 사람이 이해하기 쉬운 형태로)
    min_per = min_budget_default
    if total_budget < len(roas) * min_per:
        min_per = 0
    max_per = int(total_budget * max_ratio_default)

    # 채널별 “진단 문장” 만들기
    
    # 2등 매체의 이름을 변수로 추출
    second_best_name = channel_display[top2]
    
    lines = []
    lines.append(f"🎯 사장님을 위한 AI 핵심 요약: 현재 가장 효율이 좋은 **{best_name}**에 예산을 집중하여 **매출을 극대화**하는 것을 추천합니다.")
    lines.append(f"2순위 추천 플랫폼인 **{second_best_name}**보다 예상 수익률이 **{gap_vs_2nd:.1f}%p** 더 높기 때문입니다.")
    lines.append("")
    lines.append("🔍 플랫폼별 정밀 진단 (현상 → 데이터 근거 → 전략 → 기대효과)")

    # 비교/근거용: 평균 ROAS
    avg_roas = float(np.mean(roas)) if len(roas) else 0.0

    for i in range(len(roas)):
        name = channel_display[i]
        r = float(roas[i])
        b = float(alloc[i])
        ratio = int(round((b / total_budget) * 100)) if total_budget > 0 else 0
        rev = float(exp_rev_by_channel[i])

        # 상대 비교
        vs_avg = r - avg_roas
        compare_word = "상회" if vs_avg >= 0 else "하회"
        compare_abs = abs(vs_avg)

        # 전략 톤: 예산 비중에 따라 추천 액션을 다르게
        if i == best_idx:
            action = f"**집중 투자 유지**(상한 {int(max_ratio_default*100)}% 범위 내) + 고효율 구간 확장"
            effect = f"동일 예산 대비 **예상 매출 기여**가 가장 큼(추정 {int(round(rev)):,}원)."
        else:
            if ratio <= 10:
                action = "**테스트 예산 유지**(소액) + 소재/타겟 개선 후 재평가"
                effect = "낭비 리스크를 줄이면서 개선 여지를 탐색."
            elif ratio <= 30:
                action = "**균형 운영** + ROAS 하락 시 자동 감액 기준 설정"
                effect = "성과 변동에 대응하며 안정적으로 운영."
            else:
                action = "**부분 감액 고려** + 고효율 채널로 일부 이동"
                effect = "예상 수익률을 끌어올리는 방향으로 재배분."

        # 데이터 근거(숫자 중심)
        lines.append(
            f"• **{name}**\n"
            f"  - 현상: 예측 ROAS **{r:.2f}%** / 예산 배정 **{ratio}%**\n"
            f"  - 데이터 근거: 평균 대비 **{compare_abs:.2f}%p {compare_word}**, 예상 매출 기여 **{int(round(rev)):,}원**\n"
            f"  - 전략 제안: {action}\n"
            f"  - 기대 효과: {effect}"
        )

    lines.append("")
    lines.append("✅ 수익 극대화를 위한 실천 가이드 (바로 실행 가능한 액션)")
    lines.append(f"• **예산 집행(오늘~{duration}일)**: {best_name}에 **{best_ratio}%** 수준으로 집중 운영하고, 나머지는 테스트/방어 예산으로 유지하세요.")
    lines.append("• **운영 룰(간단 자동화)**: 7일 기준 ROAS가 평균 대비 하회하는 채널은 **소재/타겟 1회 개선 후** 개선 없으면 감액하는 룰을 적용하세요.")
    lines.append("• **검증 방법(낭비 방지)**: 채널별로 '클릭→전환→매출' 이벤트가 정상 수집되는지 먼저 점검하고, 데이터가 불완전하면 보수적으로 운영하세요.")

    lines.append("")
    lines.append("📌 알고리즘/제약조건 근거 (투명성)")
    lines.append(f"• 본 배분은 **총예산 {int(total_budget):,}원** 내에서 기대 수익(예산×예측ROAS)을 최대화하도록 계산되었습니다.")
    lines.append(f"• 채널별 예산은 최소 **{int(min_per):,}원**(총예산이 작으면 0원) ~ 최대 **{int(max_per):,}원**(총예산의 {int(max_ratio_default*100)}%) 범위 제약을 적용했습니다.")
    lines.append(f"• 예측 ROAS는 이상치 방지를 위해 **{int(clip_min)}% ~ {int(clip_max)}%** 범위로 클리핑되었습니다.")

    

    # 프론트 파싱을 위해 줄바꿈으로 구조 유지
    return "\n".join(lines)

# ==========================================
# 2. 메인 실행 함수
# ==========================================
def main():
    try:
        # [데이터 수신]
        if len(sys.argv) < 2:
            # 테스트 모드 (기본값)
            data = {
                "total_budget": 500000,
                "duration": 7,
                "features": [
                    {"채널명_Naver": 1, "비용": 100000, "ROAS": 300, "trend_score": 90},
                    {"채널명_Meta": 1, "비용": 100000, "ROAS": 200, "trend_score": 90},
                    {"채널명_Google": 1, "비용": 100000, "ROAS": 250, "trend_score": 90},
                    {"채널명_Karrot": 1, "비용": 50000, "ROAS": 150, "trend_score": 90}
                ]
            }
        else:
            # 실전 모드 (Node.js에서 받음)
            input_data = sys.argv[1]
            data = json.loads(input_data)

    except Exception as e:
        log(json.dumps({"error": f"데이터 수신 실패: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # [수정] 변수 추출 (리스트/객체 모두 대응하는 안전한 코드)
    if isinstance(data, list):
        features_list = data
        total_budget = 500000
        duration = 7
    else:
        features_list = data.get('features', [])
        total_budget = data.get('total_budget', 500000)
        duration = data.get('duration', 7)

    # ==========================================
    # [중요] train_model_v2.py와 컬럼(피처) 정합 맞추기
    # - 학습에서는 channel_* 사용
    # - predict에서도 최종적으로 channel_*로 맞춘다
    # ==========================================
    model_columns = [
        '비용', 'CPC', 'CTR', 'ROAS_3d_trend',
        'trend_score',
        'channel_naver', 'channel_meta', 'channel_google', 'channel_karrot'
    ]

    processed_data = []

    for item in features_list:
        cost = float(total_budget) / 4.0
        current_roas = item.get('ROAS', 200)

        # --------------------------------------------------------------------
        # 🛠️ [개선] 채널별 현실적인 베이스라인 세팅 (디펜스 무기)
        # --------------------------------------------------------------------
        channel_naver = item.get('channel_naver', item.get('채널명_Naver', 0))
        channel_meta = item.get('channel_meta', item.get('채널명_Meta', 0))
        channel_google = item.get('channel_google', item.get('채널명_Google', 0))
        channel_karrot = item.get('channel_karrot', item.get('채널명_Karrot', 0))

        # 1. 채널별 현실적인 CPC 및 기본 CTR (도메인 지식 반영)
        if channel_naver == 1:
            base_cpc = 800  # 검색 광고 특성상 다소 높음
            base_ctr = 2.5
        elif channel_google == 1:
            base_cpc = 600
            base_ctr = 1.8
        elif channel_meta == 1:
            base_cpc = 400  # 노출 위주라 단가는 낮지만
            base_ctr = 1.2  # 클릭률도 낮음
        elif channel_karrot == 1:
            base_cpc = 300  # 지역 기반, 단가 저렴
            base_ctr = 3.0  # 타겟팅이 좁아 클릭률은 높음
        else:
            base_cpc = 500
            base_ctr = 1.5

        # 2. 임의성 부여 (고정값 탈피)
        # 약간의 랜덤성을 더해 매번 똑같은 결과가 나오는 것을 방지
        cpc = base_cpc * np.random.uniform(0.9, 1.1)
        ctr = base_ctr * np.random.uniform(0.9, 1.1)
        
        # 3. ROAS 변화율 적용
        roas_3d = float(current_roas) * np.random.uniform(0.95, 1.05)
        
        # 4. 트렌드 점수 
        # (프론트에서 못 받으면, 30~80 사이의 랜덤 값으로 대체하여 시뮬레이션 현실성 확보)
        trend_score = item.get('trend_score', np.random.randint(30, 80))
        # --------------------------------------------------------------------

        row = {
            '비용': float(cost),
            'CPC': float(cpc),
            'CTR': float(ctr),
            'ROAS_3d_trend': float(roas_3d),
            'trend_score': float(trend_score),
            'channel_naver': int(channel_naver),
            'channel_meta': int(channel_meta),
            'channel_google': int(channel_google),
            'channel_karrot': int(channel_karrot),
        }
        processed_data.append(row)

    df = pd.DataFrame(processed_data)

    # 만약 데이터가 비어있다면 에러 처리
    if df.empty:
        log(json.dumps({"error": "분석할 데이터가 없습니다."}, ensure_ascii=False))
        sys.exit(1)

    # 컬럼 순서 강제 맞춤 (학습때와 동일하게)
    try:
        X = df[model_columns]
    except KeyError as e:
        log(json.dumps({
            "error": f"입력 컬럼이 모델과 맞지 않습니다: {str(e)}",
            "expected_columns": model_columns,
            "received_columns": list(df.columns)
        }, ensure_ascii=False))
        sys.exit(1)

    # [AI 모델 로드 및 예측]  ✅ XGB + Ridge(옵션) 앙상블/폴백
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))

        # ✅ 클리핑 범위(공통)
        CLIP_MIN = 50.0
        CLIP_MAX = 800.0

        # --------------------------
        # (1) XGBoost 예측 (기본)
        # --------------------------
        predicted_roas_xgb = None
        try:
            model = xgb.Booster()
            model_path = os.path.join(script_dir, 'optimal_budget_xgb_model.json')
            model.load_model(model_path)

            # 컬럼명 유지(DMatrix + feature_names 고정)
            dtest = xgb.DMatrix(X.values, feature_names=model_columns)
            predicted_roas_xgb = model.predict(dtest)

            # 비현실 튐 방지
            predicted_roas_xgb = clip_predicted_roas(predicted_roas_xgb, min_roas=CLIP_MIN, max_roas=CLIP_MAX)

        except Exception as e:
            log(json.dumps({"warn": f"XGB 예측 실패: {str(e)}"}, ensure_ascii=False))
            predicted_roas_xgb = None

        # --------------------------
        # (2) Ridge 예측 (있으면 사용)
        # --------------------------
        predicted_roas_ridge = None
        ridge_path = os.path.join(script_dir, RIDGE_MODEL_FILENAME)

        if os.path.exists(ridge_path):
            try:
                ridge_model = joblib.load(ridge_path)
                # ✅ Ridge 파이프라인은 DataFrame 입력을 권장 (스케일러 포함)
                predicted_roas_ridge = ridge_model.predict(X)
                predicted_roas_ridge = clip_predicted_roas(predicted_roas_ridge, min_roas=CLIP_MIN, max_roas=CLIP_MAX)

            except Exception as e:
                log(json.dumps({"warn": f"Ridge 예측 실패: {str(e)}"}, ensure_ascii=False))
                predicted_roas_ridge = None
        else:
            # Ridge 파일이 없으면 조용히 넘어감
            predicted_roas_ridge = None

        # --------------------------
        # (3) 앙상블 / 폴백 결정
        # --------------------------
        if predicted_roas_xgb is not None and predicted_roas_ridge is not None:
            if USE_ENSEMBLE:
                predicted_roas = (XGB_WEIGHT * predicted_roas_xgb) + (RIDGE_WEIGHT * predicted_roas_ridge)
            else:
                predicted_roas = predicted_roas_xgb
        elif predicted_roas_xgb is not None:
            predicted_roas = predicted_roas_xgb
        elif predicted_roas_ridge is not None:
            predicted_roas = predicted_roas_ridge
        else:
            raise RuntimeError("모델 로드/예측 실패: XGB와 Ridge 모두 예측 실패")

    except Exception as e:
        log(json.dumps({"error": f"모델 로드/예측 실패: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # [선형 계획법 - 예산 최적화]
    try:
        n = len(predicted_roas)

        c = [-float(r) for r in predicted_roas]
        A_eq = [[1] * n]
        b_eq = [float(total_budget)]

        # ★ [수정됨] 예산 규모에 따른 '다이나믹 제약 조건' (시각적 다이나믹함 확보)
        # =========================================================
        budget_num = float(total_budget)
        
        if budget_num <= 300000:
            # [소액 예산] 최소 보장 없음, 1등에게 최대 60% 몰아주기 (집중 전략)
            MIN_BUDGET_DEFAULT = 0
            MAX_RATIO_DEFAULT = 0.60
        elif budget_num <= 1000000:
            # [중급 예산] 최소 5% 보장, 최대 45% 제한 (점진적 분산)
            MIN_BUDGET_DEFAULT = budget_num * 0.05
            MAX_RATIO_DEFAULT = 0.45
        else:
            # [고액 예산] 최소 15% 강제 보장, 최대 35% 제한 (완벽한 포트폴리오 분산)
            MIN_BUDGET_DEFAULT = budget_num * 0.15
            MAX_RATIO_DEFAULT = 0.35
        
        bounds = build_safe_bounds(
            n,
            total_budget,
            min_budget_default=MIN_BUDGET_DEFAULT,
            max_ratio_default=MAX_RATIO_DEFAULT
        )

        result = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

        if result.success:
            allocated_budget = result.x

            real_expected_revenue = np.sum(allocated_budget * (predicted_roas / 100.0))

            # ✅ [PRO] 컨설팅 리포트 생성
            report_text = build_pro_report(
                total_budget=total_budget,
                allocated_budget=allocated_budget,
                predicted_roas=predicted_roas,
                expected_revenue=real_expected_revenue,
                duration=duration,
                clip_min=CLIP_MIN,
                clip_max=CLIP_MAX,
                min_budget_default=MIN_BUDGET_DEFAULT,
                max_ratio_default=MAX_RATIO_DEFAULT
            )

            # duration 적용 히스토리 생성
            history_data = generate_past_history(predicted_roas, duration=duration)
            log("predicted_roas:", predicted_roas)
            
            output = {
                "status": "success",
                "total_budget": int(total_budget),
                "allocated_budget": [int(b) for b in np.round(allocated_budget, 0)],
                "predicted_roas": [round(float(r), 2) for r in predicted_roas],
                "expected_revenue": int(round(real_expected_revenue, 0)),
                "history": history_data,
                "ai_report": report_text
            }
        else:
            output = {"status": "failed", "reason": "최적화 실패", "detail": str(result.message)}

    except Exception as e:
        log(json.dumps({"error": f"최적화 계산 실패: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # ✅ stdout에는 JSON만 1번 출력 (Node 파싱 안정)
    sys.stdout.write(json.dumps(output, cls=NumpyEncoder, ensure_ascii=False))
    sys.stdout.flush()

if __name__ == "__main__":
    main()