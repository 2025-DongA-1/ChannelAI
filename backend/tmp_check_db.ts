import pool from './src/config/database';

async function checkSchema() {
  try {
    console.log('--- marketing_accounts Schema ---');
    const result = await pool.query('DESC marketing_accounts');
    console.table(result.rows);
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();
