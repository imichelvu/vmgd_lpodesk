/**
 * Add entry_date (date staff entered service/post) to users.
 * Run once: node src/db/migrate-entry-date.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS entry_date DATE;
    `);
    console.log('entry_date column added to users (or already present).');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
