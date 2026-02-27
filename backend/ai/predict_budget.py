import sys
import json
import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.optimize import linprog
import os
from datetime import datetime

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

    # 과거 (duration-1)일부터 1일 전까지 반복
    for i in range(duration - 1, 0, -1):
        day_label = f"{i}일 전"

        # 트렌드 시뮬레이션
        trend_factor = 1.0 - (i * 0.015)
        if trend_factor < 0.6:
            trend_factor = 0.6

        row = {"day": day_label}

        # predicted_roas 순서: [Naver, Meta, Google, Karrot]
        row["Naver"] = round(float(predicted_roas[0] * trend_factor * np.random.uniform(0.9, 1.1)), 2)
        row["Meta"] = round(float(predicted_roas[1] * trend_factor * np.random.uniform(0.9, 1.1)), 2)
        row["Google"] = round(float(predicted_roas[2] * trend_factor * np.random.uniform(0.9, 1.1)), 2)
        row["Karrot"] = round(float(predicted_roas[3] * trend_factor * np.random.uniform(0.9, 1.1)), 2)

        history.append(row)

    # 마지막으로 '오늘(예측)' 데이터 추가
    history.append({
        "day": "오늘(예측)",
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
    🔍 매체별 정밀 진단 (현상 → 데이터 근거 → 전략 → 기대효과)
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
        "당근": "당근마켓"
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
    lines = []
    lines.append(f"📢 Executive Summary: **{best_name}** 중심으로 예산을 재배치해 **예상 매출을 극대화**하는 전략이 최적입니다. (Top2 대비 ROAS 차이: **{gap_vs_2nd:.1f}%p**)")

    lines.append("")
    lines.append("🔍 매체별 정밀 진단 (현상 → 데이터 근거 → 전략 → 기대효과)")

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
        cost = item.get('비용', 100000)
        current_roas = item.get('ROAS', 200)

        # React에서 보내준 'trend_score' 받기 (없으면 기본값 50)
        trend_score = item.get('trend_score', 50)

        # 보조 지표 추정 (※ MVP 단계에서는 유지, 추후 DB 계산값으로 교체 권장)
        ctr = 1.5 + (float(current_roas) / 1000.0)
        cpc = 500
        roas_3d = float(current_roas) * 1.02

        # ✅ 채널 입력을 유연하게 받기:
        # 1) 기존: 채널명_Naver/Meta/Google/Karrot
        # 2) 신규: channel_naver/meta/google/karrot
        channel_naver = item.get('channel_naver', item.get('채널명_Naver', 0))
        channel_meta = item.get('channel_meta', item.get('채널명_Meta', 0))
        channel_google = item.get('channel_google', item.get('채널명_Google', 0))
        channel_karrot = item.get('channel_karrot', item.get('채널명_Karrot', 0))

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
    except Exception as e:
        log(json.dumps({
            "error": f"입력 컬럼이 모델과 맞지 않습니다: {str(e)}",
            "expected_columns": model_columns,
            "received_columns": list(df.columns)
        }, ensure_ascii=False))
        sys.exit(1)

    # [AI 모델 로드 및 예측]
    try:
        model = xgb.XGBRegressor()
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'optimal_budget_xgb_model.json')

        model.load_model(model_path)
        predicted_roas = model.predict(X)

        # ✅ 예측값 클리핑: 비현실 튐 방지
        CLIP_MIN = 50.0
        CLIP_MAX = 800.0
        predicted_roas = clip_predicted_roas(predicted_roas, min_roas=CLIP_MIN, max_roas=CLIP_MAX)

    except Exception as e:
        log(json.dumps({"error": f"모델 로드/예측 실패: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)

    # [선형 계획법 - 예산 최적화]
    try:
        n = len(predicted_roas)

        c = [-float(r) for r in predicted_roas]
        A_eq = [[1] * n]
        b_eq = [float(total_budget)]

        # ✅ 총예산에 따라 infeasible 방지용 bounds 자동 생성
        MIN_BUDGET_DEFAULT = 30000
        MAX_RATIO_DEFAULT = 0.6
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