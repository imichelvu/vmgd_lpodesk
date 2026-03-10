/**
 * Author: Igor Michel
 * Purpose: Add TOIL infrastructure — app_settings table (configurable multiplier/expiry)
 *          and "Time Off In Lieu" leave policy.
 * Run once: node src/db/migrate-toil.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generic key-value settings table — admins control values via the UI
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key           VARCHAR(100) PRIMARY KEY,
        value         TEXT        NOT NULL,
        label         VARCHAR(255),
        description   TEXT,
        updated_by    INTEGER REFERENCES users(id),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default TOIL settings (PSSRM s.4.1(b)/(c))
    await client.query(`
      INSERT INTO app_settings (key, value, label, description) VALUES
        ('toil_multiplier',    '1.25', 'TOIL multiplier',
         'Hours of time off earned per hour of overtime worked (PSSRM s.4.1(b)/(c)). Default: 1.25.'),
        ('toil_expiry_months', '3',    'TOIL expiry (months)',
         'TOIL must be taken within this many months of the approved overtime date (PSSRM s.4.1(b)). Default: 3.')
      ON CONFLICT (key) DO NOTHING
    `);

    // Add TOIL as a recognised leave type — balance is computed from overtime, not accrued
    await client.query(`
      INSERT INTO leave_balance_policies
        (leave_type, default_allocation_days, requires_balance, allow_negative, min_notice_days)
      VALUES
        ('Time Off In Lieu', 0, true, false, 0)
      ON CONFLICT (leave_type) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Migration successful: app_settings created, TOIL leave policy added');
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
