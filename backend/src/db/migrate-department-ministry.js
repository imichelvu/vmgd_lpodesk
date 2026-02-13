/**
 * Add department and ministry to users (distinct from division).
 * Run once: node src/db/migrate-department-ministry.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS department VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ministry VARCHAR(255);
    `);
    console.log('department and ministry columns added to users (or already present).');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
