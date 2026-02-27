import React from 'react';
import Button from '../Button';

export default function UsersPagination({
  usersTotal,
  usersPage,
  usersLimit,
  usersLoading,
  usersTotalPages,
  paginationPageNumbers,
  onLoadUsers,
}) {
  if (usersTotal <= 0) return null;

  return (
    <div
      className="pagination-bar"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', marginBottom: '1rem' }}
    >
      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Showing {(usersPage - 1) * usersLimit + 1}–{Math.min(usersPage * usersLimit, usersTotal)} of {usersTotal} users
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="secondary"
          disabled={usersPage <= 1 || usersLoading}
          onClick={() => onLoadUsers(usersPage - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>
        {paginationPageNumbers.map((p, i) => (
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 0.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>…</span>
            : (
              <Button
                key={p}
                type="button"
                variant={usersPage === p ? 'primary' : 'secondary'}
                disabled={usersLoading}
                onClick={() => onLoadUsers(p)}
                aria-label={`Page ${p}`}
                aria-current={usersPage === p ? 'page' : undefined}
                style={{ minWidth: 36 }}
              >
                {p}
              </Button>
            )
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={usersPage >= usersTotalPages || usersLoading}
          onClick={() => onLoadUsers(usersPage + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
