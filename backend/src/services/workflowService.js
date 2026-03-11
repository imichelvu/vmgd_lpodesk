/**
 * Author: Igor Michel
 * Purpose: Determine next workflow status for a procurement request based on current state and category.
 * Last updated: 2026-03-11
 */

const ICT_CATEGORY = 'ICT Equipment';

/**
 * Returns the next status after an approval, or 'completed'/'rejected'.
 * @param {string} currentStatus - current request status
 * @param {string} category - request category
 * @param {string} decision - 'approved' | 'rejected'
 * @returns {string} next status value
 */
export function getNextStatus(currentStatus, category, decision) {
  if (decision === 'rejected') return 'rejected';

  const isICT = category === ICT_CATEGORY;

  switch (currentStatus) {
    case 'submitted':
      return 'manager_approved';

    case 'manager_approved':
      return isICT ? 'ict_approved' : 'procurement_approved';

    case 'ict_approved':
      return 'procurement_approved';

    case 'procurement_approved':
      return 'director_approved';

    case 'director_approved':
      return 'completed';

    default:
      return currentStatus;
  }
}

/**
 * Returns the approver role string expected to act on a request at its current status.
 * @param {string} status
 * @param {string} category
 * @returns {string|null}
 */
export function getExpectedApproverRole(status, category) {
  const isICT = category === ICT_CATEGORY;
  switch (status) {
    case 'submitted': return 'manager';
    case 'manager_approved': return isICT ? 'ict_manager' : 'procurement';
    case 'ict_approved': return 'procurement';
    case 'procurement_approved': return 'director';
    default: return null;
  }
}

/**
 * Maps a role string to the required role_id(s) from the roles table.
 */
export const WORKFLOW_ROLE_IDS = {
  manager: [3],
  ict_manager: [6],
  procurement: [7],
  director: [4],
};
