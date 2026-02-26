import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { sendPasswordResetEmail } from '../helpers/notifications.js';

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
              u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date,
              d.name as division_name,
              array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN divisions d ON d.id = u.division_id
       WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1)
       GROUP BY u.id, u.full_name, u.username, u.email, u.division_id, u.reports_to_id, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, d.name`,
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
        department: user.department ?? '',
        ministry: user.ministry ?? '',
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
    department: u.department ?? '',
    ministry: u.ministry ?? '',
    entry_date: formatEntryDateForApi(u.entry_date),
    division_name: u.division_name ?? '',
    role_ids: u.role_ids || [],
  });
}

const RESET_TOKEN_EXPIRY_HOURS = 1;
const APP_NAME = (process.env.APP_NAME || 'Leave Application').trim();

/** POST /auth/forgot-password - body: { email }. Sends reset link to user's email if account exists. */
export async function forgotPassword(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    const baseUrl = (process.env.APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!baseUrl) {
      console.warn('APP_URL / FRONTEND_URL not set – password reset link may be wrong');
    }
    const { rows: users } = await pool.query(
      'SELECT id, email FROM users WHERE LOWER(email) = $1',
      [email]
    );
    const user = users[0];
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );
      const resetLink = baseUrl ? `${baseUrl}/reset-password?token=${encodeURIComponent(token)}` : '';
      if (resetLink) {
        await sendPasswordResetEmail(user.email, resetLink, APP_NAME || 'Leave Application');
      } else {
        console.warn('Cannot send password reset email: no APP_URL/FRONTEND_URL');
      }
    }
    res.status(200).json({
      message: "If an account exists with that email, we've sent a password reset link. Please check your inbox.",
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    next(err);
  }
}

/** POST /auth/reset-password - body: { token, newPassword }. Validates token and sets new password. */
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body || {};
    const rawToken = (token || '').trim();
    const password = typeof newPassword === 'string' ? newPassword : '';
    if (!rawToken || !password || password.length < 6) {
      return res.status(400).json({ error: 'Token and a new password (at least 6 characters) are required' });
    }
    const { rows: tokens } = await pool.query(
      'SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = $1',
      [rawToken]
    );
    const row = tokens[0];
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }
    if (new Date(row.expires_at) < new Date()) {
      await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, row.user_id]);
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [rawToken]);
    res.status(200).json({ message: 'Password has been reset. You can now sign in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    next(err);
  }
}
