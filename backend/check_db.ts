import pool from './src/config/database';

async function checkSchema() {
  try {
    console.log('Checking tables in ad_mate_db...');
    const { rows: tables } = await pool.query('SHOW TABLES');
    console.log('Tables:', tables);

    for (const tableObj of tables) {
      const tableName = Object.values(tableObj)[0] as string;
      console.log(`\n--- Table: ${tableName} ---`);
      const { rows: columns } = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
      console.log(columns.map((c: any) => `${c.Field} (${c.Type})`));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exit(1);
  }
}

checkSchema();
