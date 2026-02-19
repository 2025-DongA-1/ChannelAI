#!/usr/bin/env python3
"""
더미 광고 데이터 삽입 스크립트
엑셀 파일 '더미데이터 예시.xlsx'의 RAW 시트에서 데이터를 읽어
MySQL DB에 삽입합니다.
"""

import io
import pymysql
import pandas as pd
import msoffcrypto
from datetime import datetime, timedelta

# ============================================
# DB 연결 설정
# ============================================
DB_CONFIG = {
    'host': 'project-db-cgi.smhrd.com',
    'port': 3307,
    'user': 'cgi_25K_DA1_p3_1',
    'password': 'smhrd1',
    'database': 'cgi_25K_DA1_p3_1',
    'charset': 'utf8mb4',
}

EXCEL_FILE = r'C:\Users\smhrd\Desktop\channel_AI\더미데이터 예시.xlsx'
EXCEL_PASSWORD = '25802580'

# 플랫폼 매핑: 엑셀 한글명 -> DB channel_code
PLATFORM_MAP = {
    '카카오': 'kakao',
    '구글': 'google',
    '네이버': 'naver',
}


def decrypt_excel(filepath, password):
    """암호화된 엑셀 파일 복호화"""
    with open(filepath, 'rb') as f:
        office_file = msoffcrypto.OfficeFile(f)
        office_file.load_key(password=password)
        decrypted = io.BytesIO()
        office_file.decrypt(decrypted)
        decrypted.seek(0)
    return decrypted


def read_raw_sheet(decrypted_io):
    """RAW 시트 읽기 및 정제"""
    df = pd.read_excel(decrypted_io, sheet_name='RAW')
    
    # 컬럼명 확인 및 매핑
    print(f"RAW 시트 컬럼: {list(df.columns)}")
    print(f"RAW 시트 행 수: {len(df)}")
    print(f"\n처음 5행:\n{df.head()}")
    
    return df


def read_summary_sheet(decrypted_io):
    """Summary 시트에서 플랫폼별 예산 정보 읽기"""
    df = pd.read_excel(decrypted_io, sheet_name='Summary')
    print(f"\nSummary 시트 컬럼: {list(df.columns)}")
    print(f"Summary 시트 행 수: {len(df)}")
    return df


def parse_raw_data(df):
    """RAW 시트 데이터 파싱 및 정제"""
    # 컬럼 이름을 한글로 매핑 (첫 번째 행이 실제 헤더일 수 있음)
    # 실제 컬럼 내용 확인
    cols = list(df.columns)
    print(f"\n원본 컬럼명: {cols[:15]}")
    
    # 첫 행이 헤더 정보인지 확인
    first_row = df.iloc[0].tolist()
    print(f"첫 행: {first_row[:15]}")
    
    # 실제 데이터 컬럼 매핑 시도
    # RAW 시트 구조: 날짜, 월, 주야, 플랫폼, 캠페인그룹, 광고그룹, 크리에이티브, 비용, 노출, 클릭, 조회, 설치, 매출
    # 또는 컬럼명이 이미 올바르게 설정된 경우
    
    expected_cols = ['날짜', '월', '주야', '플랫폼', '캠페인그룹', '광고그룹', '크리에이티브', 
                     '비용', '노출', '클릭', '조회', '설치', '매출']
    
    # 컬럼명이 한글인지 확인
    has_korean_cols = any('날짜' in str(c) or '플랫폼' in str(c) for c in cols)
    
    if has_korean_cols:
        # 컬럼명이 이미 한글로 되어 있는 경우
        print("한글 컬럼명 감지됨")
        result = df.copy()
    else:
        # 첫 번째 행에서 실제 헤더를 찾아야 할 수 있음
        # 날짜가 있는 행을 찾아서 데이터 시작점 확인
        header_row = None
        for i in range(min(5, len(df))):
            row = df.iloc[i].tolist()
            row_str = [str(x) for x in row]
            if any('날짜' in s or '플랫폼' in s or 'Date' in s for s in row_str):
                header_row = i
                break
        
        if header_row is not None:
            # 해당 행을 헤더로 사용
            new_header = df.iloc[header_row].tolist()
            result = df.iloc[header_row + 1:].copy()
            result.columns = new_header[:len(result.columns)]
            result = result.reset_index(drop=True)
            print(f"헤더 행: {header_row}, 새 컬럼명: {list(result.columns)[:15]}")
        else:
            # 위치 기반 매핑 (RAW 시트는 보통 14개 컬럼)
            if len(cols) >= 13:
                col_mapping = {}
                for i, name in enumerate(expected_cols):
                    if i < len(cols):
                        col_mapping[cols[i]] = name
                result = df.rename(columns=col_mapping)
                print(f"위치 기반 매핑: {col_mapping}")
            else:
                result = df.copy()
    
    return result


