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
    # 예: duration이 7이면 -> 6일 전, 5일 전 ... 1일 전
    for i in range(duration - 1, 0, -1):
        day_label = f"{i}일 전"
        
        # 트렌드 시뮬레이션: 과거로 갈수록 수치를 조금씩 낮춰서 '성장하는 그래프' 연출
        # (i가 클수록 과거이므로 값을 작게 만듦)
        trend_factor = 1.0 - (i * 0.015) 
        if trend_factor < 0.6: trend_factor = 0.6 # 너무 낮아지지 않게 방어

        row = {"day": day_label}
        
        # 채널별 데이터 생성 (약간의 랜덤 변동성 추가)
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
    
    return history

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
                "duration": 7,  # 테스트용 기본 기간
                "features": [
                    {"채널명_Naver": 1, "비용": 100000, "ROAS": 300},
                    {"채널명_Meta": 1, "비용": 100000, "ROAS": 200},
                    {"채널명_Google": 1, "비용": 100000, "ROAS": 250},
                    {"채널명_Karrot": 1, "비용": 50000, "ROAS": 150}
                ]
            }
        else:
            # 실전 모드 (Node.js에서 받음)
            input_data = sys.argv[1]
            data = json.loads(input_data)
            
    except Exception as e:
        print(json.dumps({"error": f"데이터 수신 실패: {str(e)}"}))
        sys.exit(1)

    # [수정] 변수 추출 (리스트/객체 모두 대응하는 안전한 코드)
    if isinstance(data, list):
        # 만약 데이터가 옛날 방식(리스트)으로 오면 -> 그대로 사용
        features_list = data
        total_budget = 500000 
        duration = 7
    else:
        # 새로운 방식(객체)으로 오면 -> 키 값으로 꺼내기
        features_list = data.get('features', [])
        total_budget = data.get('total_budget', 500000)
        duration = data.get('duration', 7)

    # [데이터 가공]
    model_columns = [
        '비용', 'CPC', 'CTR', 'ROAS_3d_trend', 
        'day_of_week', 'is_weekend', 
        'trend_score',  # ★ 여기가 핵심입니다! 이 줄이 꼭 있어야 함
        '채널명_Naver', '채널명_Meta', '채널명_Google', '채널명_Karrot'
    ]
    
    processed_data = []
    today = datetime.now().weekday()
    is_weekend = 1 if today >= 5 else 0

    for item in features_list:
        cost = item.get('비용', 100000)
        current_roas = item.get('ROAS', 200)
        
        # ★ React에서 보내준 'trend_score' 받기 (없으면 기본값 50)
        trend_score = item.get('trend_score', 50)
        
        # 보조 지표 추정
        ctr = 1.5 + (current_roas / 1000)
        cpc = 500
        roas_3d = current_roas * 1.02
        
        row = {
            '비용': cost,
            'CPC': cpc,
            'CTR': ctr,
            'ROAS_3d_trend': roas_3d,
            'day_of_week': today,
            'is_weekend': is_weekend,
            'trend_score': trend_score,
            '채널명_Naver': item.get('채널명_Naver', 0),
            '채널명_Meta': item.get('채널명_Meta', 0),
            '채널명_Google': item.get('채널명_Google', 0),
            '채널명_Karrot': item.get('채널명_Karrot', 0)
        }
        processed_data.append(row)

    df = pd.DataFrame(processed_data)
    
    # 컬럼 순서 강제 맞춤 (모델 학습때와 동일하게)
    # 만약 데이터가 비어있다면 에러 처리
    if df.empty:
        print(json.dumps({"error": "분석할 데이터가 없습니다."}))
        sys.exit(1)
        
    X = df[model_columns]

    # [AI 모델 로드 및 예측]
    try:
        model = xgb.XGBRegressor()
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'optimal_budget_xgb_model.json')
        
        model.load_model(model_path)
        predicted_roas = model.predict(X)
        
    except Exception as e:
        print(json.dumps({"error": f"모델 로드/예측 실패: {str(e)}"}))
        sys.exit(1)

    # [선형 계획법 - 예산 최적화]
    try:
        c = [-float(r) for r in predicted_roas]
        A_eq = [[1] * len(predicted_roas)]
        b_eq = [total_budget]
        bounds = [(30000, total_budget * 0.6) for _ in range(len(predicted_roas))]
        
        result = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

        if result.success:
            allocated_budget = result.x
            real_expected_revenue = np.sum(allocated_budget * (predicted_roas / 100))
            
            # 리포트 생성
            channel_names = ['네이버', '메타', '구글', '당근']
            best_idx = np.argmax(predicted_roas)
            best_channel = channel_names[best_idx]
            
            # 한국어 이름 매핑
            channel_names_kr = {'네이버': '네이버', '메타': '인스타그램', '구글': '구글/유튜브', '당근': '당근마켓'}
            best_channel_kr = channel_names_kr.get(best_channel, best_channel)
            
            best_ratio = int(allocated_budget[best_idx] / total_budget * 100)
            
            report_text = (
                f"📢 **사장님을 위한 오늘의 마케팅 핵심 요약**\n"
                f"지금 우리 가게에 딱 맞는 곳은 **'{best_channel_kr}'**입니다! 여기에 집중하세요.\n\n"
                f"✅ **AI가 제안하는 3가지 실천 가이드**\n"
                f"• **예산 집중**: 전체 예산의 **{best_ratio}%**를 **{best_channel_kr}**에 투자하세요. 지금 손님들 반응이 가장 뜨겁습니다.\n"
                f"• **효율 관리**: 예상 수익률이 **{predicted_roas[best_idx]:.0f}%**까지 오를 것으로 보입니다. 물 들어올 때 노 저으세요!\n"
                f"• **리스크 방어**: 효율이 다소 낮은 채널은 예산을 줄여서 낭비를 막았습니다."
            )

            # ★ [수정] 함수 호출로 변경 (duration 적용)
            history_data = generate_past_history(predicted_roas, duration=duration)

            output = {
                "status": "success",
                "total_budget": total_budget,
                "allocated_budget": [int(b) for b in np.round(allocated_budget, 0)],
                "predicted_roas": [round(float(r), 2) for r in predicted_roas],     
                "expected_revenue": int(round(real_expected_revenue, 0)),
                "history": history_data, # 동적 생성된 히스토리
                "ai_report": report_text
            }
        else:
            output = {"status": "failed", "reason": "최적화 실패"}
            
    except Exception as e:
        print(json.dumps({"error": f"최적화 계산 실패: {str(e)}"}))
        sys.exit(1)

    print(json.dumps(output, cls=NumpyEncoder, ensure_ascii=False))

if __name__ == "__main__":
    main()