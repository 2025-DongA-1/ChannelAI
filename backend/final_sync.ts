import pool from './src/config/database';

async function sync() {
  console.log('🏁 Final Database Schema Synchronization Starting...');
  
  try {
    // 1. marketing_accounts 테이블 정리
    console.log('Update marketing_accounts...');
    const ma_cols = (await pool.query('SHOW COLUMNS FROM marketing_accounts')).rows.map((c: any) => c.Field);
    
    // status -> connection_status
    if (ma_cols.includes('status') && !ma_cols.includes('connection_status')) {
      await pool.query('ALTER TABLE marketing_accounts CHANGE COLUMN status connection_status TINYINT(1) DEFAULT 1');
      console.log('  > Renamed status to connection_status');
    }
    
    // access_token이 없으면 추가 (코드가 기대함)
    if (!ma_cols.includes('access_token')) {
        await pool.query('ALTER TABLE marketing_accounts ADD COLUMN access_token TEXT AFTER account_name');
        console.log('  > Added access_token');
    }

    // auth_token이 없으면 추가 (스키마가 기대함)
    if (!ma_cols.includes('auth_token')) {
        await pool.query('ALTER TABLE marketing_accounts ADD COLUMN auth_token TEXT AFTER access_token');
        console.log('  > Added auth_token');
    }
    
    // 2. campaigns 테이블 정리
    console.log('Update campaigns...');
    const c_cols = (await pool.query('SHOW COLUMNS FROM campaigns')).rows.map((c: any) => c.Field);
    
    // platform 컬럼은 schema.sql에 없지만 있으면 놔둠 (데이터 보존용)
    
    // metric_date 컬럼 확인 (없으면 추가 또는 변경)
    // campaigns에는 date가 없고 campaign_metrics에 있음.

    // 3. campaign_metrics 테이블 정리
    console.log('Update campaign_metrics...');
    const cm_cols = (await pool.query('SHOW COLUMNS FROM campaign_metrics')).rows.map((c: any) => c.Field);
    
    // date -> metric_date
    if (cm_cols.includes('date') && !cm_cols.includes('metric_date')) {
      await pool.query('ALTER TABLE campaign_metrics CHANGE COLUMN date metric_date DATE NOT NULL');
      console.log('  > Renamed date to metric_date');
    }

    console.log('✅ Final Synchronization Complete!');
  } catch (e: any) {
    console.error('❌ Sync failed:', e.message);
  } finally {
    process.exit(0);
  }
}

sync();
