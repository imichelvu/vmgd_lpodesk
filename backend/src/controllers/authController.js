import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

/** Always return YYYY-MM-DD for auth response (pg may return Date object) */
function formatEntryDateForApi(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val.trim())) return val.trim().slice(0, 10);
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const loginId = (email || '').trim();
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Email/username and password required' });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret || String(secret).trim() === '') {
      console.error('Login: JWT_SECRET is missing or empty in .env');
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    }
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.full_name, u.division_id, u.reports_to_id,
              u.vnpf_no, u.post_title, u.post_no, u.grade, u.entry_date,
              d.name as division_name,
              array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN divisions d ON d.id = u.division_id
       WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1)
       GROUP BY u.id, u.full_name, u.username, u.email, u.division_id, u.reports_to_id, u.vnpf_no, u.post_title, u.post_no, u.grade, u.entry_date, d.name`,
      [loginId]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(password, user.password_hash);
    } catch (e) {
      console.error('bcrypt.compare error:', e.message);
      return res.status(500).json({ error: 'Login error' });
    }
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user.id },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    let roleIds = user.role_ids;
    if (typeof roleIds === 'string') {
      try {
        roleIds = roleIds.replace(/^\{|\}$/g, '').split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n));
      } catch {
        roleIds = [];
      }
    }
    if (!Array.isArray(roleIds)) roleIds = roleIds != null ? [roleIds] : [];
    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        division_id: user.division_id,
        reports_to_id: user.reports_to_id,
        vnpf_no: user.vnpf_no ?? '',
        post_title: user.post_title ?? '',
        post_no: user.post_no ?? '',
        grade: user.grade ?? '',
        entry_date: formatEntryDateForApi(user.entry_date),
        division_name: user.division_name ?? '',
        role_ids: roleIds,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
}

export async function me(req, res) {
  const u = req.user;
  res.json({
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    email: u.email,
    division_id: u.division_id,
    reports_to_id: u.reports_to_id,
    vnpf_no: u.vnpf_no ?? '',
    post_title: u.post_title ?? '',
    post_no: u.post_no ?? '',
    grade: u.grade ?? '',
    entry_date: formatEntryDateForApi(u.entry_date),
    division_name: u.division_name ?? '',
    role_ids: u.role_ids || [],
  });
}
