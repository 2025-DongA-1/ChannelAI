import os
import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.optimize import linprog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# ==========================================
# 1. FastAPI 앱 초기화 및 CORS 설정 (리액트와 통신 허용)
# ==========================================
app = FastAPI(title="AI Marketing Budget Optimizer")

# 리액트(프론트엔드)에서 오는 요청을 막지 않도록 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실전에서는 ["http://localhost:3000"] 등으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. 전역 변수: AI 모델을 서버 켤 때 '딱 한 번만' 메모리에 로드 (🚀 속도의 핵심)
# ==========================================
model = xgb.Booster()
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, 'optimal_budget_xgb_model.json')

try:
    model.load_model(model_path)
    print("✅ XGBoost 모델 메모리 로드 완료!")
except Exception as e:
    print(f"❌ 모델 로드 실패: {e}")

# ==========================================
# 3. 데이터 검증 모델 (Pydantic)
# ==========================================
class FeatureItem(BaseModel):
    채널명_Naver: Optional[int] = 0
    채널명_Meta: Optional[int] = 0
    채널명_Google: Optional[int] = 0
    채널명_Karrot: Optional[int] = 0
    channel_naver: Optional[int] = 0
    channel_meta: Optional[int] = 0
    channel_google: Optional[int] = 0
    channel_karrot: Optional[int] = 0
    비용: float
    ROAS: float
    trend_score: float

class RecommendRequest(BaseModel):
    total_budget: float
    features: List[FeatureItem]
    duration: int = 7

