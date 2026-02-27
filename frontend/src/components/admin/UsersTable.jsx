import React from 'react';
import Button from '../Button';

export default function UsersTable({
  users,
  usersLoading,
  divisionFilter,
  selectedUserIds,
  roles,
  parseRoleIds,
  onToggleUserSelection,
  onSelectAllOnPage,
  onClearSelection,
  onEditUser,
  onDeleteUser,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 44 }}>
              <input
                type="checkbox"
                checked={users.length > 0 && users.every((u) => selectedUserIds.has(u.id))}
                onChange={(e) => (e.target.checked ? onSelectAllOnPage() : onClearSelection())}
                disabled={usersLoading || users.length === 0}
                aria-label="Select all on page"
              />
            </th>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Division</th>
            <th>Roles</th>
            <th style={{ width: 160 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {usersLoading ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                Loading users…
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                {divisionFilter ? 'No users in this division.' : 'No users on this page.'}
              </td>
            </tr>
          ) : users.map((u) => (
            <tr key={u.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(u.id)}
                  onChange={() => onToggleUserSelection(u.id)}
                  aria-label={`Select ${u.full_name}`}
                />
              </td>
              <td><strong>{u.full_name}</strong></td>
              <td>{u.username || '—'}</td>
              <td>{u.email}</td>
              <td>{u.division_name || '—'}</td>
              <td>
                <div className="badge-group">
                  {parseRoleIds(u.role_ids).map((rid) => {
                    const role = roles.find((x) => x.id === rid);
                    return role ? <span key={role.id} className="badge">{role.role_name}</span> : null;
                  })}
                  {parseRoleIds(u.role_ids).length === 0 && '—'}
                </div>
              </td>
              <td>
                <div className="actions-cell">
                  <Button type="button" variant="secondary" onClick={() => onEditUser(u)}>Edit</Button>
                  <Button type="button" variant="danger" onClick={() => onDeleteUser(u)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
