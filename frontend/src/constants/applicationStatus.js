export const APPLICATION_STATUS_LABELS = {
  Pending_PSO: 'Pending Superior',
  Pending_Manager: 'Pending Manager',
  Pending_Director: 'Pending Director',
  Approved: 'Approved',
  Disapproved: 'Disapproved',
};

export function toApplicationStatusLabel(status) {
  return APPLICATION_STATUS_LABELS[status] || status;
}

