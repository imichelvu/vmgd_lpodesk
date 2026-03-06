import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.division_id, u.reports_to_id,
              u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date,
              (u.signature_data IS NOT NULL AND u.signature_data <> '') AS has_signature,
              d.name as division_name,
              array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) as role_ids
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN divisions d ON d.id = u.division_id
       WHERE u.id = $1
       GROUP BY u.id, u.full_name, u.username, u.email, u.division_id, u.reports_to_id, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date, u.signature_data, d.name`,
      [decoded.userId]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }
    const user = rows[0];
    const raw = user.role_ids || [];
    user.role_ids = Array.isArray(raw) ? raw.map((r) => Number(r)).filter((n) => !Number.isNaN(n)) : [];
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
