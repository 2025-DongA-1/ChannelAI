import pool from './src/config/database';

async function check() {
  const result = await pool.query('SELECT MIN(metric_date) as minDate, MAX(metric_date) as maxDate FROM campaign_metrics');
  console.log(result.rows || result[0]);
  process.exit(0);
}
check();
