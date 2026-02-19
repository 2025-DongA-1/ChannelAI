import pool from './src/config/database';

async function check() {
  try {
    const ma_res = await pool.query('SHOW COLUMNS FROM marketing_accounts');
    console.log('--- marketing_accounts ---');
    console.log(ma_res.rows.map((c: any) => `${c.Field} (${c.Type})`).join(', '));

    const c_res = await pool.query('SHOW COLUMNS FROM campaigns');
    console.log('--- campaigns ---');
    console.log(c_res.rows.map((c: any) => `${c.Field} (${c.Type})`).join(', '));

    const cm_res = await pool.query('SHOW COLUMNS FROM campaign_metrics');
    console.log('--- campaign_metrics ---');
    console.log(cm_res.rows.map((c: any) => `${c.Field} (${c.Type})`).join(', '));

  } catch (e: any) {
    console.error('Check failed:', e.message);
  } finally {
    process.exit(0);
  }
}

check();
