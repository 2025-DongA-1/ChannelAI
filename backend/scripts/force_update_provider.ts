import pool from '../src/config/database';
(async () => {
  try {
    const client = await pool.connect();
    // Update local user test@test.com
    await client.query("UPDATE users SET provider = 'google', provider_id = 'GOOGLE:TEST_ID' WHERE email = 'test@test.com'");
    const result = await client.query("SELECT * FROM users WHERE email = 'test@test.com'");
    console.log("Updated user:", result.rows[0]);
    client.release();
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
