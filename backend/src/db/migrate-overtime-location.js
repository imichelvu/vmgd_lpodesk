/**
 * Author: Igor Michel
 * Purpose: Add location column to overtime_entries for audit trail (field work, overseas missions, callouts).
 * Run once: node src/db/migrate-overtime-location.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE overtime_entries
      ADD COLUMN IF NOT EXISTS location VARCHAR(255)
    `);
    await client.query('COMMIT');
    console.log('Migration successful: location column added to overtime_entries');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
