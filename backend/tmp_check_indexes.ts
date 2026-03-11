import pool from './src/config/database';

async function checkIndexes() {
  try {
    console.log('--- marketing_accounts Indexes ---');
    const result = await pool.query('SHOW INDEX FROM marketing_accounts');
    console.table(result.rows);
    process.exit(0);
  } catch (error) {
    console.error('Error checking indexes:', error);
    process.exit(1);
  }
}

checkIndexes();
