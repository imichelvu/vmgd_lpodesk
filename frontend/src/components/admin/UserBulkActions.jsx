import React from 'react';
import Button from '../Button';

export default function UserBulkActions({
  selectedCount,
  usersLoading,
  loading,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
}) {
  if (selectedCount === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
      <Button type="button" variant="secondary" onClick={onSelectAll} disabled={usersLoading}>Select all on page</Button>
      <Button type="button" variant="secondary" onClick={onClearSelection} disabled={usersLoading}>Clear selection</Button>
      <Button type="button" variant="danger" onClick={onBulkDelete} disabled={loading}>
        Delete selected ({selectedCount})
      </Button>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        {selectedCount} user(s) selected
      </span>
    </div>
  );
}
