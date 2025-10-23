require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearJobs() {
  try {
    const result = await pool.query('DELETE FROM conversion_jobs WHERE status IN ($1, $2)', ['pending', 'processing']);
    console.log(`✅ Cleared ${result.rowCount} pending/processing jobs`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearJobs();
