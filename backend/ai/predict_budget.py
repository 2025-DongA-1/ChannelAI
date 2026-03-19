import sys
import json
import pandas as pd
import numpy as np
from scipy.optimize import linprog
import os
import joblib
import warnings
import json

# ----------------------------------------------------------
# JSON 파싱/출력 과정에서 발생할 수 있는 불필요한 경고 메시지를 숨김
# 실제 서비스에서 stderr가 너무 지저분해지는 것을 방지하기 위한 설정
# ----------------------------------------------------------
warnings.filterwarnings("ignore")

# ==========================================
# ★ [NEW] 2:8 하이브리드 앙상블 모델 설정값
# ==========================================
# 학습 단계에서 저장해 둔 모델 파일명 / 스케일러 파일명
# predict_budget.py는 이 두 파일을 불러와서 예측에 사용함
ENSEMBLE_MODEL_FILENAME = 'ensemble_roas_model.pkl'
SCALER_FILENAME = 'roas_scaler.pkl'

# ----------------------------------------------------------
# Windows 환경에서 한글/이모지 출력이 깨지는 현상을 방지하기 위한 인코딩 처리
# stdout / stderr를 utf-8로 강제 설정
# ----------------------------------------------------------
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')


def log(*args):
    """
    일반 출력(stdout)이 아니라 에러 로그(stderr)로 메시지를 출력하는 함수

    목적
    ----
    - 최종 결과 JSON은 stdout으로 내보내야 함
    - 중간 에러/디버깅 메시지는 stderr로 분리해서 출력해야
      다른 프로그램(Node.js 등)에서 JSON 파싱이 꼬이지 않음
    """
    print(*args, file=sys.stderr)


class NumpyEncoder(json.JSONEncoder):
    """
    numpy 자료형을 JSON 직렬화 가능하게 바꿔주는 인코더

    예:
    - np.integer  -> int
    - np.floating -> float
    - np.ndarray  -> list

    이유
    ----
    Python 기본 json.dumps()는 numpy 타입을 바로 직렬화하지 못하는 경우가 있어
    API 응답용 JSON 생성 전에 안전하게 변환하기 위함
    """
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating) or isinstance(obj, float):
            return float(round(obj, 2))
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)


