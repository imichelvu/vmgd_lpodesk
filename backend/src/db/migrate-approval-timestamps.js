import '../loadEnv.js';
import pool from './pool.js';

async function run() {
  try {
    await pool.query(`
      ALTER TABLE leave_applications
      ADD COLUMN IF NOT EXISTS pso_approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS director_approved_at TIMESTAMPTZ;
    `);
    console.log('Migration applied: approval timestamp columns added.');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});

