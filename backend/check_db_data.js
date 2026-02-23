const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'marketing_db',
  });

  const [rows] = await connection.query(`
    SELECT 
      ma.user_id,
      ma.channel_code AS platform,
      c.campaign_name,
      COALESCE(SUM(cm.conversions), 0) as total_conversions,
      COALESCE(SUM(cm.cost), 0) as total_cost
    FROM campaigns c
    JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
    JOIN campaign_metrics cm ON c.id = cm.campaign_id
    GROUP BY ma.user_id, ma.channel_code, c.campaign_name
  `);
  
  console.dir(rows, { depth: null });
  process.exit(0);
}
run();