def safe_float(val, default=0.0):
    """안전하게 float 변환"""
    try:
        if pd.isna(val) or val == '-' or val == '' or val is None:
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    """안전하게 int 변환"""
    try:
        if pd.isna(val) or val == '-' or val == '' or val is None:
            return default
        return int(float(val))
    except (ValueError, TypeError):
        return default


def parse_date(val):
    """엑셀 날짜 파싱 (serial number 또는 datetime)"""
    if pd.isna(val):
        return None
    
    if isinstance(val, (datetime, pd.Timestamp)):
        return val.date() if hasattr(val, 'date') else val
    
    try:
        # 엑셀 시리얼 넘버 (44571 = 2022-01-12)
        serial = int(float(val))
        if 40000 < serial < 50000:
            # Excel serial date to datetime
            base = datetime(1899, 12, 30)
            return (base + timedelta(days=serial)).date()
        else:
            return None
    except (ValueError, TypeError):
        pass
    
    # 문자열 날짜 파싱
    try:
        return pd.to_datetime(val).date()
    except:
        return None


def main():
    print("=" * 60)
    print("더미 광고 데이터 삽입 시작")
    print("=" * 60)
    
    # 1. 엑셀 복호화
    print("\n[1/6] 엑셀 파일 복호화 중...")
    decrypted = decrypt_excel(EXCEL_FILE, EXCEL_PASSWORD)
    
    # 2. RAW 시트 읽기
    print("\n[2/6] RAW 시트 읽기 중...")
    decrypted.seek(0)
    raw_df = read_raw_sheet(decrypted)
    
    # Summary 시트도 읽기
    decrypted.seek(0)
    summary_df = read_summary_sheet(decrypted)
    
    # 3. 데이터 파싱
    print("\n[3/6] 데이터 파싱 중...")
    parsed = parse_raw_data(raw_df)
    
    # 실제 컬럼명 확인 후 매핑
    col_list = list(parsed.columns)
    print(f"\n파싱 후 컬럼명: {col_list[:15]}")
    
    # 컬럼명 탐지 - 유사한 이름 찾기
    def find_col(keywords, cols):
        for kw in keywords:
            for c in cols:
                if kw in str(c):
                    return c
        return None
    
    date_col = find_col(['날짜', 'Date', 'date'], col_list) or col_list[0]
    platform_col = find_col(['플랫폼', 'Platform', '매체'], col_list) or col_list[3]
    campaign_group_col = find_col(['캠페인', 'Campaign', '캠페인그룹'], col_list) or col_list[4]
    ad_group_col = find_col(['광고그룹', 'Ad Group', '광고'], col_list) or col_list[5]
    creative_col = find_col(['크리에이티브', 'Creative'], col_list) or col_list[6]
    spending_col = find_col(['비용', 'Spending', 'Cost', 'cost'], col_list) or col_list[7]
    impressions_col = find_col(['노출', 'Imps', 'Impression', 'impression'], col_list) or col_list[8]
    clicks_col = find_col(['클릭', 'Click', 'click'], col_list) or col_list[9]
    views_col = find_col(['조회', 'View', 'view'], col_list) or col_list[10]
    install_col = find_col(['설치', 'Install', 'install'], col_list) or col_list[11]
    revenue_col = find_col(['매출', 'Revenue', 'revenue'], col_list) or col_list[12]
    
    print(f"\n컬럼 매핑:")
    print(f"  날짜: {date_col}")
    print(f"  플랫폼: {platform_col}")
    print(f"  캠페인그룹: {campaign_group_col}")
    print(f"  비용: {spending_col}")
    print(f"  노출: {impressions_col}")
    print(f"  클릭: {clicks_col}")
    print(f"  설치: {install_col}")
    print(f"  매출: {revenue_col}")
    
    # 유효한 데이터만 필터링 (날짜가 있고 플랫폼이 있는 행)
    valid_rows = []
    for idx, row in parsed.iterrows():
        dt = parse_date(row[date_col])
        platform_raw = str(row[platform_col]).strip() if not pd.isna(row[platform_col]) else ''
        
        # 플랫폼명에서 채널코드 추출
        channel_code = None
        for kr_name, code in PLATFORM_MAP.items():
            if kr_name in platform_raw:
                channel_code = code
                break
        
        if dt and channel_code:
            valid_rows.append({
                'date': dt,
                'channel_code': channel_code,
                'platform_raw': platform_raw,
                'campaign_group': str(row[campaign_group_col]).strip() if not pd.isna(row[campaign_group_col]) else '기타',
                'ad_group': str(row[ad_group_col]).strip() if not pd.isna(row[ad_group_col]) else '',
                'creative': str(row[creative_col]).strip() if not pd.isna(row[creative_col]) else '',
                'cost': safe_float(row[spending_col]),
                'impressions': safe_int(row[impressions_col]),
                'clicks': safe_int(row[clicks_col]),
                'conversions': safe_int(row[install_col]),
                'revenue': safe_float(row[revenue_col]),
            })
    
    print(f"\n유효 데이터 행 수: {len(valid_rows)}")
    
    if not valid_rows:
        print("ERROR: 유효한 데이터가 없습니다!")
        print(f"처음 3행 날짜 컬럼 값: {[parsed.iloc[i][date_col] for i in range(min(3, len(parsed)))]}")
        print(f"처음 3행 플랫폼 컬럼 값: {[parsed.iloc[i][platform_col] for i in range(min(3, len(parsed)))]}")
        return
    
    # 플랫폼별/캠페인그룹별 고유 조합
    unique_platforms = set(r['channel_code'] for r in valid_rows)
    unique_campaigns = set((r['channel_code'], r['campaign_group']) for r in valid_rows)
    
    print(f"\n플랫폼: {unique_platforms}")
    print(f"캠페인 수: {len(unique_campaigns)}")
    for ch, cg in sorted(unique_campaigns):
        print(f"  [{ch}] {cg}")
    
    # 날짜 범위
    dates = [r['date'] for r in valid_rows]
    print(f"\n날짜 범위: {min(dates)} ~ {max(dates)}")
    
    # 4. DB 삽입
    print("\n[4/6] DB 연결 및 데이터 삽입 중...")
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        # 기존 더미 데이터 정리 (Karrot 데이터는 유지, 이전 세션의 것만 삭제 방지)
        # 대신 demo 유저의 kakao/google/naver 관련 데이터만 삭제
        
        # demo 유저 확인/생성
        cursor.execute("SELECT id FROM users WHERE email = 'demo@example.com' LIMIT 1")
        user_row = cursor.fetchone()
        if user_row:
            demo_user_id = user_row[0]
            print(f"  기존 demo 사용자 사용 (id={demo_user_id})")
        else:
            cursor.execute("""
                INSERT INTO users (email, password_hash, name, role) 
                VALUES ('demo@example.com', '$2b$10$placeholder', '데모 사용자', 'user')
            """)
            demo_user_id = cursor.lastrowid
            print(f"  demo 사용자 생성 (id={demo_user_id})")
        
        # 기존 엑셀 더미 데이터 캠페인 메트릭 정리
        # (카카오/구글/네이버 계정에 연결된 기존 메트릭 삭제)
        for ch_code in ['kakao', 'google', 'naver']:
            cursor.execute("""
                SELECT ma.id FROM marketing_accounts ma 
                WHERE ma.user_id = %s AND ma.channel_code = %s
                AND ma.external_account_id LIKE 'excel_%%'
            """, (demo_user_id, ch_code))
            old_accounts = cursor.fetchall()
            for (acc_id,) in old_accounts:
                cursor.execute("""
                    DELETE cm FROM campaign_metrics cm
                    JOIN campaigns c ON cm.campaign_id = c.id
                    WHERE c.marketing_account_id = %s
                """, (acc_id,))
                cursor.execute("DELETE FROM campaigns WHERE marketing_account_id = %s", (acc_id,))
                cursor.execute("DELETE FROM data_sync_logs WHERE marketing_account_id = %s", (acc_id,))
            if old_accounts:
                cursor.execute("""
                    DELETE FROM marketing_accounts 
                    WHERE user_id = %s AND channel_code = %s 
                    AND external_account_id LIKE 'excel_%%'
                """, (demo_user_id, ch_code))
        
        # 기존 엑셀 인사이트도 정리
        cursor.execute("""
            DELETE FROM insights 
            WHERE user_id = %s AND title LIKE '%%[더미]%%'
        """, (demo_user_id,))
        
        conn.commit()
        print("  기존 엑셀 더미 데이터 정리 완료")
        
        # 채널 확인 (이미 존재해야 함)
        for ch_code in unique_platforms:
            cursor.execute("SELECT channel_code FROM channels WHERE channel_code = %s", (ch_code,))
            if not cursor.fetchone():
                ch_name = {'kakao': '카카오 광고', 'google': 'Google Ads', 'naver': '네이버 광고'}[ch_code]
                cursor.execute("INSERT INTO channels (channel_code, channel_name) VALUES (%s, %s)", (ch_code, ch_name))
                print(f"  채널 생성: {ch_code}")
        
        # 마케팅 계정 생성 (플랫폼별)
        account_ids = {}  # channel_code -> account_id
        for ch_code in unique_platforms:
            ext_id = f"excel_{ch_code}_001"
            ch_names = {'kakao': '카카오 광고 계정', 'google': 'Google Ads 계정', 'naver': '네이버 광고 계정'}
            cursor.execute("""
                INSERT INTO marketing_accounts (user_id, channel_code, external_account_id, account_name, connection_status)
                VALUES (%s, %s, %s, %s, 1)
            """, (demo_user_id, ch_code, ext_id, ch_names.get(ch_code, ch_code)))
            account_ids[ch_code] = cursor.lastrowid
            print(f"  마케팅 계정 생성: {ch_code} (id={account_ids[ch_code]})")
        
        # 캠페인 생성
        campaign_ids = {}  # (channel_code, campaign_group) -> campaign_id
        for ch_code, campaign_group in sorted(unique_campaigns):
            ext_camp_id = f"excel_{ch_code}_{campaign_group[:30]}"
            
            # 캠페인별 총 비용 계산 (예산으로 사용)
            camp_rows = [r for r in valid_rows if r['channel_code'] == ch_code and r['campaign_group'] == campaign_group]
            total_cost = sum(r['cost'] for r in camp_rows)
            daily_avg_cost = total_cost / max(len(set(r['date'] for r in camp_rows)), 1)
            
            cursor.execute("""
                INSERT INTO campaigns (marketing_account_id, external_campaign_id, campaign_name, status, daily_budget, total_budget)
                VALUES (%s, %s, %s, 'active', %s, %s)
            """, (
                account_ids[ch_code],
                ext_camp_id,
                campaign_group,
                round(daily_avg_cost * 1.2, 2),  # 일일 예산 = 평균 비용 * 1.2
                round(total_cost * 1.5, 2),  # 총 예산 = 총 비용 * 1.5
            ))
            campaign_ids[(ch_code, campaign_group)] = cursor.lastrowid
            print(f"  캠페인 생성: [{ch_code}] {campaign_group} (id={campaign_ids[(ch_code, campaign_group)]})")
        
        conn.commit()
        print(f"\n  총 {len(campaign_ids)}개 캠페인 생성 완료")
        
        # 캠페인 메트릭 삽입 (캠페인 + 날짜별 집계)
        print("\n[5/6] 캠페인 메트릭 삽입 중...")
        
        # 캠페인 + 날짜 별로 집계
        metrics_agg = {}  # (campaign_id, date) -> {impressions, clicks, cost, conversions, revenue}
        for row in valid_rows:
            key = (campaign_ids[(row['channel_code'], row['campaign_group'])], row['date'])
            if key not in metrics_agg:
                metrics_agg[key] = {'impressions': 0, 'clicks': 0, 'cost': 0.0, 'conversions': 0, 'revenue': 0.0}
            
            metrics_agg[key]['impressions'] += row['impressions']
            metrics_agg[key]['clicks'] += row['clicks']
            metrics_agg[key]['cost'] += row['cost']
            metrics_agg[key]['conversions'] += row['conversions']
            metrics_agg[key]['revenue'] += row['revenue']
        
        # 배치 삽입
        insert_count = 0
        batch = []
        for (campaign_id, metric_date), data in sorted(metrics_agg.items()):
            batch.append((
                campaign_id,
                metric_date,
                data['impressions'],
                data['clicks'],
                round(data['cost'], 2),
                data['conversions'],
                round(data['revenue'], 2),
            ))
            
            if len(batch) >= 100:
                cursor.executemany("""
                    INSERT INTO campaign_metrics (campaign_id, metric_date, impressions, clicks, cost, conversions, revenue)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, batch)
                insert_count += len(batch)
                batch = []
        
        if batch:
            cursor.executemany("""
                INSERT INTO campaign_metrics (campaign_id, metric_date, impressions, clicks, cost, conversions, revenue)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, batch)
            insert_count += len(batch)
        
        conn.commit()
        print(f"  {insert_count}개 메트릭 레코드 삽입 완료")
        
        # 6. 인사이트 생성
        print("\n[6/6] 인사이트 생성 중...")
        
        # 데이터 기반 인사이트 생성
        insights = []
        
        # 플랫폼별 총 지출 계산
        platform_totals = {}
        for row in valid_rows:
            ch = row['channel_code']
            if ch not in platform_totals:
                platform_totals[ch] = {'cost': 0, 'impressions': 0, 'clicks': 0, 'conversions': 0, 'revenue': 0}
            platform_totals[ch]['cost'] += row['cost']
            platform_totals[ch]['impressions'] += row['impressions']
            platform_totals[ch]['clicks'] += row['clicks']
            platform_totals[ch]['conversions'] += row['conversions']
            platform_totals[ch]['revenue'] += row['revenue']
        
        # 플랫폼별 ROAS 비교 인사이트
        best_roas_platform = None
        best_roas = 0
        for ch, totals in platform_totals.items():
            if totals['cost'] > 0:
                roas = totals['revenue'] / totals['cost']
                if roas > best_roas:
                    best_roas = roas
                    best_roas_platform = ch
        
        if best_roas_platform:
            ch_names = {'kakao': '카카오', 'google': '구글', 'naver': '네이버'}
            insights.append((
                demo_user_id, 'recommendation',
                f'[더미] {ch_names.get(best_roas_platform, best_roas_platform)} 채널 ROAS 우수',
                f'{ch_names.get(best_roas_platform, best_roas_platform)} 채널의 ROAS가 {best_roas:.2f}로 가장 높습니다. '
                f'해당 채널에 예산을 집중 배분하면 전체 수익성을 개선할 수 있습니다.',
                1
            ))
        
        # CPC 비교 인사이트
        worst_cpc_platform = None
        worst_cpc = 0
        for ch, totals in platform_totals.items():
            if totals['clicks'] > 0:
                cpc = totals['cost'] / totals['clicks']
                if cpc > worst_cpc:
                    worst_cpc = cpc
                    worst_cpc_platform = ch
        
        if worst_cpc_platform:
            ch_names = {'kakao': '카카오', 'google': '구글', 'naver': '네이버'}
            insights.append((
                demo_user_id, 'warning',
                f'[더미] {ch_names.get(worst_cpc_platform, worst_cpc_platform)} 채널 CPC 높음',
                f'{ch_names.get(worst_cpc_platform, worst_cpc_platform)} 채널의 평균 CPC가 {worst_cpc:,.0f}원으로 가장 높습니다. '
                f'키워드 최적화 및 타겟팅 개선을 통해 클릭당 비용을 절감하는 것을 권장합니다.',
                1
            ))
        
        # CTR 분석 인사이트
        best_ctr_platform = None
        best_ctr = 0
        for ch, totals in platform_totals.items():
            if totals['impressions'] > 0:
                ctr = totals['clicks'] / totals['impressions']
                if ctr > best_ctr:
                    best_ctr = ctr
                    best_ctr_platform = ch
        
        if best_ctr_platform:
            ch_names = {'kakao': '카카오', 'google': '구글', 'naver': '네이버'}
            insights.append((
                demo_user_id, 'opportunity',
                f'[더미] {ch_names.get(best_ctr_platform, best_ctr_platform)} 채널 CTR 우수',
                f'{ch_names.get(best_ctr_platform, best_ctr_platform)} 채널의 CTR이 {best_ctr*100:.2f}%로 가장 높습니다. '
                f'크리에이티브 전략을 다른 채널에도 적용하면 전체 CTR 개선이 기대됩니다.',
                2
            ))
        
        # 전체 성과 요약 인사이트
        total_cost = sum(t['cost'] for t in platform_totals.values())
        total_revenue = sum(t['revenue'] for t in platform_totals.values())
        total_conversions = sum(t['conversions'] for t in platform_totals.values())
        overall_roas = total_revenue / total_cost if total_cost > 0 else 0
        
        insights.append((
            demo_user_id, 'recommendation',
            '[더미] 전체 채널 성과 분석 요약',
            f'분석 기간 동안 총 {total_cost:,.0f}원의 광고비로 {total_conversions:,}건의 전환을 달성했습니다. '
            f'전체 ROAS는 {overall_roas:.2f}이며, 총 매출은 {total_revenue:,.0f}원입니다. '
            f'채널별 성과 차이를 고려하여 예산 재배분을 검토하세요.',
            2
        ))
        
        # 예산 최적화 제안
        insights.append((
            demo_user_id, 'opportunity',
            '[더미] 멀티채널 예산 최적화 제안',
            f'현재 {len(unique_platforms)}개 채널에서 {len(unique_campaigns)}개 캠페인이 운영 중입니다. '
            f'채널간 ROAS 편차가 크므로 상위 성과 채널 중심의 예산 재배분을 권장합니다. '
            f'AI 기반 자동 예산 배분 기능을 활용하면 전체 ROAS를 15-20% 개선할 수 있습니다.',
            3
        ))
        
        # 트렌드 인사이트
        insights.append((
            demo_user_id, 'warning',
            '[더미] 주말/주중 성과 차이 감지',
            '데이터 분석 결과, 주중 대비 주말 CTR이 30% 이상 낮은 패턴이 감지되었습니다. '
            '주말 광고 노출 시간대를 조정하거나, 주말 전용 크리에이티브를 활용하는 것을 권장합니다.',
            2
        ))
        
        for insight in insights:
            cursor.execute("""
                INSERT INTO insights (user_id, type, title, content, priority)
                VALUES (%s, %s, %s, %s, %s)
            """, insight)
        
        conn.commit()
        print(f"  {len(insights)}개 인사이트 생성 완료")
        
        # 예산 데이터 생성
        cursor.execute("""
            INSERT INTO budgets (user_id, total_budget, daily_budget, status)
            VALUES (%s, %s, %s, 'active')
            ON DUPLICATE KEY UPDATE total_budget = VALUES(total_budget)
        """, (demo_user_id, round(total_cost * 1.5, 2), round(total_cost / 30, 2)))
        conn.commit()
        print("  예산 데이터 생성 완료")
        
        # 데이터 동기화 로그 생성
        for ch_code, acc_id in account_ids.items():
            cursor.execute("""
                INSERT INTO data_sync_logs (marketing_account_id, success, collected_count, started_at)
                VALUES (%s, 1, %s, NOW())
            """, (acc_id, len([r for r in valid_rows if r['channel_code'] == ch_code])))
        conn.commit()
        print("  데이터 동기화 로그 생성 완료")
        
        # 최종 확인
        print("\n" + "=" * 60)
        print("삽입 결과 확인")
        print("=" * 60)
        
        tables = ['users', 'channels', 'marketing_accounts', 'campaigns', 'campaign_metrics', 'insights', 'budgets', 'data_sync_logs']
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count}개 레코드")
        
        # 채널별 성과 뷰 확인
        cursor.execute("""
            SELECT channel_code, 
                   COUNT(*) as days,
                   SUM(total_spend) as total_spend,
                   SUM(total_impressions) as total_imps,
                   SUM(total_clicks) as total_clicks,
                   SUM(total_conversions) as total_conv,
                   SUM(total_revenue) as total_rev
            FROM channel_performance_daily
            WHERE user_id = %s
            GROUP BY channel_code
        """, (demo_user_id,))
        
        print("\n채널별 성과 요약:")
        for row in cursor.fetchall():
            ch, days, spend, imps, clicks, conv, rev = row
            roas = float(rev) / float(spend) if float(spend) > 0 else 0
            print(f"  [{ch}] {days}일, 비용={float(spend):,.0f}원, 노출={int(imps):,}, 클릭={int(clicks):,}, 전환={int(conv):,}, 매출={float(rev):,.0f}원, ROAS={roas:.2f}")
        
    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()
    
    print("\n" + "=" * 60)
    print("더미 데이터 삽입 완료!")
    print("=" * 60)


if __name__ == '__main__':
    main()
