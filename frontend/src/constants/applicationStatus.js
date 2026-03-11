/**
 * Author: Igor Michel
 * Purpose: Map procurement request status keys to human-readable labels.
 * Last updated: 2026-03-11
 */
export const REQUEST_STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  manager_approved: 'Manager Approved',
  ict_approved: 'ICT Approved',
  procurement_approved: 'Procurement Approved',
  director_approved: 'Director Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};

export function toRequestStatusLabel(status) {
  return REQUEST_STATUS_LABELS[status] || status;
}

// Legacy alias kept for any remaining imports
export const APPLICATION_STATUS_LABELS = REQUEST_STATUS_LABELS;
export function toApplicationStatusLabel(status) {
  return toRequestStatusLabel(status);
}
