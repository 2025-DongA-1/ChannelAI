import pool from './src/config/database';

async function checkRows() {
  try {
    console.log('--- marketing_accounts 내용 확인 ---');
    const { rows } = await pool.query('SELECT channel_code, account_name, created_at FROM marketing_accounts');
    console.log(rows);
    process.exit(0);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkRows();
