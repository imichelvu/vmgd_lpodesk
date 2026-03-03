import pool from '../db/pool.js';

export async function listLeavePolicies(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, leave_type, accrual_rate_per_year, max_carry_over_days, requires_balance, allow_negative, min_notice_days FROM leave_balance_policies ORDER BY leave_type'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error listing leave policies:', error);
    res.status(500).json({ error: 'Failed to retrieve leave policies.' });
  }
}

export async function createLeavePolicy(req, res) {
  const { leave_type, accrual_rate_per_year, max_carry_over_days, requires_balance, allow_negative, min_notice_days } = req.body;

  if (!leave_type || accrual_rate_per_year == null || max_carry_over_days == null || requires_balance == null || allow_negative == null || min_notice_days == null) {
    return res.status(400).json({ error: 'All policy fields are required.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO leave_balance_policies (leave_type, accrual_rate_per_year, max_carry_over_days, requires_balance, allow_negative, min_notice_days)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [leave_type, accrual_rate_per_year, max_carry_over_days, requires_balance, allow_negative, min_notice_days]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating leave policy:', error);
    res.status(500).json({ error: 'Failed to create leave policy.' });
  }
}

export async function updateLeavePolicy(req, res) {
  const { id } = req.params;
  const { leave_type, accrual_rate_per_year, max_carry_over_days, requires_balance, allow_negative, min_notice_days } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Policy ID is required.' });
  }

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (leave_type !== undefined) { updates.push(`leave_type = $${paramIndex++}`); values.push(leave_type); }
  if (accrual_rate_per_year !== undefined) { updates.push(`accrual_rate_per_year = $${paramIndex++}`); values.push(accrual_rate_per_year); }
  if (max_carry_over_days !== undefined) { updates.push(`max_carry_over_days = $${paramIndex++}`); values.push(max_carry_over_days); }
  if (requires_balance !== undefined) { updates.push(`requires_balance = $${paramIndex++}`); values.push(requires_balance); }
  if (allow_negative !== undefined) { updates.push(`allow_negative = $${paramIndex++}`); values.push(allow_negative); }
  if (min_notice_days !== undefined) { updates.push(`min_notice_days = $${paramIndex++}`); values.push(min_notice_days); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No update parameters provided.' });
  }

  values.push(id);

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE leave_balance_policies
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Leave policy not found or no changes made.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(`Error updating leave policy ${id}:`, error);
    res.status(500).json({ error: 'Failed to update leave policy.' });
  }
}

export async function deleteLeavePolicy(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Policy ID is required.' });
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM leave_balance_policies WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Leave policy not found.' });
    }

    res.json({ message: 'Leave policy deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting leave policy ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete leave policy.' });
  }
}

export async function listAccrualTiers(req, res) {
  const { policyId } = req.params;

  if (!policyId) {
    return res.status(400).json({ error: 'Policy ID is required.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, leave_policy_id, min_years_service, max_years_service, accrual_rate_per_year
       FROM leave_accrual_tiers
       WHERE leave_policy_id = $1
       ORDER BY min_years_service`,
      [policyId]
    );
    res.json(rows);
  } catch (error) {
    console.error(`Error listing accrual tiers for policy ${policyId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve accrual tiers.' });
  }
}

export async function createAccrualTier(req, res) {
  const { policyId } = req.params;
  const { min_years_service, max_years_service, accrual_rate_per_year } = req.body;

  if (!policyId || min_years_service == null || max_years_service == null || accrual_rate_per_year == null) {
    return res.status(400).json({ error: 'All accrual tier fields are required.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO leave_accrual_tiers (leave_policy_id, min_years_service, max_years_service, accrual_rate_per_year)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [policyId, min_years_service, max_years_service, accrual_rate_per_year]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(`Error creating accrual tier for policy ${policyId}:`, error);
    res.status(500).json({ error: 'Failed to create accrual tier.' });
  }
}

export async function updateAccrualTier(req, res) {
  const { policyId, tierId } = req.params;
  const { min_years_service, max_years_service, accrual_rate_per_year } = req.body;

  if (!policyId || !tierId) {
    return res.status(400).json({ error: 'Policy ID and Tier ID are required.' });
  }

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (min_years_service !== undefined) { updates.push(`min_years_service = $${paramIndex++}`); values.push(min_years_service); }
  if (max_years_service !== undefined) { updates.push(`max_years_service = $${paramIndex++}`); values.push(max_years_service); }
  if (accrual_rate_per_year !== undefined) { updates.push(`accrual_rate_per_year = $${paramIndex++}`); values.push(accrual_rate_per_year); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No update parameters provided.' });
  }

  values.push(tierId);

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE leave_accrual_tiers
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND leave_policy_id = $${paramIndex + 1}
       RETURNING *`,
      [...values, policyId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Accrual tier not found or no changes made.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(`Error updating accrual tier ${tierId} for policy ${policyId}:`, error);
    res.status(500).json({ error: 'Failed to update accrual tier.' });
  }
}

export async function deleteAccrualTier(req, res) {
  const { policyId, tierId } = req.params;

  if (!policyId || !tierId) {
    return res.status(400).json({ error: 'Policy ID and Tier ID are required.' });
  }

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM leave_accrual_tiers WHERE id = $1 AND leave_policy_id = $2',
      [tierId, policyId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Accrual tier not found.' });
    }

    res.json({ message: 'Accrual tier deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting accrual tier ${tierId} for policy ${policyId}:`, error);
    res.status(500).json({ error: 'Failed to delete accrual tier.' });
  }
}
