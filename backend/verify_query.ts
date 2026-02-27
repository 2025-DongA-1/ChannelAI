import pool from './src/config/database';

async function verifyQuery() {
  try {
    const rawMetricsQuery = `
      SELECT 
        ma.channel_code AS platform,
        c.campaign_name,
        COALESCE(SUM(cm.conversions), 0) as total_conversions,
        COALESCE(SUM(cm.cost), 0) as total_cost
      FROM campaigns c
      JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
      JOIN campaign_metrics cm ON c.id = cm.campaign_id
      WHERE ma.user_id = 1
      GROUP BY ma.channel_code, c.campaign_name
    `;

    const result = await pool.query(rawMetricsQuery);
    console.log("User 1 Data:", result.rows);
    
    const result2 = await pool.query(rawMetricsQuery.replace('user_id = 1', 'user_id = 2'));
    console.log("User 2 Data:", result2.rows);
    
  } catch(e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

verifyQuery();
