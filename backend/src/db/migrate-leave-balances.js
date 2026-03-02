/**
 * Author: Igor Michel
 * Purpose: Add leave balance policy and balance tables with default policy rows.
 * Last updated: 2026-02-28
 */
import '../loadEnv.js';
import pool from './pool.js';

const SQL = `
  CREATE TABLE IF NOT EXISTS leave_balance_policies (
    leave_type VARCHAR(100) PRIMARY KEY,
    default_allocation_days DECIMAL(7,2) NOT NULL DEFAULT 0,
    requires_balance BOOLEAN NOT NULL DEFAULT true,
    allow_negative BOOLEAN NOT NULL DEFAULT false,
    min_notice_days INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE leave_balance_policies
  ADD COLUMN IF NOT EXISTS min_notice_days INTEGER NOT NULL DEFAULT 0;

  CREATE TABLE IF NOT EXISTS leave_balances (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(100) NOT NULL REFERENCES leave_balance_policies(leave_type) ON DELETE RESTRICT,
    year INTEGER NOT NULL,
    allocated_days DECIMAL(7,2) NOT NULL DEFAULT 0,
    carry_forward_days DECIMAL(7,2) NOT NULL DEFAULT 0,
    used_days DECIMAL(7,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, leave_type, year)
  );

  CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON leave_balances(user_id, year);

  INSERT INTO leave_balance_policies (leave_type, default_allocation_days, requires_balance, allow_negative, min_notice_days) VALUES
    ('Annual vacation', 0, true, false, 14),
    ('Home island', 10, true, false, 14),
    ('Sick leave', 21, true, false, 0),
    ('Maternity', 90, true, false, 14),
    ('Family', 5, true, false, 14),
    ('Compassionate', 5, true, false, 0),
    ('Sporting / Cultural / Religious', 5, true, false, 14),
    ('Leave without pay', 0, false, true, 14),
    ('Other', 0, false, true, 14)
  ON CONFLICT (leave_type) DO NOTHING;

  CREATE TABLE IF NOT EXISTS leave_accrual_tiers (
    leave_type VARCHAR(100) NOT NULL,
    min_years INTEGER NOT NULL,
    monthly_days DECIMAL(6,3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (leave_type, min_years),
    CONSTRAINT leave_accrual_tiers_non_negative CHECK (min_years >= 0 AND monthly_days >= 0)
  );

  INSERT INTO leave_accrual_tiers (leave_type, min_years, monthly_days) VALUES
    ('Annual vacation', 0, 1.25),
    ('Annual vacation', 6, 1.75)
  ON CONFLICT (leave_type, min_years) DO NOTHING;
`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SQL);
    await client.query('COMMIT');
    console.log('Leave balance tables and default policies created (or already present).');
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

