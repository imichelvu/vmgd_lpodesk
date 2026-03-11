/**
 * Author: Igor Michel
 * Purpose: Handle document uploads (supplier quotes, invoices, specifications) for requests.
 * Last updated: 2026-03-11
 */
import path from 'path';
import pool from '../db/pool.js';

export async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const requestId = parseInt(req.body.request_id, 10);
  if (!requestId) return res.status(400).json({ error: 'request_id is required' });

  try {
    const { rows: reqRows } = await pool.query('SELECT id FROM requests WHERE id = $1', [requestId]);
    if (!reqRows.length) return res.status(404).json({ error: 'Request not found' });

    const { rows } = await pool.query(
      `INSERT INTO documents (request_id, file_name, file_path, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [requestId, req.file.originalname, req.file.filename, req.file.mimetype, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('upload error:', err);
    res.status(500).json({ error: 'Failed to save document record' });
  }
}

export async function listByRequest(req, res) {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    const { rows } = await pool.query(
      `SELECT d.*, u.full_name AS uploader_name
       FROM documents d
       JOIN users u ON u.id = d.uploaded_by
       WHERE d.request_id = $1
       ORDER BY d.created_at ASC`,
      [requestId]
    );
    res.json(rows);
  } catch (err) {
    console.error('listByRequest error:', err);
    res.status(500).json({ error: 'Failed to load documents' });
  }
}
