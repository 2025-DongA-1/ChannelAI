import pool from './src/config/database';

async function deleteUserByEmail(email: string) {
  try {
    console.log(`Searching for user with email: ${email}`);
    
    // 1. Get user_id
    const userResult: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (userResult.rows.length === 0) {
      console.log('User not found.');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`Found user ID: ${userId}. Starting deletion of related records...`);

    // 2. Delete related records in dependent tables
    // The order matters if there are foreign key constraints
    
    // campaign_metrics -> campaigns -> marketing_accounts -> users
    
    // marketing_accounts IDs
    const accountsResult: any = await pool.query('SELECT id FROM marketing_accounts WHERE user_id = ?', [userId]);
    const accountIds = accountsResult.rows.map((row: any) => row.id);

    if (accountIds.length > 0) {
      console.log(`Deleting data for ${accountIds.length} marketing accounts...`);
      
      const accountIdsStr = accountIds.join(',');
      
      // Delete from campaign_metrics
      await pool.query(`DELETE FROM campaign_metrics WHERE campaign_id IN (SELECT id FROM campaigns WHERE marketing_account_id IN (${accountIdsStr}))`);
      
      // Delete from campaigns
      await pool.query(`DELETE FROM campaigns WHERE marketing_account_id IN (${accountIdsStr})`);
      
      // Delete from data_sync_logs
      await pool.query(`DELETE FROM data_sync_logs WHERE marketing_account_id IN (${accountIdsStr})`);
      
      // Delete from marketing_accounts
      await pool.query(`DELETE FROM marketing_accounts WHERE user_id = ?`, [userId]);
    }

    // 3. Delete from users
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    
    console.log('User and all related records deleted successfully.');
  } catch (error: any) {
    console.error('Deletion failed:', error.message);
  } finally {
    process.exit(0);
  }
}

deleteUserByEmail('test@test.com');
