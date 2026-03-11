/**
 * Author: Igor Michel
 * Purpose: Add payment_type, budget_type, and quote_number fields to requests table.
 * Last updated: 2026-03-11
 */
import '../loadEnv.js';
import pool from './pool.js';

const sql = `
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'LPO'
    CHECK (payment_type IN ('LPO', 'Direct Payment')),
  ADD COLUMN IF NOT EXISTS budget_type  TEXT
    CHECK (budget_type IN ('Recurrent', 'Projects')),
  ADD COLUMN IF NOT EXISTS quote_number TEXT;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Request fields migration completed: payment_type, budget_type, quote_number added.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
