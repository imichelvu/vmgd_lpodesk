/**
 * Author: Igor Michel
 * Purpose: Handle HTTP requests for approval and rejection decisions on procurement requests.
 * Last updated: 2026-03-11
 */
import { getApprovalsByRequest } from '../models/approvalModel.js';
import { processDecision } from '../services/requestService.js';

export async function approve(req, res) {
  await _decide(req, res, 'approved');
}

export async function reject(req, res) {
  await _decide(req, res, 'rejected');
}

async function _decide(req, res, decision) {
  const requestId = parseInt(req.params.id, 10);
  const { comment } = req.body;
  const approverRoleIds = req.user.role_ids || [];

  try {
    const updated = await processDecision(requestId, req.user.id, approverRoleIds, decision, comment);
    res.json(updated);
  } catch (err) {
    if (err.message === 'Request not found') return res.status(404).json({ error: err.message });
    if (err.message.includes('not authorized') || err.message.includes('No action')) {
      return res.status(403).json({ error: err.message });
    }
    console.error('decision error:', err);
    res.status(500).json({ error: 'Failed to process decision' });
  }
}

export async function listApprovals(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const approvals = await getApprovalsByRequest(requestId);
    res.json(approvals);
  } catch (err) {
    console.error('listApprovals error:', err);
    res.status(500).json({ error: 'Failed to load approvals' });
  }
}
