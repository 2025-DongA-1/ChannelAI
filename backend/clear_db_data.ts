import pool from './src/config/database';

/**
 * DB 데이터 초기화 스크립트
 * 목적: 테스트를 위해 기존에 저장된 모든 광고 계정, 캠페인, 지표 데이터를 안전하게 삭제합니다.
 */
async function clearDatabase() {
  try {
    console.log('🧹 DB 데이터 초기화를 시작합니다...');

    // 외래 키 제약 조건 잠시 해제 (연관된 데이터를 한꺼번에 지우기 위함)
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. 성과 지표 데이터 삭제
    await pool.query('TRUNCATE TABLE campaign_metrics');
    console.log('  > 성과 지표(metrics) 삭제 완료');

    // 2. 캠페인 데이터 삭제
    await pool.query('TRUNCATE TABLE campaigns');
    console.log('  > 캠페인(campaigns) 삭제 완료');

    // 3. 마케팅 계정 데이터 삭제
    await pool.query('TRUNCATE TABLE marketing_accounts');
    console.log('  > 마케팅 계정(accounts) 삭제 완료');

    // 4. 동기화 로그 삭제
    await pool.query('TRUNCATE TABLE data_sync_logs');
    console.log('  > 동기화 로그(logs) 삭제 완료');

    // 외래 키 제약 조건 다시 활성화
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✨ 모든 데이터가 삭제되었습니다! 이제 화면을 새로고침하면 비어있을 것입니다.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ 삭제 중 오류 발생:', err.message);
    process.exit(1);
  }
}

clearDatabase();
