import React from 'react';
import { toApplicationStatusLabel } from '../constants/applicationStatus';

function toneClassForStatus(status) {
  if (status === 'Approved') return 'status-badge-success';
  if (status === 'Disapproved') return 'status-badge-danger';
  if (String(status || '').startsWith('Pending')) return 'status-badge-warning';
  return 'status-badge-default';
}

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${toneClassForStatus(status)}`}>
      {toApplicationStatusLabel(status)}
    </span>
  );
}

