
import fs from 'fs';
import path from 'path';
import pool from '../src/config/database';

const SCHEMA_PATH = path.resolve(__dirname, '../../database/CURRENT_DATABASE_SCHEMA.sql');

async function initDB() {
  try {
    console.log('🚀 Initializing Database from Schema...');
    console.log(`Reading schema from: ${SCHEMA_PATH}`);
    
    // 1. Read SQL File
    if (!fs.existsSync(SCHEMA_PATH)) {
      throw new Error(`Schema file not found at ${SCHEMA_PATH}`);
    }
    const sqlContent = fs.readFileSync(SCHEMA_PATH, 'utf8');

    // 2. Drop existing tables to ensure clean state matches the schema
    const tablesToReset = [
      'data_sync_logs', 
      'campaign_metrics', 
      'campaigns', 
      'marketing_accounts', 
      'channels', 
      'users'
    ]; 

    // Disable FK checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('🗑️ Dropping existing tables to ensure schema match...');
    for (const table of tablesToReset) {
      await pool.query(`DROP TABLE IF EXISTS ${table}`);
      console.log(`   - Dropped ${table}`);
    }

    // 3. Execute SQL Schema
    console.log('📜 Executing Schema SQL...');
    
    // Remove comments
    const cleanSql = sqlContent.replace(/--.*$/gm, '');

    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (e) {
        console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
        throw e;
      }
    }
    
    // Re-enable FK checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Database tables created successfully.');
    
    const result = await pool.query('SHOW TABLES');
    console.log('Current Tables:', result.rows.map((r: any) => Object.values(r)[0]));

    process.exit(0);

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDB();
