const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'project-db-cgi.smhrd.com',
    port: parseInt(process.env.DB_PORT || '3307'),
    database: process.env.DB_NAME || 'cgi_25K_DA1_p3_1',
    user: process.env.DB_USER || 'cgi_25K_DA1_p3_1',
    password: process.env.DB_PASSWORD || 'smhrd1',
  });

  try {
    const [rows] = await pool.query('DESCRIBE ai_history');
    console.log('--- ai_history ---');
    console.table(rows);

    const [rows2] = await pool.query('DESCRIBE insights');
    console.log('--- insights ---');
    console.table(rows2);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
