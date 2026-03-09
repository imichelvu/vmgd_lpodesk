/**
 * Author: Igor Michel
 * Purpose: Add break_hours column to overtime_entries for transparent deduction tracking.
 * Run once: node src/db/migrate-overtime-break.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE overtime_entries
      ADD COLUMN IF NOT EXISTS break_hours DECIMAL(5,2) NOT NULL DEFAULT 0
        CHECK (break_hours >= 0 AND break_hours < 24)
    `);
    await client.query('COMMIT');
    console.log('Migration successful: break_hours added to overtime_entries');
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
