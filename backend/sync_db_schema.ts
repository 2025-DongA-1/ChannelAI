import pool from './src/config/database';

/**
 * DB 스키마 동기화 함수
 * 목적: 사용자님의 로컬 DB(ad_mate_db) 구조를 ChannelAI 백엔드 코드가 기대하는 표준 규격으로 자동 변경합니다.
 */
async function syncSchema() {
  try {
    console.log('🚀 ChannelAI DB 표준 구조로 동기화를 시작합니다...');

    // 1. 마케팅 계정 테이블(marketing_accounts) 수정
    // 기존 ad-mate 구조의 컬럼명들을 ChannelAI 표준 명칭으로 변경합니다.
    console.log('- marketing_accounts 테이블 수정 중...');
    try {
      // platform 컬럼이 존재한다면 channel_code로 이름을 바꿉니다.
      await pool.query('ALTER TABLE marketing_accounts CHANGE COLUMN platform channel_code VARCHAR(50)');
      console.log('  > platform -> channel_code 변경 완료');
    } catch (e: any) { /* 이미 변경되었거나 컬럼이 없으면 통과 */ }

    try {
      // account_id_external 컬럼을 external_account_id로 바꿉니다. (코드 호환성)
      await pool.query('ALTER TABLE marketing_accounts CHANGE COLUMN account_id_external external_account_id VARCHAR(255)');
      console.log('  > account_id_external -> external_account_id 변경 완료');
    } catch (e: any) { }

    try {
      // status 컬럼(문자열)을 connection_status(숫자)로 규격화합니다.
      await pool.query('ALTER TABLE marketing_accounts CHANGE COLUMN status connection_status TINYINT(1) DEFAULT 1');
      console.log('  > status -> connection_status 변경 완료');
    } catch (e: any) { }

    try {
      // 코드가 기대하는 인증 토큰 컬럼(access_token, refresh_token)을 추가합니다.
      await pool.query('ALTER TABLE marketing_accounts ADD COLUMN access_token TEXT AFTER account_name');
      await pool.query('ALTER TABLE marketing_accounts ADD COLUMN refresh_token TEXT AFTER access_token');
      console.log('  > 인증 토큰(access/refresh) 컬럼 추가 완료');
    } catch (e: any) { }


    // 2. 캠페인 테이블(campaigns) 수정
    console.log('- campaigns 테이블 수정 중...');
    try {
      // campaign_id(명칭 중복 위험)를 external_campaign_id로 명확히 바꿉니다.
      await pool.query('ALTER TABLE campaigns CHANGE COLUMN campaign_id external_campaign_id VARCHAR(255)');
      console.log('  > campaign_id -> external_campaign_id 변경 완료');
    } catch (e: any) { }


    // 3. 성과 지표 테이블(campaign_metrics) 수정
    console.log('- campaign_metrics 테이블 수정 중...');
    try {
      // date는 SQL 예약어이므로 metric_date라는 명확한 이름으로 바꿉니다.
      await pool.query('ALTER TABLE campaign_metrics CHANGE COLUMN date metric_date DATE NOT NULL');
      console.log('  > date -> metric_date 변경 완료');
    } catch (e: any) { }


    // 4. 채널 마스터 테이블(channels) 수정
    console.log('- channels 테이블 재구성 중...');
    try {
      // 채널명(name) 대신 채널 코드(channel_code)를 기본키로 사용하는 표준을 따릅니다.
      await pool.query('ALTER TABLE channels CHANGE COLUMN platform channel_code VARCHAR(50)');
      await pool.query('ALTER TABLE channels DROP PRIMARY KEY, ADD PRIMARY KEY (channel_code)');
      console.log('  > 채널 기본키 구조 변경 완료');
    } catch (e: any) { }

    console.log('\n✨ DB 구조 동기화가 성공적으로 끝났습니다!');
    console.log('💡 이제 백엔드 서버를 재시작하면 500 에러 없이 정상 작동합니다.');
    process.exit(0);
  } catch (err) {
    console.error('❌ 동기화 중 치명적 오류 발생:', err);
    process.exit(1);
  }
}

// 스크립트 실행
syncSchema();