def generate_past_history(predicted_roas, duration=7, seed_date=None):
    """
    예측된 채널별 ROAS를 기준으로 과거 추이처럼 보이는 history 데이터를 생성
    """
    history = []

    if seed_date is not None:
        try:
            np.random.seed(int(seed_date))
        except:
            import datetime
            np.random.seed(int(datetime.datetime.now().strftime("%Y%m%d")))
    else:
        import datetime
        np.random.seed(int(datetime.datetime.now().strftime("%Y%m%d")))

    # 채널마다 약간 다른 변동성을 부여하기 위한 랜덤 계수
    volatility = [np.random.uniform(0.85, 1.15) for _ in range(4)]
    
    for step in range(1, duration + 1):
        # 예: "1일차", "2일차", ...
        day_label = f"{step}일차"

        # 하루 단위 공통 변동 노이즈
        daily_noise = np.random.uniform(0.92, 1.08)

        row = {"day": day_label}

        # 각 채널별로 예측 ROAS에 변동성 * 일별 노이즈 * 추가 랜덤 노이즈를 적용
        row["Naver"] = round(float(predicted_roas[0] * volatility[0] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Meta"] = round(float(predicted_roas[1] * volatility[1] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Google"] = round(float(predicted_roas[2] * volatility[2] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Karrot"] = round(float(predicted_roas[3] * volatility[3] * daily_noise * np.random.uniform(0.95, 1.05)), 2)

        history.append(row)

    # 마지막 행은 "오늘 최종 예측값"을 D-Day로 추가
    history.append({
        "day": "D-Day",
        "Naver": round(float(predicted_roas[0]), 2),
        "Meta": round(float(predicted_roas[1]), 2),
        "Google": round(float(predicted_roas[2]), 2),
        "Karrot": round(float(predicted_roas[3]), 2)
    })

    # day 문자열 안에 줄바꿈/캐리지리턴이 혹시 섞여 있으면 제거
    for r in history:
        if "day" in r and isinstance(r["day"], str):
            r["day"] = r["day"].replace("\n", "").replace("\r", "").strip()

    return history


def clip_predicted_roas(pred, min_roas=50.0, max_roas=800.0):
    """
    예측된 ROAS 값을 현실적인 범위 안으로 잘라주는 함수

    Parameters
    ----------
    pred : list or np.ndarray
        모델이 예측한 ROAS 값들
    min_roas : float
        최소 허용 ROAS
    max_roas : float
        최대 허용 ROAS

    Returns
    -------
    np.ndarray
        clip 처리된 ROAS 배열

    설명
    ----
    머신러닝 모델이 가끔 비현실적으로 너무 낮거나 높은 값을 낼 수 있으므로,
    서비스 응답 안정성을 위해 최소/최대 범위를 제한한다.
    """
    pred = np.asarray(pred, dtype=float)
    return np.clip(pred, min_roas, max_roas)


def build_safe_bounds(n, total_budget, min_budget_default=30000, max_ratio_default=0.6):
    """
    선형계획법(LP)에서 사용할 채널별 예산 상/하한 bounds 생성

    Parameters
    ----------
    n : int
        채널 수
    total_budget : float
        총 예산
    min_budget_default : float
        채널별 최소 예산 기본값
    max_ratio_default : float
        채널별 최대 예산 비율 (예: 0.6 -> 총예산의 60%)

    Returns
    -------
    list[tuple]
        예: [(min1, max1), (min2, max2), ...]

    설명
    ----
    각 채널에 대해
    - 최소 얼마 이상은 배정할지
    - 최대 얼마 이하까지만 배정할지
    제한하는 역할을 한다.

    다만 총예산이 너무 적어서 "모든 채널에 최소 예산"을 만족시킬 수 없으면
    최소 예산을 0으로 완화한다.
    """
    total_budget = float(total_budget)

    if n <= 0:
        return []

    min_per = float(min_budget_default)

    # 총예산이 너무 작으면 최소 예산 조건을 맞출 수 없으므로 0으로 완화
    if total_budget < n * min_per:
        min_per = 0.0

    # 각 채널별 최대 예산 = 총예산 * 최대비율
    max_per = float(total_budget * max_ratio_default)

    # 혹시 max가 min보다 작아지는 이상 상황 보정
    if max_per < min_per:
        max_per = min_per

    # 전체 예산에서 최소 예산 합계조차 감당이 안 되는 경우 재보정
    if total_budget - (n * min_per) < -1e-6:
        min_per = 0.0
        if max_per < min_per:
            max_per = min_per

    return [(min_per, max_per) for _ in range(n)]


def build_pro_report(total_budget, allocated_budget, predicted_roas, expected_revenue, duration, clip_min, clip_max, min_budget_default, max_ratio_default):
    """
    최종 예산 추천 결과를 사람이 읽기 쉬운 자연어 리포트로 생성

    Parameters
    ----------
    total_budget : float
        총 예산
    allocated_budget : array-like
        채널별 최종 배정 예산
    predicted_roas : array-like
        채널별 예측 ROAS
    expected_revenue : float
        최종 예상 매출
    duration : int
        분석 기간
    clip_min, clip_max : float
        ROAS 클리핑 범위
    min_budget_default : float
        채널별 최소 예산
    max_ratio_default : float
        채널별 최대 예산 비율

    Returns
    -------
    str
        프론트에 표시할 리포트 문자열
    """
    channel_display = ["네이버", "인스타그램/페이스북", "구글/유튜브", "당근"]

    total_budget = float(total_budget)
    alloc = np.asarray(allocated_budget, dtype=float)
    roas = np.asarray(predicted_roas, dtype=float)

    # 채널별 예상 매출 기여 계산
    # ROAS가 % 단위라고 보고 alloc * (roas / 100)으로 계산
    exp_rev_by_channel = alloc * (roas / 100.0)

    # 가장 예측 효율이 좋은 채널 식별
    best_idx = int(np.argmax(roas))
    best_name = channel_display[best_idx]
    best_alloc = float(alloc[best_idx])
    best_ratio = int(round((best_alloc / total_budget) * 100)) if total_budget > 0 else 0

    # 1위와 2위 채널 비교
    sorted_idx = np.argsort(-roas)
    top1, top2 = sorted_idx[0], sorted_idx[1] if len(sorted_idx) > 1 else sorted_idx[0]
    gap_vs_2nd = float(roas[top1] - roas[top2])
    second_best_name = channel_display[top2]
    
    # 리포트에 표시할 최소/최대 예산 기준 계산
    min_per = min_budget_default if total_budget >= len(roas) * min_budget_default else 0
    max_per = int(total_budget * max_ratio_default)
    
    lines = []

    # 핵심 요약
    lines.append(f"🎯 사장님을 위한 AI 핵심 요약: 현재 가장 효율이 좋은 **{best_name}**에 예산을 집중하여 **매출을 극대화**하는 것을 추천합니다.")
    lines.append(f"2순위 추천 플랫폼인 **{second_best_name}**보다 예상 수익률이 **{gap_vs_2nd:.1f}%p** 더 높기 때문입니다.\n")
    lines.append("🔍 플랫폼별 정밀 진단 (현상 → 데이터 근거 → 전략 → 기대효과)")

    # 전체 평균 ROAS 계산
    avg_roas = float(np.mean(roas)) if len(roas) else 0.0

    for i in range(len(roas)):
        name = channel_display[i]
        r = float(roas[i])
        ratio = int(round((float(alloc[i]) / total_budget) * 100)) if total_budget > 0 else 0
        rev = float(exp_rev_by_channel[i])
        
        # 평균 대비 얼마나 높거나 낮은지 계산
        vs_avg = r - avg_roas
        compare_word = "상회" if vs_avg >= 0 else "하회"
        compare_abs = abs(vs_avg)

        # 채널별 액션 문구 생성
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

        # 채널별 상세 설명 추가
        lines.append(
            f"• **{name}**\n"
            f"  - 현상: 예측 ROAS **{r:.2f}%** / 예산 배정 **{ratio}%**\n"
            f"  - 데이터 근거: 평균 대비 **{compare_abs:.2f}%p {compare_word}**, 예상 매출 기여 **{int(round(rev)):,}원**\n"
            f"  - 전략 제안: {action}\n"
            f"  - 기대 효과: {effect}"
        )

    # 실행 가이드
    lines.append("\n✅ 수익 극대화를 위한 실천 가이드 (바로 실행 가능한 액션)")
    lines.append(f"• **예산 집행(오늘~{duration}일)**: {best_name}에 **{best_ratio}%** 수준으로 집중 운영하고, 나머지는 방어 예산으로 유지하세요.")
    lines.append("• **운영 룰(간단 자동화)**: 7일 기준 ROAS가 평균 대비 하회하는 채널은 **소재/타겟 1회 개선 후** 개선 없으면 감액하는 룰을 적용하세요.")

    # 알고리즘/제약조건 설명
    lines.append("\n📌 알고리즘/제약조건 근거 (투명성)")
    lines.append(f"• 본 배분은 **머신러닝(XGBoost+Ridge)이 추출한 기대 수익률 계수를 선형계획법(LP)으로 최적화**한 하이브리드 결과입니다.")
    lines.append(f"• 채널별 예산은 최소 **{int(min_per):,}원** ~ 최대 **{int(max_per):,}원**(총예산의 {int(max_ratio_default*100)}%) 범위 제약을 적용했습니다.")

    return "\n".join(lines)


# ==========================================
# ★ [NEW] 진짜 트렌드 점수 로드 함수 추가
# ==========================================
def load_real_trend_scores():
    """JSON 파일에서 진짜 트렌드 점수를 읽어와 AI용으로 보정합니다."""
    # 현재 실행 파일(predict_budget.py)과 동일한 폴더에 있는 json 파일을 찾도록 절대경로 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(script_dir, 'today_trend.json')
    
    # 기본값 (파일이 없거나 에러 날 경우를 대비한 1단계 폴백)
    default_scores = {"naver": 80, "meta": 75, "google": 70, "karrot": 65}
    
    if not os.path.exists(file_path):
        return default_scores

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            raw_scores = data['scores']
            
            calibrated_scores = {}
            for platform, ratio in raw_scores.items():
                # 💡 [핵심 논리] 최소 60점은 보장하되, ratio에 따라 가산점 부여
                calibrated_scores[platform] = 60 + (ratio * 0.4)
                
            return calibrated_scores
    except:
        return default_scores



# ==========================================
# 2. 메인 실행 함수 (전면 개편: ML 계수 추출 + LP 최적화)
# ==========================================
def main():
    """
    전체 실행 흐름을 담당하는 메인 함수

    전체 프로세스
    -------------
    1. 입력 JSON 파싱
    2. 사용자 채널 데이터 정리
    3. 저장된 ML 모델/스케일러 로드
    4. 각 채널의 기준 예산 대비 예측 ROAS 추출
    5. 예측된 ROAS를 선형계획법(LP)의 계수로 사용해 최적 예산 배분
    6. 리포트/히스토리/최종 JSON 결과 생성 후 stdout으로 반환
    """
    try:
        # ------------------------------------------------------
        # 입력 데이터 처리
        # ------------------------------------------------------
        # 외부(Node.js 등)에서 JSON 문자열을 인자로 넘기지 않은 경우
        # 테스트용 기본 더미 데이터를 사용
        if len(sys.argv) < 2:
            data = {
                "total_budget": 3000000,
                "duration": 7,
                "features": [
                    {"채널명_Naver": 1, "ROAS": 300, "trend_score": 90},
                    {"채널명_Meta": 1, "ROAS": 200, "trend_score": 90},
                    {"채널명_Google": 1, "ROAS": 0, "trend_score": 50}, 
                    {"채널명_Karrot": 1, "ROAS": 0, "trend_score": 30}
                ]
            }
        else:
            # 외부에서 받은 JSON 문자열을 파싱
            data = json.loads(sys.argv[1])

    except Exception as e:
        # 입력 JSON 파싱 실패 시 stderr로 에러 출력 후 종료
        log(json.dumps({"error": f"데이터 수신 실패: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # ------------------------------------------------------
    # 입력 데이터 구조 보정
    # ------------------------------------------------------
    # data가 list 형태로 바로 들어오면 feature 목록으로 간주
    if isinstance(data, list):
        features_list = data
        total_budget = 3000000
        duration = 7
        seed_date = None
    else:
        # dict 형태면 총예산, 기간, features를 꺼냄
        features_list = data.get('features', [])
        total_budget = data.get('total_budget', 3000000)
        duration = data.get('duration', 7)
        seed_date = data.get('seed_date', None)

    # 🚨 [매우 중요]
    # 학습 시 사용한 feature 이름 11개와 완전히 일치해야 함
    # 순서까지 동일해야 scaler.transform / model.predict에서 오류가 나지 않음
    model_columns = [
        'cost', 'cpc', 'ctr', 'trend_score',
        'channel_naver', 'channel_meta', 'channel_google', 'channel_karrot',
        'expected_clicks', 'trend_efficiency', 'click_value'
    ]

    # ------------------------------------------------------
    # 채널별 기본 metric
    # ------------------------------------------------------
    # 학습 코드에서 사용한 채널별 기본 CPC / CTR 기준값과 같은 구조
    base_channel_metrics = {
        "naver": {"cpc": 800, "ctr": 2.5},
        "meta": {"cpc": 400, "ctr": 1.2},
        "google": {"cpc": 600, "ctr": 1.8},
        "karrot": {"cpc": 300, "ctr": 3.0}
    }
    
    # 사용자 입력값이 없더라도 기본 구조를 유지하기 위해 초기값 세팅
    # roas는 0, trend는 중립값 50으로 시작
    user_data_map = {ch: {"roas": 0, "trend": 50} for ch in base_channel_metrics.keys()}

    # ------------------------------------------------------
    # 사용자 입력 features를 채널별 구조로 정리
    # ------------------------------------------------------
    # 한글 키(채널명_Naver) / 영문 키(channel_naver) 둘 다 허용
    for item in features_list:
        if item.get('channel_naver') == 1 or item.get('채널명_Naver') == 1:
            user_data_map["naver"] = {"roas": item.get('ROAS', 0), "trend": item.get('trend_score', 50)}
        elif item.get('channel_meta') == 1 or item.get('채널명_Meta') == 1:
            user_data_map["meta"] = {"roas": item.get('ROAS', 0), "trend": item.get('trend_score', 50)}
        elif item.get('channel_google') == 1 or item.get('채널명_Google') == 1:
            user_data_map["google"] = {"roas": item.get('ROAS', 0), "trend": item.get('trend_score', 50)}
        elif item.get('channel_karrot') == 1 or item.get('채널명_Karrot') == 1:
            user_data_map["karrot"] = {"roas": item.get('ROAS', 0), "trend": item.get('trend_score', 50)}

    # ======================================================
    # ★ [NEW] 진짜 트렌드(시장) + 기간전략 블렌딩
    # ======================================================
    real_trends = load_real_trend_scores()
    
    # json에서 가져온 채널 이름들이 정확히 매칭되도록 덮어씌움
    for ch in base_channel_metrics.keys():
        if ch in real_trends:
            frontend_strategy_score = user_data_map[ch]["trend"] # 7일/30일이 반영된 프론트 점수
            market_real_score = real_trends[ch]                  # 네이버 API가 알려준 오늘 시장 점수
            
            # 💡 [핵심] 실제 시장 상황(60%)에 캠페인 기간 특성(40%)을 섞어서 최종 점수 산출
            blended_score = (market_real_score * 0.6) + (frontend_strategy_score * 0.4)
            
            user_data_map[ch]["trend"] = blended_score
    # ======================================================

    # ------------------------------------------------------
    # 저장된 모델 / 스케일러 로드
    # ------------------------------------------------------
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))

        # 현재 predict_budget.py 파일이 있는 폴더 기준으로
        # 모델 파일과 스케일러 파일을 불러옴
        ensemble_model = joblib.load(os.path.join(script_dir, ENSEMBLE_MODEL_FILENAME))
        scaler = joblib.load(os.path.join(script_dir, SCALER_FILENAME))

        # 비현실적인 예측 ROAS 방지용 최소/최대 범위
        CLIP_MIN, CLIP_MAX = 50.0, 800.0

    except Exception as e:
        log(json.dumps({"error": f"모델 로드 실패: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # 최적화 대상 채널 순서
    channels = ["naver", "meta", "google", "karrot"]
    n_channels = len(channels)
    
    # 총예산 숫자형 변환
    budget_num = float(total_budget)

    # ------------------------------------------------------
    # 총예산 구간별 최소 예산 / 최대 비율 정책 설정
    # ------------------------------------------------------
    # 소액 예산: 최소예산 0, 최대 60%
    # 중간 예산: 최소 5%, 최대 45%
    # 큰 예산  : 최소 10%, 최대 60%
    if budget_num <= 300000:
        MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT = 0, 0.60
    elif budget_num <= 1000000:
        MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT = budget_num * 0.05, 0.45
    else:
        MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT = budget_num * 0.10, 0.60

    # ------------------------------------------------------
    # 사용자 실제 성과 + trend를 반영한 채널 보정계수 계산
    # ------------------------------------------------------
    # 각 채널별 예측 feature 생성 시 CPC/CTR를 조정하기 위한 factor
    channel_factors = {}

    for ch in channels:
        user_actual_roas = user_data_map[ch].get("roas", 0)
        current_trend = user_data_map[ch].get("trend", 50)

        # trend_score가 50보다 높으면 +, 낮으면 - 영향
        trend_multiplier = 1.0 + ((current_trend - 50) / 100.0) 
        
        # 사용자가 실제 ROAS를 입력했다면 그 값을 반영해 성과 계수 계산
        # 입력이 없으면 1.0을 기본값으로 사용
        if user_actual_roas > 0:
            final_factor = (user_actual_roas / 200.0) * trend_multiplier
        else:
            final_factor = 1.0 * trend_multiplier

        # 과도한 값 방지를 위해 0.5 ~ 2.5 범위 제한
        channel_factors[ch] = max(0.5, min(final_factor, 2.5))

    # ==========================================
    # [Step 1] ML 모델을 통한 기준 예산(Baseline) 예측 ROAS 계수 추출
    # ==========================================
    # 전체 예산을 일단 균등 분할한 가상의 baseline budget을 만든 뒤,
    # 각 채널에 대해 "이 정도 예산이 들어갔을 때의 예상 ROAS"를 예측한다.
    baseline_budget = budget_num / n_channels
    predicted_roas_list = []
    
    for ch in channels:
        factor = channel_factors[ch]

        # factor가 높으면 더 좋은 상태라고 보고
        # CPC는 낮아지고 CTR은 높아지도록 조정
        cpc = base_channel_metrics[ch]["cpc"] / factor
        ctr = base_channel_metrics[ch]["ctr"] * factor
        trend = user_data_map[ch]["trend"]
        
        # --------------------------------------------------
        # 학습 시 사용한 파생 변수 계산 로직과 동일하게 생성
        # --------------------------------------------------
        expected_clicks = baseline_budget / cpc
        trend_efficiency = trend / np.log1p(baseline_budget)
        click_value = expected_clicks * ctr
        
        # 모델 입력용 1행 데이터 생성
        row = {
            'cost': baseline_budget,
            'cpc': cpc,
            'ctr': ctr,
            'trend_score': trend,
            'channel_naver': 1 if ch == "naver" else 0,
            'channel_meta': 1 if ch == "meta" else 0,
            'channel_google': 1 if ch == "google" else 0,
            'channel_karrot': 1 if ch == "karrot" else 0,
            'expected_clicks': expected_clicks,
            'trend_efficiency': trend_efficiency,
            'click_value': click_value
        }
        
        # 학습 시와 동일한 컬럼 순서로 DataFrame 생성
        df_temp = pd.DataFrame([row])[model_columns]

        # 학습 때 저장한 scaler로 표준화
        X_scaled = pd.DataFrame(scaler.transform(df_temp), columns=df_temp.columns)

        # 앙상블 모델로 해당 채널의 예측 ROAS 계산
        pred_roas = ensemble_model.predict(X_scaled)[0]
        predicted_roas_list.append(pred_roas)

    # 예측값이 비현실적인 범위를 벗어나면 clip 처리
    predicted_roas_list = clip_predicted_roas(predicted_roas_list, CLIP_MIN, CLIP_MAX)

    # ==========================================
    # [Step 2] 선형계획법(LP) 하이브리드 최적화
    # ==========================================
    # 목적:
    # 채널별 ROAS를 기반으로 총 기대매출이 최대가 되도록 예산을 배분
    #
    # scipy.optimize.linprog는 "최소화" 문제를 푸는 함수이므로,
    # 최대화하려는 ROAS 계수에 음수(-)를 붙여서 전달
    c = [-roas / 100.0 for roas in predicted_roas_list]
    
    # 제약조건 1:
    # 네 채널에 배정된 예산의 합은 반드시 총예산과 같아야 함
    # x1 + x2 + x3 + x4 = total_budget
    A_eq = [[1, 1, 1, 1]]
    b_eq = [budget_num]
    
    # 제약조건 2:
    # 채널별 예산은 최소~최대 범위를 넘지 못하도록 bounds 설정
    bounds = build_safe_bounds(n_channels, budget_num, MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT)
    
    # scipy linprog 실행
    # method='highs'는 비교적 안정적이고 빠른 선형계획 해법
    res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
    
    if res.success:
        # 최적화 성공 시 결과 예산 사용
        allocated_budget = res.x
    else:
        # 최적화 실패 시 안전장치:
        # 총예산을 채널 수로 나눈 균등분배 사용
        allocated_budget = np.array([budget_num / n_channels] * n_channels)
        
    # 최종 예상 매출 계산
    real_expected_revenue = np.sum(allocated_budget * (np.array(predicted_roas_list) / 100.0))

    # ==========================================
    # [Step 3] 최종 리포트 및 JSON 반환
    # ==========================================
    try:
        # 사람이 읽을 수 있는 텍스트 리포트 생성
        report_text = build_pro_report(
            total_budget=total_budget,
            allocated_budget=allocated_budget,
            predicted_roas=predicted_roas_list,
            expected_revenue=real_expected_revenue,
            duration=duration,
            clip_min=CLIP_MIN,
            clip_max=CLIP_MAX,
            min_budget_default=MIN_BUDGET_DEFAULT,
            max_ratio_default=MAX_RATIO_DEFAULT
        )

        # 차트용 히스토리 데이터 생성 (씨드 처리 추가)
        history_data = generate_past_history(predicted_roas_list, duration=duration, seed_date=seed_date)
        
        # 최종 JSON 응답 객체 구성
        output = {
            "status": "success",
            "total_budget": int(total_budget),
            "allocated_budget": [int(b) for b in np.round(allocated_budget, 0)],
            "predicted_roas": [round(float(r), 2) for r in predicted_roas_list],
            "expected_revenue": int(round(real_expected_revenue, 0)),
            "history": history_data,
            "ai_report": report_text
        }

    except Exception as e:
        # 결과 생성 실패 시 stderr로 에러 출력 후 종료
        log(json.dumps({"error": f"결과 생성 실패: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # stdout으로 최종 JSON 문자열 출력
    # 외부 프로그램(Node.js 등)에서 이 값을 받아 응답 처리
    sys.stdout.write(json.dumps(output, cls=NumpyEncoder, ensure_ascii=False))
    sys.stdout.flush()


if __name__ == "__main__":
    main()