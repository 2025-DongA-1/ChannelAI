import fs from 'fs';
import path from 'path';
import pool from '../src/config/database';

// CSV 이스케이프 함수
const escapeCSV = (val: any) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// 요일 반환 함수
const getDayOfWeek = (dateString: string) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateString).getDay()];
};

// 월 반환 함수
const getMonth = (dateString: string) => {
  return (new Date(dateString).getMonth() + 1).toString();
};

(async () => {
  try {
    console.log('📊 지정된 업로드 양식 통합 포맷으로 파일 생성을 시작합니다...');
    const client = await pool.connect();

    // 캠페인 정보와 성과 지표(Metrics)를 JOIN하여 통합 조회
    // (현재 로그인된 특정 유저 데이터만 뽑고 싶다면 WHERE 절을 추가할 수 있습니다)
    const query = `
      SELECT 
        DATE_FORMAT(m.metric_date, '%Y-%m-%d') as metric_date,
        c.platform,
        c.campaign_name,
        m.cost,
        m.impressions,
        m.clicks,
        m.conversions
      FROM campaign_metrics m
      JOIN campaigns c ON m.campaign_id = c.id
      ORDER BY m.metric_date DESC, c.campaign_name ASC
    `;

    const { rows } = await client.query(query);
    const metricsData = rows as any[];

    // 요구하신 정확한 업로드 헤더 양식
    const headers = [
      '날짜', '월', '요일', '매체', '캠페인', '그룹', '소재', 
      '비용', '노출', '클릭', '조회', '설치', '잠재고객'
    ];

    // CSV 데이터 매핑 (DB에 없는 값들은 기본값/빈칸 처리)
    const csvRows = metricsData.map(row => {
      const dateStr = row.metric_date;
      return [
        escapeCSV(dateStr),                                 // 날짜
        escapeCSV(getMonth(dateStr)),                       // 월
        escapeCSV(getDayOfWeek(dateStr)),                   // 요일
        escapeCSV(row.platform),                            // 매체
        escapeCSV(row.campaign_name),                       // 캠페인
        escapeCSV(''),                                      // 그룹 (빈값)
        escapeCSV(''),                                      // 소재 (빈값)
        escapeCSV(row.cost || 0),                           // 비용
        escapeCSV(row.impressions || 0),                    // 노출
        escapeCSV(row.clicks || 0),                         // 클릭
        escapeCSV(0),                                       // 조회 (기본값)
        escapeCSV(row.conversions || 0),                    // 설치 (전환수로 대체)
        escapeCSV(0)                                        // 잠재고객 (기본값)
      ].join(',');
    });

    const finalCsvContent = [headers.join(','), ...csvRows].join('\n');

    // 다운로드(export) 폴더 생성
    const exportDir = path.join(__dirname, '../../export_data');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 파일 저장
    const filePath = path.join(exportDir, 'channel_ai_upload_template.csv');
    // 엑셀에서 한글 깨짐을 방지하기 위해 \uFEFF (BOM) 추가
    fs.writeFileSync(filePath, '\uFEFF' + finalCsvContent, 'utf8');

    console.log(`- ✅ [channel_ai_upload_template.csv] 생성 완료`);
    console.log(`- 📋 총 ${metricsData.length}개의 통합 데이터 항목이 추출되었습니다.`);
    console.log(`- 📁 저장 위치: ${exportDir} 폴더`);

    client.release();
  } catch (error) {
    console.error('❌ CSV 생성 중 오류 발생:', error);
  } finally {
    process.exit(0);
  }
})();
