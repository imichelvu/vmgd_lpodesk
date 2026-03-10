/**
 * Author: Igor Michel
 * Purpose: Admin-only controller for app_settings — configurable values like TOIL multiplier.
 * All settings are stored as key/value pairs in the app_settings table.
 */
import pool from '../db/pool.js';

const EDITABLE_KEYS = new Set(['toil_multiplier', 'toil_expiry_months']);

/** GET /api/settings — returns all settings as { key: { value, label, description } } */
export async function getSettings(req, res) {
  const { rows } = await pool.query(
    `SELECT key, value, label, description, updated_at FROM app_settings ORDER BY key`
  );
  const map = {};
  for (const row of rows) {
    map[row.key] = { value: row.value, label: row.label, description: row.description, updated_at: row.updated_at };
  }
  res.json(map);
}

/** GET /api/settings/:key — returns a single setting value */
export async function getSetting(req, res) {
  const { key } = req.params;
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = $1`, [key]);
  if (!rows.length) return res.status(404).json({ error: `Setting "${key}" not found.` });
  res.json({ key, value: rows[0].value });
}

/** PUT /api/settings/:key — admin updates a single setting */
export async function updateSetting(req, res) {
  const { key } = req.params;
  const { value } = req.body || {};

  if (!EDITABLE_KEYS.has(key)) {
    return res.status(403).json({ error: `Setting "${key}" is not editable via this API.` });
  }
  if (value === undefined || value === null || String(value).trim() === '') {
    return res.status(400).json({ error: 'value is required.' });
  }

  // Validate numeric settings
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return res.status(400).json({ error: 'value must be a positive number.' });
  }
  if (key === 'toil_multiplier' && num > 5) {
    return res.status(400).json({ error: 'TOIL multiplier cannot exceed 5.' });
  }
  if (key === 'toil_expiry_months' && (num < 1 || num > 36)) {
    return res.status(400).json({ error: 'TOIL expiry must be between 1 and 36 months.' });
  }

  const { rows } = await pool.query(
    `UPDATE app_settings
     SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
     WHERE key = $3
     RETURNING key, value, label, description, updated_at`,
    [String(num), req.user.id, key]
  );
  if (!rows.length) return res.status(404).json({ error: `Setting "${key}" not found.` });
  res.json(rows[0]);
}
