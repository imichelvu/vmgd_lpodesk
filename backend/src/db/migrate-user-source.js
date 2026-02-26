/**
 * Add source column to users: 'local' (created in app) vs 'ad_import' (from AD).
 * Run once: node src/db/migrate-user-source.js
 */
import '../loadEnv.js';
import pool from './pool.js';

const sql = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'local';
  UPDATE users SET source = 'local' WHERE source IS NULL;
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('User source column added (or already present).');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