# ==========================================
# 4. 핵심 비즈니스 로직 함수들 (어제 완성본 그대로)
# ==========================================
def generate_past_history(predicted_roas, duration=7):
    history = []
    volatility = [np.random.uniform(0.85, 1.15) for _ in range(4)]
    
    for step in range(1, duration + 1):
        day_label = f"{step}일차"
        daily_noise = np.random.uniform(0.92, 1.08)
        row = {"day": day_label}
        row["Naver"] = round(float(predicted_roas[0] * volatility[0] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Meta"] = round(float(predicted_roas[1] * volatility[1] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Google"] = round(float(predicted_roas[2] * volatility[2] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        row["Karrot"] = round(float(predicted_roas[3] * volatility[3] * daily_noise * np.random.uniform(0.95, 1.05)), 2)
        history.append(row)
    return history

def clip_predicted_roas(pred, min_roas=50.0, max_roas=800.0):
    pred = np.asarray(pred, dtype=float)
    return np.clip(pred, min_roas, max_roas)

def build_safe_bounds(n, total_budget, min_budget_default=30000, max_ratio_default=0.6):
    total_budget = float(total_budget)
    if n <= 0: return []
    min_per = float(min_budget_default)
    if total_budget < n * min_per: min_per = 0.0
    max_per = float(total_budget * max_ratio_default)
    if max_per < min_per: max_per = min_per
    if total_budget - (n * min_per) < -1e-6:
        min_per = 0.0
        if max_per < min_per: max_per = min_per
    return [(min_per, max_per) for _ in range(n)]

def build_pro_report(total_budget, allocated_budget, predicted_roas, expected_revenue, duration, clip_min, clip_max, min_budget_default, max_ratio_default):
    channel_display = ["네이버", "인스타그램/페이스북", "구글/유튜브", "당근마켓"]
    total_budget = float(total_budget)
    alloc = np.asarray(allocated_budget, dtype=float)
    roas = np.asarray(predicted_roas, dtype=float)
    exp_rev_by_channel = alloc * (roas / 100.0)

    best_idx = int(np.argmax(roas))
    best_name = channel_display[best_idx]
    best_ratio = int(round((float(alloc[best_idx]) / total_budget) * 100)) if total_budget > 0 else 0

    sorted_idx = np.argsort(-roas)
    top1, top2 = sorted_idx[0], sorted_idx[1] if len(sorted_idx) > 1 else sorted_idx[0]
    gap_vs_2nd = float(roas[top1] - roas[top2])
    second_best_name = channel_display[top2]

    min_per = min_budget_default if total_budget >= len(roas) * min_budget_default else 0
    max_per = int(total_budget * max_ratio_default)
    avg_roas = float(np.mean(roas)) if len(roas) else 0.0

    lines = []
    # ✅ 대제목과 내용의 완벽한 분리 (괄호 제거, 어조 강화)
    lines.append(f"🎯 사장님을 위한 AI 핵심 요약: 현재 가장 효율이 좋은 **{best_name}**에 예산을 집중하여 **매출을 극대화**하는 것을 추천합니다.")
    lines.append(f"2순위 추천 매체인 **{second_best_name}**보다 예상 수익률이 **{gap_vs_2nd:.1f}%p** 더 높기 때문입니다.")
    lines.append("")
    lines.append("🔍 매체별 정밀 진단 (현상 → 데이터 근거 → 전략 → 기대효과)")

    for i in range(len(roas)):
        name, r, b = channel_display[i], float(roas[i]), float(alloc[i])
        ratio = int(round((b / total_budget) * 100)) if total_budget > 0 else 0
        rev = float(exp_rev_by_channel[i])
        vs_avg = r - avg_roas
        compare_word, compare_abs = ("상회" if vs_avg >= 0 else "하회"), abs(vs_avg)

        if i == best_idx:
            action = f"**집중 투자 유지**(상한 {int(max_ratio_default*100)}% 범위 내) + 고효율 구간 확장"
            effect = f"동일 예산 대비 **예상 매출 기여**가 가장 큼(추정 {int(round(rev)):,}원)."
        else:
            if ratio <= 10:
                action, effect = "**테스트 예산 유지**(소액) + 소재/타겟 개선 후 재평가", "낭비 리스크를 줄이면서 개선 여지를 탐색."
            elif ratio <= 30:
                action, effect = "**균형 운영** + ROAS 하락 시 자동 감액 기준 설정", "성과 변동에 대응하며 안정적으로 운영."
            else:
                action, effect = "**부분 감액 고려** + 고효율 채널로 일부 이동", "예상 수익률을 끌어올리는 방향으로 재배분."

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
    return "\n".join(lines)


# ==========================================
# 5. API 엔드포인트 (리액트가 호출할 주소)
# ==========================================
@app.post("/api/v1/ai/recommend")
async def recommend_budget_api(request: RecommendRequest):
    try:
        model_columns = ['비용', 'CPC', 'CTR', 'ROAS_3d_trend', 'trend_score', 'channel_naver', 'channel_meta', 'channel_google', 'channel_karrot']
        processed_data = []

        # 프론트에서 넘어온 데이터 파싱
        for item in request.features:
            cost = float(request.total_budget) / 4.0
            current_roas = item.ROAS if item.ROAS else 200.0
            ctr = 1.5 + (current_roas / 1000.0)
            
            row = {
                '비용': cost,
                'CPC': 500.0,
                'CTR': ctr,
                'ROAS_3d_trend': current_roas * 1.02,
                'trend_score': item.trend_score,
                'channel_naver': int(item.channel_naver or item.채널명_Naver),
                'channel_meta': int(item.channel_meta or item.채널명_Meta),
                'channel_google': int(item.channel_google or item.채널명_Google),
                'channel_karrot': int(item.channel_karrot or item.채널명_Karrot),
            }
            processed_data.append(row)

        df = pd.DataFrame(processed_data)
        if df.empty:
            raise HTTPException(status_code=400, detail="분석할 데이터가 없습니다.")

        X = df[model_columns]
        dtest = xgb.DMatrix(X.values, feature_names=model_columns)
        
        # 🚀 여기서 속도 차이가 납니다! 이미 로드된 모델로 즉시 예측
        predicted_roas = model.predict(dtest)
        
        CLIP_MIN, CLIP_MAX = 50.0, 800.0
        predicted_roas = clip_predicted_roas(predicted_roas, min_roas=CLIP_MIN, max_roas=CLIP_MAX)

        # 예산 최적화 (선형 계획법)
        n = len(predicted_roas)
        c = [-float(r) for r in predicted_roas]
        A_eq = [[1] * n]
        b_eq = [float(request.total_budget)]

        budget_num = float(request.total_budget)
        if budget_num <= 300000:
            MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT = 0, 0.60
        elif budget_num <= 1000000:
            MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT = budget_num * 0.05, 0.45
        else:
            MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT = budget_num * 0.15, 0.35

        bounds = build_safe_bounds(n, request.total_budget, min_budget_default=MIN_BUDGET_DEFAULT, max_ratio_default=MAX_RATIO_DEFAULT)
        result = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

        if not result.success:
            raise HTTPException(status_code=500, detail="최적화 엔진 계산 실패")

        allocated_budget = result.x
        real_expected_revenue = np.sum(allocated_budget * (predicted_roas / 100.0))

        report_text = build_pro_report(request.total_budget, allocated_budget, predicted_roas, real_expected_revenue, request.duration, CLIP_MIN, CLIP_MAX, MIN_BUDGET_DEFAULT, MAX_RATIO_DEFAULT)
        history_data = generate_past_history(predicted_roas, duration=request.duration)

        # JSON 응답 조립 (FastAPI가 알아서 예쁘게 변환해 줌)
        return {
            "status": "success",
            "total_budget": int(request.total_budget),
            "allocated_budget": [int(b) for b in np.round(allocated_budget, 0)],
            "predicted_roas": [round(float(r), 2) for r in predicted_roas],
            "expected_revenue": int(round(real_expected_revenue, 0)),
            "history": history_data,
            "ai_report": report_text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))