/**
 * One-off migration: add approver signature columns to leave_applications.
 * Run with: node src/db/migrate-approver-signatures.js (from backend dir)
 */
import '../loadEnv.js';
import pool from './pool.js';

const SQL = `
  ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS pso_signature_data TEXT;
  ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS manager_signature_data TEXT;
  ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS director_signature_data TEXT;
`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('Approver signature columns added (or already present).');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
