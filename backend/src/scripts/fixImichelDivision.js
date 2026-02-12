import '../loadEnv.js';
import pool from '../db/pool.js';

async function run() {
  const { rows } = await pool.query(
    `UPDATE users SET division_id = (SELECT division_id FROM users WHERE LOWER(username) = 'esaul' LIMIT 1)
     WHERE LOWER(username) = 'imichel'
     RETURNING id, username, division_id`
  );
  console.log('Updated:', rows[0] || 'no rows');
  await pool.end();
}
run();
