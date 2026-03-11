/**
 * Author: Igor Michel
 * Purpose: Define role IDs, names, and request status constants for LPODesk.
 * Last updated: 2026-03-11
 */

export const ROLE_IDS = {
  Staff: 1,
  PSO: 2,
  Manager: 3,
  Director: 4,
  Admin: 5,
  ICTManager: 6,
  Procurement: 7,
};

export const ROLE_NAMES = {
  1: 'Staff',
  2: 'PSO',
  3: 'Manager',
  4: 'Director',
  5: 'Admin',
  6: 'ICT Manager',
  7: 'Procurement Officer',
};

export const REQUEST_STATUS = {
  draft: 'draft',
  submitted: 'submitted',
  manager_approved: 'manager_approved',
  ict_approved: 'ict_approved',
  procurement_approved: 'procurement_approved',
  director_approved: 'director_approved',
  rejected: 'rejected',
  completed: 'completed',
};
