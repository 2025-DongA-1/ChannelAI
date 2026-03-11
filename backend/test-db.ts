import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await conn.query('SELECT MIN(metric_date) as min_date, MAX(metric_date) as max_date, COUNT(*) as cnt FROM channel_performance_daily;');
  console.log("Summary:", rows);

  const [sample] = await conn.query('SELECT * FROM channel_performance_daily LIMIT 5;');
  console.log("Sample:", sample);

  conn.end();
}
run();
