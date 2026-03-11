/**
 * Author: Igor Michel
 * Purpose: Handle HTTP requests for procurement request CRUD and submission.
 * Last updated: 2026-03-11
 */
import {
  createRequest,
  getRequestById,
  getRequestsByUser,
  getAllRequests,
  getPendingRequestsForRole,
} from '../models/requestModel.js';
import { submitRequest } from '../services/requestService.js';
import { ROLE_IDS } from '../constants/roles.js';

const VALID_CATEGORIES = ['ICT Equipment', 'Office Supplies', 'Services', 'Maintenance', 'Consultancy'];
const VALID_PAYMENT_TYPES = ['LPO', 'Direct Payment'];
const VALID_BUDGET_TYPES = ['Recurrent', 'Projects'];

export async function create(req, res) {
  const { title, description, supplier_name, amount, category, payment_type, budget_type, quote_number } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'title and category are required' });
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (payment_type && !VALID_PAYMENT_TYPES.includes(payment_type)) return res.status(400).json({ error: 'Invalid payment type' });
  if (budget_type && !VALID_BUDGET_TYPES.includes(budget_type)) return res.status(400).json({ error: 'Invalid budget type' });

  try {
    const request = await createRequest({
      title: title.trim(),
      description: description?.trim() || null,
      supplier_name: supplier_name?.trim() || null,
      amount: amount ? parseFloat(amount) : null,
      category,
      payment_type: payment_type || 'LPO',
      budget_type: budget_type || null,
      quote_number: quote_number?.trim() || null,
      created_by: req.user.id,
    });
    res.status(201).json(request);
  } catch (err) {
    console.error('createRequest error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
}

export async function getById(req, res) {
  try {
    const request = await getRequestById(parseInt(req.params.id, 10));
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (err) {
    console.error('getById error:', err);
    res.status(500).json({ error: 'Failed to load request' });
  }
}

export async function listMine(req, res) {
  try {
    const requests = await getRequestsByUser(req.user.id);
    res.json(requests);
  } catch (err) {
    console.error('listMine error:', err);
    res.status(500).json({ error: 'Failed to load requests' });
  }
}

export async function listAll(req, res) {
  const roleIds = req.user.role_ids || [];
  const isAdmin = roleIds.includes(ROLE_IDS.Admin);
  const isManager = roleIds.includes(ROLE_IDS.Manager);
  const isICTManager = roleIds.includes(ROLE_IDS.ICTManager);
  const isProcurement = roleIds.includes(ROLE_IDS.Procurement);
  const isDirector = roleIds.includes(ROLE_IDS.Director);

  try {
    let requests;
    if (isAdmin) {
      requests = await getAllRequests({ status: req.query.status, category: req.query.category });
    } else if (isDirector) {
      requests = await getPendingRequestsForRole('director');
    } else if (isProcurement) {
      requests = await getPendingRequestsForRole('procurement');
    } else if (isICTManager) {
      requests = await getPendingRequestsForRole('ict_manager');
    } else if (isManager) {
      requests = await getPendingRequestsForRole('manager');
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    res.json(requests);
  } catch (err) {
    console.error('listAll error:', err);
    res.status(500).json({ error: 'Failed to load requests' });
  }
}

export async function submit(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const updated = await submitRequest(requestId, req.user.id);
    res.json(updated);
  } catch (err) {
    if (err.message === 'Request not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Not authorized') return res.status(403).json({ error: err.message });
    if (err.message.includes('Only draft')) return res.status(400).json({ error: err.message });
    console.error('submit error:', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
}
