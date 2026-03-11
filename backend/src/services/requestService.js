/**
 * Author: Igor Michel
 * Purpose: Business logic layer for procurement request operations.
 * Last updated: 2026-03-11
 */
import pool from '../db/pool.js';
import { updateRequestStatus } from '../models/requestModel.js';
import { createApproval } from '../models/approvalModel.js';
import { getNextStatus, getExpectedApproverRole, WORKFLOW_ROLE_IDS } from './workflowService.js';
import { notifyUser, sendEmail } from '../helpers/notifications.js';

/**
 * Submit a draft request (status: draft → submitted).
 */
export async function submitRequest(requestId, userId) {
  const { rows } = await pool.query('SELECT * FROM requests WHERE id = $1', [requestId]);
  const req = rows[0];
  if (!req) throw new Error('Request not found');
  if (req.created_by !== userId) throw new Error('Not authorized');
  if (req.status !== 'draft') throw new Error('Only draft requests can be submitted');
  return updateRequestStatus(requestId, 'submitted');
}

/**
 * Process an approval or rejection decision.
 */
export async function processDecision(requestId, approverId, approverRoleIds, decision, comment) {
  const { rows } = await pool.query('SELECT * FROM requests WHERE id = $1', [requestId]);
  const req = rows[0];
  if (!req) throw new Error('Request not found');

  const expectedRole = getExpectedApproverRole(req.status, req.category);
  if (!expectedRole) throw new Error('No action required at this stage');

  const allowedRoleIds = WORKFLOW_ROLE_IDS[expectedRole] || [];
  const canAct = approverRoleIds.some((rid) => allowedRoleIds.includes(rid));
  if (!canAct) throw new Error('You are not authorized to act on this request at this stage');

  await createApproval({
    request_id: requestId,
    approver_id: approverId,
    role: expectedRole,
    decision,
    comment,
  });

  const nextStatus = getNextStatus(req.status, req.category, decision);
  const updated = await updateRequestStatus(requestId, nextStatus);

  await notifyRequestOwner(req, nextStatus, comment, approverId);

  return updated;
}

async function notifyRequestOwner(req, nextStatus, comment, approverId) {
  const appName = process.env.NOTIFICATION_NAME || 'LPODesk';
  const baseUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  const viewUrl = baseUrl ? `${baseUrl}/requests/${req.id}` : null;

  let title, body;
  if (nextStatus === 'rejected') {
    title = `Request rejected: ${req.title}`;
    body = `Your procurement request "${req.title}" has been rejected.${comment ? `\nComment: ${comment}` : ''}`;
  } else if (nextStatus === 'completed') {
    title = `Request approved: ${req.title}`;
    body = `Your procurement request "${req.title}" has been fully approved and is now complete.`;
  } else {
    title = `Request progressed: ${req.title}`;
    body = `Your procurement request "${req.title}" has been approved and is moving to the next stage.${comment ? `\nComment: ${comment}` : ''}`;
  }

  const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [req.created_by]);
  const ownerEmail = rows[0]?.email || null;

  await notifyUser({
    userId: req.created_by,
    requestId: req.id,
    title,
    body,
    sendEmailTo: ownerEmail,
    viewUrl,
    appName,
  });
}
