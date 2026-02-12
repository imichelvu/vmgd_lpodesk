/**
 * One-off diagnostic: why doesn't manager "esaul" see leave requests from "imichel"?
 * Run from backend: node src/scripts/checkApprovalVisibility.js
 */
import '../loadEnv.js';
import pool from '../db/pool.js';

async function run() {
  try {
    const { rows: staffRows } = await pool.query(
      `SELECT id, username, full_name, email, division_id, reports_to_id
       FROM users WHERE LOWER(username) = $1`,
      ['imichel']
    );
    const { rows: mgrRows } = await pool.query(
      `SELECT id, username, full_name, email, division_id, reports_to_id
       FROM users WHERE LOWER(username) = $1`,
      ['esaul']
    );

    const imichel = staffRows[0];
    const esaul = mgrRows[0];

    if (!imichel) {
      console.log('User "imichel" not found in users table.');
      await pool.end();
      return;
    }
    if (!esaul) {
      console.log('User "esaul" not found in users table.');
      await pool.end();
      return;
    }

    const { rows: esaulRoles } = await pool.query(
      'SELECT role_id FROM user_roles WHERE user_id = $1',
      [esaul.id]
    );
    const roleIds = esaulRoles.map((r) => r.role_id);
    const isManager = roleIds.includes(3);

    const { rows: apps } = await pool.query(
      `SELECT id, status, applicant_id, created_at FROM leave_applications WHERE applicant_id = $1 ORDER BY created_at DESC`,
      [imichel.id]
    );

    console.log('--- imichel (applicant) ---');
    console.log('  id:', imichel.id, '| division_id:', imichel.division_id, '| reports_to_id:', imichel.reports_to_id);

    console.log('\n--- esaul (manager) ---');
    console.log('  id:', esaul.id, '| division_id:', esaul.division_id);
    console.log('  roles (user_roles):', roleIds, '| isManager (has role 3):', isManager);

    console.log('\n--- imichel leave applications ---');
    if (apps.length === 0) console.log('  (none)');
    else apps.forEach((a) => console.log('  id:', a.id, '| status:', a.status));

    const pending = apps.filter((a) => a.status === 'Pending_PSO' || a.status === 'Pending_Manager');
    if (pending.length === 0 && apps.length > 0) {
      console.log('\n→ No applications are in Pending_PSO or Pending_Manager (they may already be approved/disapproved or at Director).');
    } else if (pending.length > 0) {
      const divMatch = imichel.division_id != null && imichel.division_id === esaul.division_id;
      const reportsToEsaul = imichel.reports_to_id === esaul.id;
      console.log('\n→ Why esaul would see these on Approvals list:');
      console.log('  1. esaul has Manager role (3):', isManager ? 'YES' : 'NO');
      console.log('  2. esaul.division_id is set:', esaul.division_id != null ? 'YES (' + esaul.division_id + ')' : 'NO (NULL)');
      console.log('  3. imichel.division_id matches esaul:', divMatch ? 'YES' : 'NO (imichel:', imichel.division_id, ', esaul:', esaul.division_id + ')');
      console.log('  4. imichel.reports_to_id = esaul (PSO path):', reportsToEsaul ? 'YES' : 'NO');
      if (!isManager) console.log('\n  FIX: Assign Manager role (role_id 3) to esaul in Admin → Users → Edit esaul → Roles.');
      if (esaul.division_id == null) console.log('\n  FIX: Set Division for esaul in Admin → Users → Edit esaul → Division.');
      if (imichel.division_id != esaul.division_id) console.log('\n  FIX: Ensure imichel and esaul are in the same division (Admin → Users).');
    }

    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
