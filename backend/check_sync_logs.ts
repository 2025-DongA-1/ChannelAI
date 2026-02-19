import pool from './src/config/database';

async function checkSyncLogs() {
  try {
    const result: any = await pool.query('SHOW COLUMNS FROM data_sync_logs');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e: any) {
    console.error('Check failed:', e.message);
  } finally {
    process.exit(0);
  }
}

checkSyncLogs();
