/**
 * Author: Igor Michel
 * Purpose: Render a colored badge for procurement request statuses.
 * Last updated: 2026-03-11
 */
import React from 'react';
import { toRequestStatusLabel } from '../constants/applicationStatus';

function toneClassForStatus(status) {
  if (status === 'completed' || status === 'director_approved') return 'status-badge-success';
  if (status === 'rejected') return 'status-badge-danger';
  if (status === 'draft') return 'status-badge-default';
  return 'status-badge-warning';
}

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${toneClassForStatus(status)}`}>
      {toRequestStatusLabel(status)}
    </span>
  );
}
