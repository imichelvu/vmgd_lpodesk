import '../loadEnv.js';
import bcrypt from 'bcrypt';
import pool from './pool.js';

const ROLES = { Staff: 1, PSO: 2, Manager: 3, Director: 4, Admin: 5 };
const DIVISIONS = [
  'Admin', 'Geo-Hazards', 'ICT_Engineering', 'Climate', 'Observations', 'Forecast'
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const name of DIVISIONS) {
      await client.query(
        'INSERT INTO divisions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }

    await client.query(`
      INSERT INTO roles (id, role_name) VALUES
        (1, 'Staff'), (2, 'PSO'), (3, 'Manager'), (4, 'Director'), (5, 'Admin')
      ON CONFLICT (role_name) DO NOTHING
    `);

    const hash = await bcrypt.hash('Admin123!', 10);
    const { rows: [adminDiv] } = await client.query("SELECT id FROM divisions WHERE name = 'Admin'");
    const divId = adminDiv?.id ?? 1;

    await client.query(
      `INSERT INTO users (full_name, username, email, password_hash, vnpf_no, post_title, post_no, grade, division_id, reports_to_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         username = EXCLUDED.username,
         updated_at = CURRENT_TIMESTAMP`,
      ['System Admin', 'admin', 'admin@vmgd.gov.vu', hash, 'VNPF001', 'System Administrator', 'POST001', 'Grade', divId]
    );

    const { rows: [admin] } = await client.query('SELECT id FROM users WHERE email = $1', ['admin@vmgd.gov.vu']);
    if (admin) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
        [admin.id, ROLES.Admin]
      );
    }

    await client.query('COMMIT');
    console.log('Seed completed. Default admin: login with admin or admin@vmgd.gov.vu / Admin123!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
