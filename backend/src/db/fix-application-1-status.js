/**
 * One-off: set leave_application id 1 to Pending_Director if it is Pending_Manager.
 * Run from backend: node src/db/fix-application-1-status.js
 */
import '../loadEnv.js';
import pool from './pool.js';

async function run() {
  const { rows, rowCount } = await pool.query(
    `UPDATE leave_applications SET status = 'Pending_Director', updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND status = 'Pending_Manager' RETURNING id, status`
  );
  if (rowCount > 0) {
    console.log('Application 1 updated to Pending_Director:', rows[0]);
  } else {
    const { rows: r } = await pool.query('SELECT id, status FROM leave_applications WHERE id = 1');
    console.log('Application 1 unchanged (not Pending_Manager):', r[0] || 'not found');
  }
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
