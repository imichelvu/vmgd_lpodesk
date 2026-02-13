import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import pool from '../db/pool.js';
import { ROLE_IDS } from '../constants/roles.js';

export async function list(req, res) {
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.email, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, u.division_id, u.reports_to_id,
            d.name as division_name,
            array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
     FROM users u
     LEFT JOIN divisions d ON d.id = u.division_id
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     GROUP BY u.id, d.name
     ORDER BY u.full_name`
  );
  res.json(rows.map(r => ({ ...r, role_ids: r.role_ids || [] })));
}

export async function getById(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.email, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, u.division_id, u.reports_to_id,
            d.name as division_name,
            array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
     FROM users u
     LEFT JOIN divisions d ON d.id = u.division_id
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     WHERE u.id = $1
     GROUP BY u.id, d.name`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  const u = rows[0];
  res.json({ ...u, role_ids: u.role_ids || [] });
}

export async function create(req, res) {
  const { full_name, username, email, password, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id, role_ids } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email, password required' });
  }
  const usernameVal = username ? String(username).trim().toLowerCase() || null : null;
  if (usernameVal) {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [usernameVal]);
    if (existing.length) return res.status(400).json({ error: 'Username already taken' });
  }
  const password_hash = await bcrypt.hash(password, 10);
  const entryDateVal = entry_date && String(entry_date).trim() ? String(entry_date).trim() : null;
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, username, email, password_hash, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, full_name, username, email, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id, created_at`,
    [full_name, usernameVal, email, password_hash, vnpf_no || null, post_title || null, post_no || null, grade || null, department || null, ministry || null, entryDateVal, division_id || null, reports_to_id || null]
  );
  const user = rows[0];
  const rids = Array.isArray(role_ids) ? role_ids : (role_ids ? [role_ids] : [ROLE_IDS.Staff]);
  for (const rid of rids) {
    await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, rid]);
  }
  const { rows: withRoles } = await pool.query(
    'SELECT role_id FROM user_roles WHERE user_id = $1',
    [user.id]
  );
  user.role_ids = withRoles.map(r => r.role_id);
  res.status(201).json(user);
}

export async function update(req, res) {
  const { id } = req.params;
  const { full_name, username, email, password, vnpf_no, post_title, post_no, grade, department, ministry, entry_date, division_id, reports_to_id, role_ids } = req.body;
  const usernameVal = username !== undefined ? (username ? String(username).trim().toLowerCase() || null : null) : undefined;
  if (usernameVal !== undefined && usernameVal) {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2', [usernameVal, id]);
    if (existing.length) return res.status(400).json({ error: 'Username already taken' });
  }
  const emailVal = email !== undefined ? (email ? String(email).trim() : '') : undefined;
  if (emailVal !== undefined) {
    if (!emailVal) return res.status(400).json({ error: 'Email is required' });
    if (!emailVal.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [emailVal, id]);
    if (existing.length) return res.status(400).json({ error: 'Email already in use by another user' });
  }
  const updates = [];
  const values = [];
  let i = 1;
  if (full_name !== undefined) { updates.push(`full_name = $${i++}`); values.push(full_name); }
  if (usernameVal !== undefined) { updates.push(`username = $${i++}`); values.push(usernameVal); }
  if (emailVal !== undefined) { updates.push(`email = $${i++}`); values.push(emailVal); }
  if (password !== undefined) {
    updates.push(`password_hash = $${i++}`);
    values.push(await bcrypt.hash(password, 10));
  }
  if (vnpf_no !== undefined) { updates.push(`vnpf_no = $${i++}`); values.push(vnpf_no); }
  if (post_title !== undefined) { updates.push(`post_title = $${i++}`); values.push(post_title); }
  if (post_no !== undefined) { updates.push(`post_no = $${i++}`); values.push(post_no); }
  if (grade !== undefined) { updates.push(`grade = $${i++}`); values.push(grade); }
  if (department !== undefined) { updates.push(`department = $${i++}`); values.push(department && String(department).trim() ? String(department).trim() : null); }
  if (ministry !== undefined) { updates.push(`ministry = $${i++}`); values.push(ministry && String(ministry).trim() ? String(ministry).trim() : null); }
  if (entry_date !== undefined) { updates.push(`entry_date = $${i++}`); values.push(entry_date && String(entry_date).trim() ? String(entry_date).trim() : null); }
  if (division_id !== undefined) { updates.push(`division_id = $${i++}`); values.push(division_id); }
  if (reports_to_id !== undefined) { updates.push(`reports_to_id = $${i++}`); values.push(reports_to_id); }
  if (updates.length) {
    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i}`, values);
  }
  if (role_ids !== undefined && Array.isArray(role_ids)) {
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    for (const rid of role_ids) {
      await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [id, rid]);
    }
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.email, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, u.division_id, u.reports_to_id,
            array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
     FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.id = $1 GROUP BY u.id`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json({ ...rows[0], role_ids: rows[0].role_ids || [] });
}

export async function remove(req, res) {
  const { id } = req.params;
  const userId = parseInt(id, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid user id' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET reports_to_id = NULL WHERE reports_to_id = $1', [userId]);
    await client.query('UPDATE leave_applications SET approved_by_pso_id = NULL WHERE approved_by_pso_id = $1', [userId]);
    await client.query('UPDATE leave_applications SET approved_by_manager_id = NULL WHERE approved_by_manager_id = $1', [userId]);
    await client.query('UPDATE leave_applications SET approved_by_director_id = NULL WHERE approved_by_director_id = $1', [userId]);
    const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listRoles(req, res) {
  const { rows } = await pool.query('SELECT id, role_name FROM roles ORDER BY id');
  res.json(rows);
}

export async function listDivisions(req, res) {
  const { rows } = await pool.query('SELECT id, name FROM divisions ORDER BY name');
  res.json(rows);
}

export async function testSmtp(req, res) {
  const toEmail = (req.body?.toEmail || req.query?.toEmail || '').trim();
  if (!toEmail || !toEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid toEmail required (e.g. your@email.com)' });
  }
  const host = process.env.SMTP_HOST;
  if (!host) {
    return res.status(503).json({ error: 'SMTP not configured (SMTP_HOST missing in .env)' });
  }
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  try {
    await transporter.verify();
  } catch (err) {
    return res.status(502).json({ error: 'SMTP connection failed: ' + (err.message || String(err)) });
  }
  const fromAddr = process.env.NOTIFICATION_FROM || 'leave@vmgd.gov.vu';
  const fromName = process.env.NOTIFICATION_NAME;
  const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr;
  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'VMGD Leave System – SMTP test',
      text: 'This is a test email from the VMGD Leave backend. If you received this, SMTP is working.',
    });
    res.json({ ok: true, message: 'Test email sent to ' + toEmail });
  } catch (err) {
    res.status(500).json({ error: 'Send failed: ' + (err.message || String(err)) });
  }
}
