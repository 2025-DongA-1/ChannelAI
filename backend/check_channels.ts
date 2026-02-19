import pool from './src/config/database';

async function checkChannels() {
  try {
    const result: any = await pool.query('SHOW COLUMNS FROM channels');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e: any) {
    console.error('Check failed:', e.message);
  } finally {
    process.exit(0);
  }
}

checkChannels();
