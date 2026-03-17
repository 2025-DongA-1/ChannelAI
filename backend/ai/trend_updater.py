import urllib.request
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# ==========================================
# 1. 경로 설정 및 .env 로드
# ==========================================
current_file = os.path.abspath(__file__)

backend_dir = os.path.dirname(os.path.dirname(current_file))
env_path = os.path.join(backend_dir, '.env')

print(f"🔍 디버깅: .env 파일을 찾는 경로 -> {env_path}")
print(f"🔍 디버깅: 파일이 실제로 존재합니까? -> {os.path.exists(env_path)}")

load_success = load_dotenv(env_path)
print(f"🔍 디버깅: .env 로드 성공 여부 -> {load_success}")

# ==========================================
# 2. API 키 가져오기 (데이터랩 전용 변수명 사용)
# ==========================================
CLIENT_ID = os.getenv("NAVER_DATALAB_CLIENT_ID", "").strip()
CLIENT_SECRET = os.getenv("NAVER_DATALAB_CLIENT_SECRET", "").strip()

if not CLIENT_ID or not CLIENT_SECRET:
    print("🚨 [위험] API 키가 비어있습니다! .env 파일 내용이나 경로를 확인하세요.")
else:
    print(f"✅ API 키 로드 완료 (ID 앞글자: {CLIENT_ID[:5]}...)")


# ==========================================
# 3. 데이터랩 API 호출 및 JSON 저장 함수
# ==========================================
def get_naver_trend_score():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("🚨 실행 취소: 유효한 API 키가 없습니다.")
        return False

    url = "https://openapi.naver.com/v1/datalab/search"
    
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    body = {
        "startDate": start_date,
        "endDate": end_date,
        "timeUnit": "date",
        "keywordGroups": [
            {"groupName": "naver", "keywords": ["네이버쇼핑", "네이버광고"]},
            {"groupName": "meta", "keywords": ["인스타그램", "페이스북광고"]},
            {"groupName": "google", "keywords": ["유튜브", "구글광고"]},
            {"groupName": "karrot", "keywords": ["당근마켓", "동네업체"]}
        ]
    }

    request = urllib.request.Request(url)
    request.add_header("X-Naver-Client-Id", CLIENT_ID)
    request.add_header("X-Naver-Client-Secret", CLIENT_SECRET)
    request.add_header("Content-Type", "application/json")

    try:
        response = urllib.request.urlopen(request, data=json.dumps(body).encode("utf-8"))
        res_data = json.loads(response.read().decode('utf-8'))
        
        trend_results = {}
        for result in res_data['results']:
            platform_name = result['title']
            latest_ratio = result['data'][-1]['ratio'] 
            trend_results[platform_name] = round(latest_ratio, 2)

        # 현재 실행 파일 위치에 정확히 저장되도록 절대 경로 사용
        script_dir = os.path.dirname(os.path.abspath(__file__))
        save_path = os.path.join(script_dir, 'today_trend.json')

        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump({
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "scores": trend_results
            }, f, indent=4, ensure_ascii=False)
            
        print(f"✅ 오늘자 트렌드 스코어가 '{save_path}'에 성공적으로 업데이트되었습니다!")
        return True

    except Exception as e:
        print(f"🚨 업데이트 실패: {e}")
        return False

# ==========================================
# 4. 🔥 여기가 핵심! (실제 함수를 실행하는 방아쇠)
# ==========================================
if __name__ == "__main__":
    print("🚀 네이버 데이터랩 API 호출을 시작합니다...")
    get_naver_trend_score()