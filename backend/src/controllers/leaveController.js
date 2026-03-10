/**
 * Author: Igor Michel
 * Purpose: Handle leave application creation, listing, approvals, and notifications.
 * Last updated: 2026-02-28
 */
import pool from '../db/pool.js';
import { LEAVE_STATUS } from '../constants/roles.js';
import { notifyUser, getNextApprover, getPendingPsoApprovers, notifyApplicant } from '../helpers/notifications.js';
import {
  toPositiveNumber,
  currentYear,
  getBalanceSnapshot,
  getBalanceListForUser,
  assertSufficientBalance,
  assertAdvanceNotice,
} from '../services/leaveBalanceService.js';

function getPaginationParams(query = {}, defaults = { page: 1, pageSize: 20, maxPageSize: 100 }) {
  const pageRaw = Number.parseInt(query.page, 10);
  const pageSizeRaw = Number.parseInt(query.pageSize, 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : defaults.page;
  const pageSizeUncapped = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : defaults.pageSize;
  const pageSize = Math.min(pageSizeUncapped, defaults.maxPageSize);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export async function create(req, res) {
  const userId = req.user.id;
  const {
    leave_type, destination, start_date, end_date, is_half_day,
    half_day_time_start, half_day_time_end, total_working_days, advance_pay,
    advance_pay_date, reason_or_remarks,
  } = req.body;

  if (!leave_type || !start_date || !end_date || total_working_days == null) {
    return res.status(400).json({ error: 'leave_type, start_date, end_date, total_working_days required' });
  }

  // Fetch the applicant's registered signature from their profile
  const { rows: sigRows } = await pool.query(
    'SELECT signature_data FROM users WHERE id = $1',
    [userId]
  );
  const signature_data = sigRows[0]?.signature_data || null;
  if (!signature_data) {
    return res.status(400).json({
      error: 'You must register your signature in My Profile before submitting a leave application.',
    });
  }

  const requestedDays = toPositiveNumber(total_working_days);
  const year = start_date ? new Date(start_date).getFullYear() : currentYear();
  const client = await pool.connect();
  let application;
  try {
    await client.query('BEGIN');
    const balance = await getBalanceSnapshot(client, userId, leave_type, year);
    if (!balance) throw new Error(`Unsupported leave type: ${leave_type}`);
    assertAdvanceNotice(balance, start_date, leave_type);
    assertSufficientBalance(balance, requestedDays, leave_type);

    const { rows } = await client.query(
      `INSERT INTO leave_applications (
        applicant_id, leave_type, destination, start_date, end_date,
        is_half_day, half_day_time_start, half_day_time_end, total_working_days,
        advance_pay, advance_pay_date, reason_or_remarks, status, signature_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId, leave_type, destination || null, start_date, end_date,
        !!is_half_day, half_day_time_start || null, half_day_time_end || null,
        total_working_days, !!advance_pay, advance_pay_date || null,
        reason_or_remarks || null, LEAVE_STATUS.Pending_PSO,
        signature_data ? JSON.stringify(signature_data) : null
      ]
    );
    application = rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: err.message || 'Could not submit leave request' });
  } finally {
    client.release();
  }

  const approvers = await getPendingPsoApprovers(application.id);
  const title = 'New leave application for approval';
  const body = `Leave application #${application.id} from ${req.user.full_name} is pending your approval.`;
  for (const approver of approvers) {
    const email = approver.email && approver.email.trim() ? approver.email.trim() : null;
    if (!email) {
      console.warn('Leave application', application.id, ': approver user id', approver.userId, 'has no email; add email in Admin → Users for email notifications.');
    }
    await notifyUser({
      userId: approver.userId,
      leaveApplicationId: application.id,
      title,
      body,
      sendEmailTo: email,
    });
  }
  if (approvers.length === 0) {
    console.warn('Leave application', application.id, ': no PSO or Manager found to notify (check applicant reports_to_id and division_id).');
  }

  res.status(201).json(application);
}

export async function listBalances(req, res) {
  const year = currentYear();
  const client = await pool.connect();
  try {
    const items = await getBalanceListForUser(client, req.user.id, year);
    res.json({ year, items });
  } finally {
    client.release();
  }
}

/** GET /api/leave/toil-balance — returns the current user's TOIL hours/days snapshot */
export async function toilBalance(req, res) {
  const { getTOILBalance } = await import('../services/leaveBalanceService.js');
  const client = await pool.connect();
  try {
    const balance = await getTOILBalance(client, req.user.id);
    res.json(balance);
  } finally {
    client.release();
  }
}

export async function listMine(req, res) {
  const { rows } = await pool.query(
    `SELECT la.*, d.name as division_name
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     LEFT JOIN divisions d ON d.id = u.division_id
     WHERE la.applicant_id = $1
     ORDER BY la.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

export async function listMineHistory(req, res) {
  const { page, pageSize, offset } = getPaginationParams(req.query);
  const userId = req.user.id;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM leave_applications la
     WHERE la.applicant_id = $1
       AND la.status IN ('Approved', 'Disapproved')`,
    [userId]
  );
  const total = countResult.rows[0]?.total || 0;

  const { rows } = await pool.query(
    `SELECT la.*, d.name as division_name,
            pso.full_name as approved_by_pso_name,
            mgr.full_name as approved_by_manager_name,
            dir.full_name as approved_by_director_name
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     LEFT JOIN divisions d ON d.id = u.division_id
     LEFT JOIN users pso ON pso.id = la.approved_by_pso_id
     LEFT JOIN users mgr ON mgr.id = la.approved_by_manager_id
     LEFT JOIN users dir ON dir.id = la.approved_by_director_id
     WHERE la.applicant_id = $1
       AND la.status IN ('Approved', 'Disapproved')
     ORDER BY COALESCE(la.director_approved_at, la.updated_at) DESC, la.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset]
  );

  res.json({
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function listForSupervisor(req, res) {
  const user = req.user;
  const divisionId = user.division_id;
  const today = new Date().toISOString().slice(0, 10); // used for delegation checks
  const { page, pageSize, offset } = getPaginationParams(req.query);
  const filterDivisionId = req.query.division_id != null ? Number(req.query.division_id) : null;
  const filterLeaveType = req.query.leave_type || null;

  const { rows: acting } = await pool.query(
    `SELECT delegator_id, u.full_name as delegator_name FROM delegations
     JOIN users u ON u.id = delegator_id
     WHERE delegatee_id = $1 AND is_active = true AND $2::date BETWEEN start_date AND end_date`,
    [user.id, today]
  );
  const actingForIds = acting.map(a => a.delegator_id);
  const canActAsIds = [user.id, ...actingForIds];
  const actingForNames = acting.reduce((acc, curr) => { acc[curr.delegator_id] = curr.delegator_name; return acc; }, {});
  const roleIds = (user.role_ids || []).map((r) => Number(r));
  const isManager = roleIds.includes(3);

  // Parameters for the count query
  const baseCountConditions = [`la.status IN ('Pending_PSO', 'Pending_Manager')`];
  const baseCountParams = [];
  let countParamIndex = 1;

  baseCountConditions.push(`(
    (la.status = 'Pending_PSO' AND (u.reports_to_id = ANY($${countParamIndex++}::int[]) OR ($${countParamIndex++}::boolean AND u.division_id = $${countParamIndex++})))\
    OR (la.status = 'Pending_Manager' AND u.division_id = $${countParamIndex++})\
  )`);
  baseCountParams.push(canActAsIds, isManager, divisionId, divisionId); // Duplicate divisionId for Manager check

  if (Number.isFinite(filterDivisionId) && filterDivisionId > 0) {
    baseCountConditions.push(`u.division_id = $${countParamIndex++}`);
    baseCountParams.push(filterDivisionId);
  }
  if (filterLeaveType) {
    baseCountConditions.push(`la.leave_type = $${countParamIndex++}`);
    baseCountParams.push(filterLeaveType);
  }
  const countWhereClause = `WHERE ${baseCountConditions.join(' AND ')}`;
  const countQuery = `SELECT COUNT(*)::int AS total FROM leave_applications la JOIN users u ON u.id = la.applicant_id ${countWhereClause}`;
  const { rows: countRows } = await pool.query(countQuery, baseCountParams);
  const total = countRows[0]?.total || 0;

  // Parameters for the main query
  const mainConditions = [`la.status IN ('Pending_PSO', 'Pending_Manager')`];
  const mainParams = [];
  let mainParamIndex = 1;

  mainConditions.push(`(
    (la.status = 'Pending_PSO' AND (u.reports_to_id = ANY($${mainParamIndex++}::int[]) OR ($${mainParamIndex++}::boolean AND u.division_id = $${mainParamIndex++})))\
    OR (la.status = 'Pending_Manager' AND u.division_id = $${mainParamIndex++})\
  )`);
  mainParams.push(canActAsIds, isManager, divisionId, divisionId); // Duplicate divisionId for Manager check

  if (Number.isFinite(filterDivisionId) && filterDivisionId > 0) {
    mainConditions.push(`u.division_id = $${mainParamIndex++}`);
    mainParams.push(filterDivisionId);
  }
  if (filterLeaveType) {
    mainConditions.push(`la.leave_type = $${mainParamIndex++}`);
    mainParams.push(filterLeaveType);
  }
  const actingDelegateeParam = mainParamIndex++;
  mainParams.push(user.id);
  const actingDateParam = mainParamIndex++;
  mainParams.push(today);
  const mainWhereClause = `WHERE ${mainConditions.join(' AND ')}`;

  const mainQuery = `
    SELECT la.*, u.full_name as applicant_name, u.email as applicant_email, d.name as division_name,
           (
             SELECT u_del.full_name
             FROM delegations del
             JOIN users u_del ON u_del.id = del.delegator_id
             WHERE del.delegatee_id = $${actingDelegateeParam}
               AND del.is_active = true
               AND $${actingDateParam}::date BETWEEN del.start_date AND del.end_date
               AND u.reports_to_id = del.delegator_id
           ) as acting_for_name
    FROM leave_applications la
    JOIN users u ON u.id = la.applicant_id
    LEFT JOIN divisions d ON d.id = u.division_id
    ${mainWhereClause}
    ORDER BY la.created_at ASC
    LIMIT $${mainParamIndex++} OFFSET $${mainParamIndex++}`;
  mainParams.push(pageSize, offset);

  const { rows } = await pool.query(mainQuery, mainParams);

  res.json({
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function listForDirector(req, res) {
  const { page, pageSize, offset } = getPaginationParams(req.query);
  const filterDivisionId = req.query.division_id != null ? Number(req.query.division_id) : null;
  const filterLeaveType = req.query.leave_type || null;
  
  const countParams = [];
  let countParamIndex = 1;
  const countConditions = [`la.status = 'Pending_Director'`];
  if (Number.isFinite(filterDivisionId) && filterDivisionId > 0) {
    countConditions.push(`u.division_id = $${countParamIndex++}`);
    countParams.push(filterDivisionId);
  }
  if (filterLeaveType) {
    countConditions.push(`la.leave_type = $${countParamIndex++}`);
    countParams.push(filterLeaveType);
  }
  const countWhereClause = `WHERE ${countConditions.join(' AND ')}`;
  const countQuery = `SELECT COUNT(*)::int AS total FROM leave_applications la JOIN users u ON u.id = la.applicant_id ${countWhereClause}`;
  const { rows: countRows } = await pool.query(countQuery, countParams);
  const total = countRows[0]?.total || 0;

  const mainParams = [];
  let mainParamIndex = 1;
  const mainConditions = [`la.status = 'Pending_Director'`];
  if (Number.isFinite(filterDivisionId) && filterDivisionId > 0) {
    mainConditions.push(`u.division_id = $${mainParamIndex++}`);
    mainParams.push(filterDivisionId);
  }
  if (filterLeaveType) {
    mainConditions.push(`la.leave_type = $${mainParamIndex++}`);
    mainParams.push(filterLeaveType);
  }
  const mainWhereClause = `WHERE ${mainConditions.join(' AND ')}`;

  const mainQuery = `
    SELECT la.*, u.full_name as applicant_name, d.name as division_name
    FROM leave_applications la
    JOIN users u ON u.id = la.applicant_id
    LEFT JOIN divisions d ON d.id = u.division_id
    ${mainWhereClause}
    ORDER BY la.created_at ASC
    LIMIT $${mainParamIndex++} OFFSET $${mainParamIndex++}`;
  mainParams.push(pageSize, offset);

  const { rows } = await pool.query(mainQuery, mainParams);

  res.json({
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function listSupervisorHistory(req, res) {
  const user = req.user;
  const today = new Date().toISOString().slice(0, 10);
  const { page, pageSize, offset } = getPaginationParams(req.query);
  const filterLeaveType = req.query.leave_type || null;
  const filterFromDate = req.query.from_date || null;
  const filterToDate = req.query.to_date || null;


  const { rows: acting } = await pool.query(
    `SELECT delegator_id FROM delegations
     WHERE delegatee_id = $1 AND is_active = true AND $2::date BETWEEN start_date AND end_date`,
    [user.id, today]
  );
  const actingForIds = acting.map((a) => a.delegator_id);
  const canActAsIds = [user.id, ...actingForIds];
  
  const countConditions = [];
  const countParams = [];
  let countParamIndex = 1;

  countConditions.push(`(la.approved_by_pso_id = ANY($${countParamIndex++}::int[]) OR la.approved_by_manager_id = $${countParamIndex++})`);
  countParams.push(canActAsIds, user.id);

  if (filterLeaveType) {
    countConditions.push(`la.leave_type = $${countParamIndex++}`);
    countParams.push(filterLeaveType);
  }
  if (filterFromDate) {
    countConditions.push(`la.start_date >= $${countParamIndex++}`);
    countParams.push(filterFromDate);
  }
  if (filterToDate) {
    countConditions.push(`la.end_date <= $${countParamIndex++}`);
    countParams.push(filterToDate);
  }
  const countWhereClause = `WHERE ${countConditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM leave_applications la
     ${countWhereClause}`,
    countParams
  );
  const total = countResult.rows[0]?.total || 0;

  const mainConditions = [];
  const mainParams = [];
  let mainParamIndex = 1;

  mainConditions.push(`(la.approved_by_pso_id = ANY($${mainParamIndex++}::int[]) OR la.approved_by_manager_id = $${mainParamIndex++})`);
  mainParams.push(canActAsIds, user.id);

  if (filterLeaveType) {
    mainConditions.push(`la.leave_type = $${mainParamIndex++}`);
    mainParams.push(filterLeaveType);
  }
  if (filterFromDate) {
    mainConditions.push(`la.start_date >= $${mainParamIndex++}`);
    mainParams.push(filterFromDate);
  }
  if (filterToDate) {
    mainConditions.push(`la.end_date <= $${mainParamIndex++}`);
    mainParams.push(filterToDate);
  }
  const mainWhereClause = `WHERE ${mainConditions.join(' AND ')}`;


  const { rows } = await pool.query(
    `SELECT
      la.*,
      u.full_name as applicant_name,
      u.email as applicant_email,
      d.name as division_name,
      CASE
        WHEN la.approved_by_manager_id = $${mainParamIndex - (filterLeaveType ? 2 : 1) - (filterFromDate ? 1 : 0) - (filterToDate ? 1 : 0)} THEN 'Manager'
        WHEN la.approved_by_pso_id = ANY($${mainParamIndex - (filterLeaveType ? 3 : 2) - (filterFromDate ? 1 : 0) - (filterToDate ? 1 : 0)}::int[]) THEN 'PSO'
        ELSE 'Unknown'
      END as acted_as,
      CASE
        WHEN la.approved_by_manager_id = $${mainParamIndex - (filterLeaveType ? 2 : 1) - (filterFromDate ? 1 : 0) - (filterToDate ? 1 : 0)} THEN COALESCE(la.manager_approved_at, la.updated_at)
        WHEN la.approved_by_pso_id = ANY($${mainParamIndex - (filterLeaveType ? 3 : 2) - (filterFromDate ? 1 : 0) - (filterToDate ? 1 : 0)}::int[]) THEN COALESCE(la.pso_approved_at, la.updated_at)
        ELSE la.updated_at
      END as acted_at
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     LEFT JOIN divisions d ON d.id = u.division_id
     ${mainWhereClause}
     ORDER BY acted_at DESC, la.id DESC
     LIMIT $${mainParamIndex++} OFFSET $${mainParamIndex++}`,
    [...mainParams, pageSize, offset]
  );

  res.json({
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function listDirectorHistory(req, res) {
  const { page, pageSize, offset } = getPaginationParams(req.query);
  const userId = req.user.id;
  const filterLeaveType = req.query.leave_type || null;
  const filterFromDate = req.query.from_date || null;
  const filterToDate = req.query.to_date || null;

  const countParams = [];
  let countParamIndex = 1;
  const countConditions = [`la.approved_by_director_id = $${countParamIndex++}`];
  countParams.push(userId);
  if (filterLeaveType) {
    countConditions.push(`la.leave_type = $${countParamIndex++}`);
    countParams.push(filterLeaveType);
  }
  if (filterFromDate) {
    countConditions.push(`la.start_date >= $${countParamIndex++}`);
    countParams.push(filterFromDate);
  }
  if (filterToDate) {
    countConditions.push(`la.end_date <= $${countParamIndex++}`);
    countParams.push(filterToDate);
  }
  const countWhereClause = `WHERE ${countConditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM leave_applications la
     ${countWhereClause}`,
    countParams
  );
  const total = countResult.rows[0]?.total || 0;

  const mainParams = [];
  let mainParamIndex = 1;
  const mainConditions = [`la.approved_by_director_id = $${mainParamIndex++}`];
  mainParams.push(userId);
  if (filterLeaveType) {
    mainConditions.push(`la.leave_type = $${mainParamIndex++}`);
    mainParams.push(filterLeaveType);
  }
  if (filterFromDate) {
    mainConditions.push(`la.start_date >= $${mainParamIndex++}`);
    mainParams.push(filterFromDate);
  }
  if (filterToDate) {
    mainConditions.push(`la.end_date <= $${mainParamIndex++}`);
    mainParams.push(filterToDate);
  }
  const mainWhereClause = `WHERE ${mainConditions.join(' AND ')}`;


  const { rows } = await pool.query(
    `SELECT
      la.*,
      u.full_name as applicant_name,
      u.email as applicant_email,
      d.name as division_name,
      COALESCE(la.director_approved_at, la.updated_at) as acted_at
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     LEFT JOIN divisions d ON d.id = u.division_id
     ${mainWhereClause}
     ORDER BY acted_at DESC, la.id DESC
     LIMIT $${mainParamIndex++} OFFSET $${mainParamIndex++}`,
    [...mainParams, pageSize, offset]
  );

  res.json({
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function getById(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT la.*, u.full_name as applicant_name, u.email as applicant_email, u.vnpf_no, u.post_title, u.post_no, u.grade, u.department, u.ministry, u.entry_date,
            d.name as division_name,
            pso.full_name as approved_by_pso_name, mgr.full_name as approved_by_manager_name, dir.full_name as approved_by_director_name,
            COALESCE((SELECT array_agg(ur.role_id) FROM user_roles ur WHERE ur.user_id = la.approved_by_pso_id), ARRAY[]::int[]) as approved_by_pso_role_ids,
            COALESCE((SELECT array_agg(ur.role_id) FROM user_roles ur WHERE ur.user_id = la.approved_by_manager_id), ARRAY[]::int[]) as approved_by_manager_role_ids
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     LEFT JOIN divisions d ON d.id = u.division_id
     LEFT JOIN users pso ON pso.id = la.approved_by_pso_id
     LEFT JOIN users mgr ON mgr.id = la.approved_by_manager_id
     LEFT JOIN users dir ON dir.id = la.approved_by_director_id
     WHERE la.id = $1`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Application not found' });
  res.json(rows[0]);
}

export async function approveOrDisapprove(req, res) {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;
    const user = req.user;

    if (action === 'disapprove' && !(comment && comment.trim())) {
      return res.status(400).json({ error: 'Comment is mandatory when disapproving' });
    }

    // Always use the approver's registered profile signature — no ad-hoc signing needed
    const { rows: sigRows } = await pool.query(
      'SELECT signature_data FROM users WHERE id = $1',
      [user.id]
    );
    const signatureValue = sigRows[0]?.signature_data || null;
    if (!signatureValue) {
      return res.status(400).json({
        error: 'You must register your signature in My Profile before approving or disapproving applications.',
      });
    }

    const { rows: apps } = await pool.query('SELECT * FROM leave_applications WHERE id = $1', [id]);
    const app = apps[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

  const roleIds = (user.role_ids || []).map((r) => Number(r));
  const isPSO = roleIds.includes(2);
  const isManager = roleIds.includes(3);
  const isDirector = roleIds.includes(4);

  const { rows: applicantRows } = await pool.query(
    'SELECT reports_to_id, division_id FROM users WHERE id = $1',
    [app.applicant_id]
  );
  const applicant = applicantRows[0];
  const today = new Date().toISOString().slice(0, 10);
  const { rows: acting } = await pool.query(
    `SELECT delegator_id FROM delegations
     WHERE delegatee_id = $1 AND is_active = true AND $2::date BETWEEN start_date AND end_date`,
    [user.id, today]
  );
  const actingForIds = acting.map(a => a.delegator_id);
  const canActAsIds = [user.id, ...actingForIds];
  const isApplicantSupervisor = applicant && canActAsIds.includes(applicant.reports_to_id);
  const isApplicantDivisionManager = isManager && applicant && applicant.division_id === user.division_id;
  const canApprovePendingPSO = (isPSO && isApplicantSupervisor) || isApplicantDivisionManager;

  if (app.status === 'Pending_PSO' && canApprovePendingPSO) {
    if (action === 'disapprove') {
      await pool.query(
        `UPDATE leave_applications SET status = $1, pso_comment = $2, approved_by_pso_id = $3, pso_signature_data = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [LEAVE_STATUS.Disapproved, comment?.trim() || null, user.id, signatureValue, id]
      );
      await notifyApplicant(
        parseInt(id, 10),
        'Leave application disapproved',
        `Your leave application #${id} has been disapproved.${comment?.trim() ? ` Comment: ${comment.trim()}` : ''}`
      );
      return res.json({ message: 'Disapproved', status: LEAVE_STATUS.Disapproved });
    }
    await pool.query(
      `UPDATE leave_applications
       SET status = $1,
           approved_by_pso_id = $2,
           pso_signature_data = $3,
           pso_approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [LEAVE_STATUS.Pending_Director, user.id, signatureValue, id]
    );
    const next = await getNextApprover(id);
    if (next) {
      await notifyUser({
        userId: next.userId,
        leaveApplicationId: parseInt(id, 10),
        title: 'Leave application pending Director approval',
        body: `Application #${id} has been approved at PSO level and is pending your approval.`,
        sendEmailTo: next.email,
      });
    }
    return res.json({ message: 'Approved; forwarded to Director', status: LEAVE_STATUS.Pending_Director });
  }

  if (app.status === 'Pending_Manager' && isManager) {
    if (action === 'disapprove') {
      await pool.query(
        `UPDATE leave_applications SET status = $1, manager_comment = $2, approved_by_manager_id = $3, manager_signature_data = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [LEAVE_STATUS.Disapproved, comment?.trim() || null, user.id, signatureValue, id]
      );
      await notifyApplicant(
        parseInt(id, 10),
        'Leave application disapproved',
        `Your leave application #${id} has been disapproved.${comment?.trim() ? ` Comment: ${comment.trim()}` : ''}`
      );
      return res.json({ message: 'Disapproved', status: LEAVE_STATUS.Disapproved });
    }
    await pool.query(
      `UPDATE leave_applications
       SET status = $1,
           approved_by_manager_id = $2,
           manager_signature_data = $3,
           manager_approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [LEAVE_STATUS.Pending_Director, user.id, signatureValue, id]
    );
    const next = await getNextApprover(id);
    if (next) {
      await notifyUser({
        userId: next.userId,
        leaveApplicationId: parseInt(id, 10),
        title: 'Leave application pending Director sign-off',
        body: `Application #${id} is pending your final sign-off.`,
        sendEmailTo: next.email,
      });
    }
    return res.json({ message: 'Approved; forwarded to Director', status: LEAVE_STATUS.Pending_Director });
  }

  if (app.status === 'Pending_Director' && isDirector) {
    if (action === 'disapprove') {
      await pool.query(
        `UPDATE leave_applications SET status = $1, director_comment = $2, approved_by_director_id = $3, director_signature_data = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [LEAVE_STATUS.Disapproved, comment?.trim() || null, user.id, signatureValue, id]
      );
      await notifyApplicant(
        parseInt(id, 10),
        'Leave application disapproved',
        `Your leave application #${id} has been disapproved.${comment?.trim() ? ` Comment: ${comment.trim()}` : ''}`
      );
      return res.json({ message: 'Disapproved', status: LEAVE_STATUS.Disapproved });
    }
    const requestedDays = toPositiveNumber(app.total_working_days);
    const balanceYear = app.start_date ? new Date(app.start_date).getFullYear() : currentYear();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const balance = await getBalanceSnapshot(client, app.applicant_id, app.leave_type, balanceYear, { lock: true });
      assertSufficientBalance(balance, requestedDays, app.leave_type);

      await client.query(
        `UPDATE leave_applications
         SET status = $1,
             approved_by_director_id = $2,
             director_signature_data = $3,
             director_approved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [LEAVE_STATUS.Approved, user.id, signatureValue, id]
      );

      if (balance?.requires_balance && !balance?.allow_negative) {
        await client.query(
          `UPDATE leave_balances
           SET used_days = used_days + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND leave_type = $3 AND year = $4`,
          [requestedDays, app.applicant_id, app.leave_type, balanceYear]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: err.message || 'Could not finalize approval' });
    } finally {
      client.release();
    }

    await notifyApplicant(
      parseInt(id, 10),
      'Leave application approved',
      `Your leave application #${id} has been fully approved.`
    );
    return res.json({ message: 'Approved', status: LEAVE_STATUS.Approved });
  }

  return res.status(403).json({ error: 'You cannot approve this application' });
  } catch (err) {
    console.error('approveOrDisapprove error:', err);
    const msg = err.message || '';
    const hint = /column.*does not exist/i.test(msg)
      ? ' Run the migration: node src/db/migrate-approver-signatures.js (from backend folder).'
      : '';
    return res.status(500).json({
      error: 'Approval request failed',
      detail: msg + hint,
    });
  }
}

/**
 * Admin-only: resend notification emails for all leave applications still pending approval.
 * Use when emails were not sent (e.g. before SMTP was configured or approvers had no email).
 */
export async function resendPendingNotifications(req, res) {
  const { rows: pending } = await pool.query(
    `SELECT la.id, la.status, u.full_name as applicant_name
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     WHERE la.status IN ('Pending_PSO', 'Pending_Manager', 'Pending_Director')
     ORDER BY la.id`
  );

  let emailsSent = 0;
  const messages = [];

  for (const app of pending) {
    if (app.status === 'Pending_PSO') {
      const approvers = await getPendingPsoApprovers(app.id);
      const title = 'Leave application pending your approval';
      const body = `Leave application #${app.id} from ${app.applicant_name} is still pending your approval.`;
      for (const approver of approvers) {
        const email = approver.email && approver.email.trim() ? approver.email.trim() : null;
        if (email) {
          await notifyUser({
            userId: approver.userId,
            leaveApplicationId: app.id,
            title,
            body,
            sendEmailTo: email,
          });
          emailsSent++;
        }
      }
      if (approvers.length > 0) messages.push(`#${app.id} (Pending Superior): notified ${approvers.length} approver(s)`);
      else messages.push(`#${app.id} (Pending Superior): no approvers found`);
    } else {
      const next = await getNextApprover(app.id);
      if (!next) {
        messages.push(`#${app.id} (${app.status}): no approver found`);
        continue;
      }
      const title = app.status === 'Pending_Manager'
        ? 'Leave application pending Manager approval'
        : 'Leave application pending Director sign-off';
      const body = `Leave application #${app.id} from ${app.applicant_name} is still pending your approval.`;
      const email = next.email && next.email.trim() ? next.email.trim() : null;
      if (email) {
        await notifyUser({
          userId: next.userId,
          leaveApplicationId: app.id,
          title,
          body,
          sendEmailTo: email,
        });
        emailsSent++;
      }
      messages.push(`#${app.id} (${app.status}): ${email ? 'email sent' : 'approver has no email'}`);
    }
  }

  res.json({
    message: `Processed ${pending.length} pending application(s), ${emailsSent} email(s) sent.`,
    applicationsProcessed: pending.length,
    emailsSent,
    details: messages,
  });
}

/**
 * Get count of approvals/disapprovals by the current user within a recent period.
 * Default to last 7 days.
 */
export async function getRecentActionsCount(req, res) {
  const userId = req.user.id;
  const days = Number.parseInt(req.query.days, 10) || 7;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM leave_applications
       WHERE (approved_by_pso_id = $1 OR approved_by_manager_id = $1 OR approved_by_director_id = $1)
         AND updated_at >= NOW() - INTERVAL '${days} day'`,
      [userId]
    );
    res.json({ count: rows[0]?.count || 0, days });
  } finally {
    client.release();
  }
}

/**
 * Get all distinct leave types from leave_balance_policies.
 */
export async function getLeaveTypes(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT leave_type FROM leave_balance_policies ORDER BY leave_type'
    );
    res.json(rows.map(row => row.leave_type));
  } catch (error) {
    console.error('Failed to fetch leave types:', error);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
}
