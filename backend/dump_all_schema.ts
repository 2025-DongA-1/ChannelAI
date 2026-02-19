import pool from './src/config/database';

async function checkAllSchemas() {
  const tables = ['users', 'channels', 'marketing_accounts', 'campaigns', 'campaign_metrics'];
  const schemaInfo: any = {};

  try {
    for (const table of tables) {
      try {
        const result: any = await pool.query(`SHOW COLUMNS FROM ${table}`);
        // adjust based on return type of pool.query wrapper
        // The wrapper returns { rows, ... }
        // For SHOW COLUMNS, rows will be array of objects with Field, Type etc.
        schemaInfo[table] = result.rows.map((c: any) => `${c.Field} (${c.Type})`);
      } catch (e: any) {
        schemaInfo[table] = [`Error: ${e.message}`];
      }
    }
    console.log(JSON.stringify(schemaInfo, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkAllSchemas();
