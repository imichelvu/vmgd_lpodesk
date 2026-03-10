/**
 * Author: Igor Michel
 * Purpose: Admin CRUD for leave_balance_policies and leave_accrual_tiers.
 * Schema reality: leave_balance_policies PK = leave_type (text).
 *                 leave_accrual_tiers PK = (leave_type, min_years); value column = monthly_days.
 */
import pool from '../db/pool.js';

// ─── Policies ────────────────────────────────────────────────────────────────

export async function listLeavePolicies(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT leave_type, default_allocation_days, requires_balance, allow_negative, min_notice_days
       FROM leave_balance_policies
       ORDER BY leave_type`
    );
    res.json(rows);
  } catch (err) {
    console.error('listLeavePolicies error:', err);
    res.status(500).json({ error: 'Failed to retrieve leave policies.' });
  }
}

export async function createLeavePolicy(req, res) {
  const { leave_type, default_allocation_days, requires_balance, allow_negative, min_notice_days } = req.body || {};
  if (!leave_type || !String(leave_type).trim()) {
    return res.status(400).json({ error: 'leave_type is required.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO leave_balance_policies (leave_type, default_allocation_days, requires_balance, allow_negative, min_notice_days)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        String(leave_type).trim(),
        Number(default_allocation_days) || 0,
        requires_balance !== false,
        !!allow_negative,
        Number.parseInt(min_notice_days, 10) || 0,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Leave type "${leave_type}" already exists.` });
    }
    console.error('createLeavePolicy error:', err);
    res.status(500).json({ error: 'Failed to create leave policy.' });
  }
}

export async function updateLeavePolicy(req, res) {
  const leaveType = decodeURIComponent(req.params.leaveType);
  const { default_allocation_days, requires_balance, allow_negative, min_notice_days } = req.body || {};

  const updates = [];
  const values = [];
  let i = 1;
  if (default_allocation_days !== undefined) { updates.push(`default_allocation_days = $${i++}`); values.push(Number(default_allocation_days) || 0); }
  if (requires_balance     !== undefined) { updates.push(`requires_balance = $${i++}`);     values.push(!!requires_balance); }
  if (allow_negative       !== undefined) { updates.push(`allow_negative = $${i++}`);       values.push(!!allow_negative); }
  if (min_notice_days      !== undefined) { updates.push(`min_notice_days = $${i++}`);      values.push(Number.parseInt(min_notice_days, 10) || 0); }

  if (!updates.length) return res.status(400).json({ error: 'No update fields provided.' });
  values.push(leaveType);

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE leave_balance_policies
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE leave_type = $${i}
       RETURNING *`,
      values
    );
    if (!rowCount) return res.status(404).json({ error: 'Leave policy not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('updateLeavePolicy error:', err);
    res.status(500).json({ error: 'Failed to update leave policy.' });
  }
}

export async function deleteLeavePolicy(req, res) {
  const leaveType = decodeURIComponent(req.params.leaveType);
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM leave_balance_policies WHERE leave_type = $1',
      [leaveType]
    );
    if (!rowCount) return res.status(404).json({ error: 'Leave policy not found.' });
    res.json({ message: 'Leave policy deleted.' });
  } catch (err) {
    console.error('deleteLeavePolicy error:', err);
    res.status(500).json({ error: 'Failed to delete leave policy.' });
  }
}

// ─── Accrual Tiers ────────────────────────────────────────────────────────────
// PK: (leave_type, min_years). Value column: monthly_days (days per month accrued).

export async function listAccrualTiers(req, res) {
  const leaveType = decodeURIComponent(req.params.leaveType);
  try {
    const { rows } = await pool.query(
      `SELECT leave_type, min_years, monthly_days
       FROM leave_accrual_tiers
       WHERE leave_type = $1
       ORDER BY min_years`,
      [leaveType]
    );
    res.json(rows);
  } catch (err) {
    console.error('listAccrualTiers error:', err);
    res.status(500).json({ error: 'Failed to retrieve accrual tiers.' });
  }
}

export async function createAccrualTier(req, res) {
  const leaveType = decodeURIComponent(req.params.leaveType);
  const { min_years, monthly_days } = req.body || {};
  if (min_years === undefined || min_years === null || monthly_days === undefined || monthly_days === null) {
    return res.status(400).json({ error: 'min_years and monthly_days are required.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO leave_accrual_tiers (leave_type, min_years, monthly_days)
       VALUES ($1, $2, $3)
       ON CONFLICT (leave_type, min_years)
       DO UPDATE SET monthly_days = EXCLUDED.monthly_days, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [leaveType, Number.parseInt(min_years, 10), Number(monthly_days)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createAccrualTier error:', err);
    res.status(500).json({ error: 'Failed to create accrual tier.' });
  }
}

export async function updateAccrualTier(req, res) {
  const leaveType = decodeURIComponent(req.params.leaveType);
  const minYears  = Number.parseInt(req.params.minYears, 10);
  const { monthly_days } = req.body || {};
  if (monthly_days === undefined || monthly_days === null) {
    return res.status(400).json({ error: 'monthly_days is required.' });
  }
  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE leave_accrual_tiers
       SET monthly_days = $1, updated_at = CURRENT_TIMESTAMP
       WHERE leave_type = $2 AND min_years = $3
       RETURNING *`,
      [Number(monthly_days), leaveType, minYears]
    );
    if (!rowCount) return res.status(404).json({ error: 'Accrual tier not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('updateAccrualTier error:', err);
    res.status(500).json({ error: 'Failed to update accrual tier.' });
  }
}

export async function deleteAccrualTier(req, res) {
  const leaveType = decodeURIComponent(req.params.leaveType);
  const minYears  = Number.parseInt(req.params.minYears, 10);
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM leave_accrual_tiers WHERE leave_type = $1 AND min_years = $2',
      [leaveType, minYears]
    );
    if (!rowCount) return res.status(404).json({ error: 'Accrual tier not found.' });
    res.json({ message: 'Accrual tier deleted.' });
  } catch (err) {
    console.error('deleteAccrualTier error:', err);
    res.status(500).json({ error: 'Failed to delete accrual tier.' });
  }
}
