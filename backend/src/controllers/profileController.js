/**
 * Author: Igor Michel
 * Purpose: Self-service profile controller — lets any logged-in user manage their own signature.
 * Signature is stored once and reused automatically for leave applications and approvals.
 */
import pool from '../db/pool.js';

const MAX_SIGNATURE_BYTES = 200_000; // ~150 KB base64 PNG — enough for any canvas signature

/** GET /api/profile/signature — returns status + thumbnail (without full data, for header check) */
export async function getSignatureStatus(req, res) {
  const { rows } = await pool.query(
    'SELECT signature_updated_at, (signature_data IS NOT NULL AND signature_data <> \'\') AS has_signature FROM users WHERE id = $1',
    [req.user.id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({
    has_signature: row.has_signature === true,
    updated_at: row.signature_updated_at ?? null,
  });
}

/** GET /api/profile/signature/data — returns the actual base64 PNG (for preview on Profile page) */
export async function getSignatureData(req, res) {
  const { rows } = await pool.query(
    'SELECT signature_data FROM users WHERE id = $1',
    [req.user.id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'User not found' });
  if (!row.signature_data) return res.status(404).json({ error: 'No signature registered' });
  res.json({ signature_data: row.signature_data });
}

/** PUT /api/profile/signature — body: { signature_data: "<base64 dataURL>" } */
export async function saveSignature(req, res) {
  const { signature_data } = req.body || {};

  if (!signature_data || typeof signature_data !== 'string' || !signature_data.trim()) {
    return res.status(400).json({ error: 'signature_data is required' });
  }
  if (!signature_data.startsWith('data:image/')) {
    return res.status(400).json({ error: 'signature_data must be a valid image data URL' });
  }
  if (Buffer.byteLength(signature_data, 'utf8') > MAX_SIGNATURE_BYTES) {
    return res.status(400).json({ error: 'Signature image is too large. Please clear and re-sign.' });
  }

  await pool.query(
    'UPDATE users SET signature_data = $1, signature_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [signature_data.trim(), req.user.id]
  );
  res.json({ message: 'Signature saved successfully', updated_at: new Date().toISOString() });
}

/** DELETE /api/profile/signature — removes the registered signature */
export async function deleteSignature(req, res) {
  await pool.query(
    'UPDATE users SET signature_data = NULL, signature_updated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [req.user.id]
  );
  res.json({ message: 'Signature removed' });
}
