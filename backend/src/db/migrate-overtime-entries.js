/**
 * Author: Igor Michel
 * Purpose: Create overtime_entries table for extra-hour tracking.
 * Last updated: 2026-02-09
 */
import '../loadEnv.js';
import pool from './pool.js';

const SQL = `
  CREATE TABLE IF NOT EXISTS overtime_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    work_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    purpose VARCHAR(30) NOT NULL
      CHECK (purpose IN ('Overtime Payment', 'Time Off In Lieu')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT overtime_entries_valid_range CHECK (
      start_datetime IS NULL
      OR end_datetime IS NULL
      OR end_datetime > start_datetime
    )
  );

  ALTER TABLE overtime_entries
    ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMPTZ;

  ALTER TABLE overtime_entries
    ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMPTZ;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'overtime_entries_updated_at'
    ) THEN
      CREATE TRIGGER overtime_entries_updated_at
        BEFORE UPDATE ON overtime_entries
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
    END IF;
  END
  $$;

  CREATE INDEX IF NOT EXISTS idx_overtime_entries_user_date
    ON overtime_entries(user_id, work_date DESC);
`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SQL);
    await client.query('COMMIT');
    console.log('overtime_entries migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
