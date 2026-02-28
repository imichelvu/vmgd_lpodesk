/**
 * Author: Igor Michel
 * Purpose: Handle leave application creation, listing, approvals, and notifications.
 * Last updated: 2026-02-28
 */
import pool from '../db/pool.js';
import { LEAVE_STATUS } from '../constants/roles.js';
import { notifyUser, getNextApprover, getPendingPsoApprovers, notifyApplicant } from '../helpers/notifications.js';

export async function create(req, res) {
  const userId = req.user.id;
  const {
    leave_type, destination, start_date, end_date, is_half_day,
    half_day_time_start, half_day_time_end, total_working_days, advance_pay,
    advance_pay_date, reason_or_remarks, signature_data
  } = req.body;

  if (!leave_type || !start_date || !end_date || total_working_days == null) {
    return res.status(400).json({ error: 'leave_type, start_date, end_date, total_working_days required' });
  }

  const { rows } = await pool.query(
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
  const application = rows[0];

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

export async function listForSupervisor(req, res) {
  const user = req.user;
  const divisionId = user.division_id;
  const today = new Date().toISOString().slice(0, 10);

  const { rows: acting } = await pool.query(
    `SELECT delegator_id FROM delegations
     WHERE delegatee_id = $1 AND is_active = true AND $2::date BETWEEN start_date AND end_date`,
    [user.id, today]
  );
  const actingForIds = acting.map(a => a.delegator_id);
  const canActAsIds = [user.id, ...actingForIds];
  const roleIds = (user.role_ids || []).map((r) => Number(r));
  const isManager = roleIds.includes(3);

  const { rows } = await pool.query(
    `SELECT la.*, u.full_name as applicant_name, u.email as applicant_email, d.name as division_name
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     LEFT JOIN divisions d ON d.id = u.division_id
     WHERE la.status IN ('Pending_PSO', 'Pending_Manager')
       AND (
         (la.status = 'Pending_PSO' AND (u.reports_to_id = ANY($1::int[]) OR ($2::boolean AND u.division_id = $3)))
         OR (la.status = 'Pending_Manager' AND u.division_id = $3)
       )
     ORDER BY la.created_at ASC`,
    [canActAsIds, isManager, divisionId]
  );
  res.json(rows);
}

export async function listForDirector(req, res) {
  const { rows } = await pool.query(
    `SELECT la.*, u.full_name as applicant_name, d.name as division_name
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     LEFT JOIN divisions d ON d.id = u.division_id
     WHERE la.status = 'Pending_Director'
     ORDER BY la.created_at ASC`
  );
  res.json(rows);
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
    const { action, comment, approver_signature_data } = req.body;
    const user = req.user;

    if (action === 'disapprove' && !(comment && comment.trim())) {
      return res.status(400).json({ error: 'Comment is mandatory when disapproving' });
    }
    if (!(approver_signature_data && typeof approver_signature_data === 'string' && approver_signature_data.trim())) {
      return res.status(400).json({ error: 'Approver signature is required before approving or disapproving' });
    }
    const signatureValue = approver_signature_data.trim();

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
    await pool.query(
      `UPDATE leave_applications
       SET status = $1,
           approved_by_director_id = $2,
           director_signature_data = $3,
           director_approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [LEAVE_STATUS.Approved, user.id, signatureValue, id]
    );
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
