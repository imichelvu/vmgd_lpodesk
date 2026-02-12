/**
 * Add username column to users (for existing databases).
 * Run once: node src/db/migrate-username.js
 */
import '../loadEnv.js';
import pool from './pool.js';

const sql = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('Username column added (or already present).');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
