/**
 * Author: Igor Michel
 * Purpose: Database queries for request approvals.
 * Last updated: 2026-03-11
 */
import pool from '../db/pool.js';

export async function createApproval({ request_id, approver_id, role, decision, comment }) {
  const { rows } = await pool.query(
    `INSERT INTO approvals (request_id, approver_id, role, decision, comment, approved_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [request_id, approver_id, role, decision, comment || null]
  );
  return rows[0];
}

export async function getApprovalsByRequest(requestId) {
  const { rows } = await pool.query(
    `SELECT a.*, u.full_name AS approver_name, u.post_title AS approver_post_title
     FROM approvals a
     JOIN users u ON u.id = a.approver_id
     WHERE a.request_id = $1
     ORDER BY a.approved_at ASC`,
    [requestId]
  );
  return rows;
}

export async function hasApproverActed(requestId, approverId) {
  const { rows } = await pool.query(
    `SELECT id FROM approvals WHERE request_id = $1 AND approver_id = $2`,
    [requestId, approverId]
  );
  return rows.length > 0;
}
