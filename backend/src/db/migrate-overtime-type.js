/**
 * Author: Igor Michel
 * Purpose: Add overtime_type column to overtime_entries to categorise the nature of extra work.
 * Types: Weekend/Field Work, Emergency Callout, Standby Duty, General Overtime.
 * Run once: node src/db/migrate-overtime-type.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE overtime_entries
      ADD COLUMN IF NOT EXISTS overtime_type VARCHAR(100) NOT NULL DEFAULT 'General Overtime'
    `);
    await client.query('COMMIT');
    console.log('Migration successful: overtime_type column added to overtime_entries');
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
