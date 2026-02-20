
import pool from '../src/config/database';

async function checkSchema() {
  try {
    console.log('Checking database schema...');
    
    // Get all tables
    const tableResult = await pool.query('SHOW TABLES');
    const tables = tableResult.rows.map((row: any) => Object.values(row)[0]); // Extract table names
    
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);
    console.log('---------------------------------------------------');

    for (const table of tables) {
      console.log(`\nTable: ${table}`);
      const columnResult = await pool.query(`DESCRIBE ${table}`);
      const columns = columnResult.rows;
      
      console.log('Columns:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default ? `Default: ${col.Default}` : ''}`);
      });
    }
    
    console.log('\nSchema check complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();
