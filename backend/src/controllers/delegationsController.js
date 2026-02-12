import pool from '../db/pool.js';

export async function list(req, res) {
  const { rows } = await pool.query(
    `SELECT d.*, u1.full_name as delegator_name, u2.full_name as delegatee_name
     FROM delegations d
     JOIN users u1 ON u1.id = d.delegator_id
     JOIN users u2 ON u2.id = d.delegatee_id
     ORDER BY d.start_date DESC`
  );
  res.json(rows);
}

export async function create(req, res) {
  const { delegator_id, delegatee_id, start_date, end_date } = req.body;
  if (!delegator_id || !delegatee_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'delegator_id, delegatee_id, start_date, end_date required' });
  }
  const { rows } = await pool.query(
    `INSERT INTO delegations (delegator_id, delegatee_id, start_date, end_date, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [delegator_id, delegatee_id, start_date, end_date]
  );
  res.status(201).json(rows[0]);
}

export async function update(req, res) {
  const { id } = req.params;
  const { start_date, end_date, is_active } = req.body;
  const updates = [];
  const values = [];
  let i = 1;
  if (start_date !== undefined) { updates.push(`start_date = $${i++}`); values.push(start_date); }
  if (end_date !== undefined) { updates.push(`end_date = $${i++}`); values.push(end_date); }
  if (is_active !== undefined) { updates.push(`is_active = $${i++}`); values.push(!!is_active); }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE delegations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: 'Delegation not found' });
  res.json(rows[0]);
}

export async function remove(req, res) {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM delegations WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Delegation not found' });
  res.json({ message: 'Deleted' });
}
