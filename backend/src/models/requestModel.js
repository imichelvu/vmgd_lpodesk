/**
 * Author: Igor Michel
 * Purpose: Database queries for procurement requests.
 * Last updated: 2026-03-11
 */
import pool from '../db/pool.js';

export async function createRequest({ title, description, supplier_name, amount, category, payment_type, budget_type, quote_number, created_by }) {
  const { rows } = await pool.query(
    `INSERT INTO requests (title, description, supplier_name, amount, category, payment_type, budget_type, quote_number, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      title,
      description || null,
      supplier_name || null,
      amount || null,
      category,
      payment_type || 'LPO',
      budget_type || null,
      quote_number || null,
      created_by,
    ]
  );
  return rows[0];
}

export async function getRequestById(id) {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name AS requester_name, u.email AS requester_email,
            u.post_title AS requester_post_title, u.division_id
     FROM requests r
     JOIN users u ON u.id = r.created_by
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getRequestsByUser(userId) {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name AS requester_name
     FROM requests r
     JOIN users u ON u.id = r.created_by
     WHERE r.created_by = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getAllRequests({ status, category } = {}) {
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`r.status = $${params.length}`); }
  if (category) { params.push(category); conditions.push(`r.category = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name AS requester_name
     FROM requests r
     JOIN users u ON u.id = r.created_by
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return rows;
}

export async function updateRequestStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

export async function getPendingRequestsForRole(role) {
  const statusMap = {
    manager: 'submitted',
    ict_manager: 'manager_approved',
    procurement: 'ict_approved',
    director: 'procurement_approved',
  };

  // Procurement can also see requests that skipped ICT (manager_approved + non-ICT)
  if (role === 'procurement') {
    const { rows } = await pool.query(
      `SELECT r.*, u.full_name AS requester_name
       FROM requests r
       JOIN users u ON u.id = r.created_by
       WHERE r.status IN ('ict_approved', 'manager_approved')
         AND (r.status = 'ict_approved'
              OR (r.status = 'manager_approved' AND r.category != 'ICT Equipment'))
       ORDER BY r.created_at DESC`
    );
    return rows;
  }

  // ICT manager only sees ICT Equipment requests
  if (role === 'ict_manager') {
    const { rows } = await pool.query(
      `SELECT r.*, u.full_name AS requester_name
       FROM requests r
       JOIN users u ON u.id = r.created_by
       WHERE r.status = 'manager_approved' AND r.category = 'ICT Equipment'
       ORDER BY r.created_at DESC`
    );
    return rows;
  }

  const expectedStatus = statusMap[role];
  if (!expectedStatus) return [];
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name AS requester_name
     FROM requests r
     JOIN users u ON u.id = r.created_by
     WHERE r.status = $1
     ORDER BY r.created_at DESC`,
    [expectedStatus]
  );
  return rows;
}
