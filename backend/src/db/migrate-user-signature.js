/**
 * Author: Igor Michel
 * Purpose: Add signature_data column to users table for persistent signature registration.
 * Run once: node src/db/migrate-user-signature.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add signature_data column if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS signature_data TEXT,
      ADD COLUMN IF NOT EXISTS signature_updated_at TIMESTAMPTZ
    `);

    await client.query('COMMIT');
    console.log('Migration successful: signature_data added to users table');
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
