// Role Reference IDs - use these for routing and permissions (not string names)
export const ROLE_IDS = {
  Staff: 1,
  PSO: 2,
  Manager: 3,
  Director: 4,
  Admin: 5,
};

export const ROLE_NAMES = {
  1: 'Staff',
  2: 'PSO',
  3: 'Manager',
  4: 'Director',
  5: 'Admin',
};

export const LEAVE_STATUS = {
  Pending_PSO: 'Pending_PSO',
  Pending_Manager: 'Pending_Manager',
  Pending_Director: 'Pending_Director',
  Approved: 'Approved',
  Disapproved: 'Disapproved',
};
