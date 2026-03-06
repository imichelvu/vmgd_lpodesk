import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import UsersSectionHeader from '../components/admin/UsersSectionHeader';
import DivisionFilter from '../components/admin/DivisionFilter';
import UsersSearchFilter from '../components/admin/UsersSearchFilter';
import UserBulkActions from '../components/admin/UserBulkActions';
import UsersTable from '../components/admin/UsersTable';
import UsersPagination from '../components/admin/UsersPagination';
import UserFormModal from '../components/admin/UserFormModal';
import DelegationManagement from '../components/admin/DelegationManagement';
import UserBalanceManagement from '../components/admin/UserBalanceManagement';
import LeavePolicyManagement from '../components/admin/LeavePolicyManagement'; // Import new component

const emptyUserForm = (defaultRoleId) => ({
  full_name: '',
  username: '',
  email: '',
  password: '',
  vnpf_no: '',
  post_title: '',
  post_no: '',
  grade: '',
  department: '',
  ministry: '',
  entry_date: '',
  division_id: '',
  reports_to_id: '',
  role_ids: defaultRoleId != null ? [defaultRoleId] : [],
});

const parseRoleIds = (roleIds) => {
  if (Array.isArray(roleIds)) return roleIds.map(Number).filter((n) => !Number.isNaN(n));
  if (typeof roleIds === 'string') return roleIds.replace(/^\{|\}$/g, '').split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n));
  return [];
};

export default function AdminView() {
  const { request } = useApi();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [tab, setTab] = useState('users');
  const [userForm, setUserForm] = useState(null);
  /** Single: { type: 'single', id, full_name }. Bulk: { type: 'bulk', count }. Same modal for both. */
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendResult, setResendResult] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adUsername, setAdUsername] = useState('');
  const [adPassword, setAdPassword] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [adFetchedUsers, setAdFetchedUsers] = useState([]);
  const [adSelectedUsernames, setAdSelectedUsernames] = useState(new Set());
  const [adSearchFilter, setAdSearchFilter] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(20);
  const [usersTotal, setUsersTotal] = useState(0);
  const [allUsersForSelect, setAllUsersForSelect] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [selectedUserForBalances, setSelectedUserForBalances] = useState(null);

  const loadUsers = useCallback((page = 1, divisionIdOverride = undefined, searchOverride = undefined) => {
    setUsersLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(usersLimit) });
    const division = divisionIdOverride !== undefined ? divisionIdOverride : divisionFilter;
    const search = searchOverride !== undefined ? searchOverride : usersSearch;
    if (division) params.set('division_id', division);
    if (search && String(search).trim()) params.set('q', String(search).trim());
    return request(`/users?${params.toString()}`)
      .then((data) => {
        setUsers(data.users || []);
        setUsersTotal(data.total ?? 0);
        setUsersPage(data.page ?? page);
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [request, usersLimit, divisionFilter, usersSearch]);

  const loadAllUsersForSelect = useCallback(() => {
    return request('/users?limit=5000')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.users ?? []);
        setAllUsersForSelect(list);
      })
      .catch(() => {});
  }, [request]);

  const loadRoles = useCallback(() => request('/users/roles').then(setRoles).catch(() => {}), [request]);
  const loadDivisions = useCallback(() => request('/users/divisions').then(setDivisions).catch(() => {}), [request]);

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));

  const paginationPageNumbers = useMemo(() => {
    const total = usersTotalPages;
    const current = usersPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total]);
    pages.add(current);
    if (current > 1) pages.add(current - 1);
    if (current < total) pages.add(current + 1);
    if (current > 2) pages.add(2);
    if (current < total - 1) pages.add(total - 1);
    const sorted = [...pages].sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const p of sorted) {
      if (p > prev + 1) out.push('...');
      out.push(p);
      prev = p;
    }
    return out;
  }, [usersTotalPages, usersPage]);

  useEffect(() => {
    loadDivisions();
    loadRoles();
    loadUsers(1);
    loadAllUsersForSelect();
  }, [loadDivisions, loadRoles, loadUsers, loadAllUsersForSelect]);

  const handleSaveUser = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const method = formData.mode === 'create' ? 'POST' : 'PATCH';
      const url = formData.mode === 'create' ? '/users' : `/users/${formData.id}`;
      const body = {
        full_name: formData.full_name?.trim() || '',
        username: formData.username?.trim() || null,
        email: (formData.email || '').trim(),
        vnpf_no: formData.vnpf_no || null,
        post_title: formData.post_title || null,
        post_no: formData.post_no || null,
        grade: formData.grade || null,
        department: formData.department?.trim() || null,
        ministry: formData.ministry?.trim() || null,
        entry_date: formData.entry_date?.trim() || null,
        division_id: formData.division_id ? parseInt(formData.division_id, 10) : null,
        reports_to_id: formData.reports_to_id ? parseInt(formData.reports_to_id, 10) : null,
        role_ids: formData.role_ids || [],
      };
      if (formData.password && formData.password.trim()) body.password = formData.password;

      await request(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setUserForm(null);
      loadUsers(usersPage);
      loadAllUsersForSelect();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditUser = useCallback((u) => {
    setUserForm({
      mode: 'edit',
      id: u.id,
      full_name: u.full_name || '',
      username: u.username || '',
      email: u.email || '',
      password: '',
      vnpf_no: u.vnpf_no || '',
      post_title: u.post_title || '',
      post_no: u.post_no || '',
      grade: u.grade || '',
      department: u.department ?? '',
      ministry: u.ministry ?? '',
      entry_date: u.entry_date ? String(u.entry_date).slice(0, 10) : '',
      division_id: u.division_id ?? '',
      reports_to_id: u.reports_to_id ?? '',
      role_ids: parseRoleIds(u.role_ids),
    });
    setError('');
  }, []);

  const handleDeleteUser = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'single') return;
    setLoading(true);
    setError('');
    try {
      await request(`/users/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      loadUsers(usersPage);
      loadAllUsersForSelect();
      clearUserSelection();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = useCallback((id) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllUsersOnPage = useCallback(() => {
    setSelectedUserIds(new Set(users.map((u) => u.id)));
  }, [users]);

  const clearUserSelection = useCallback(() => {
    setSelectedUserIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'bulk' || selectedUserIds.size === 0) return;
    setLoading(true);
    setError('');
    try {
      await request('/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedUserIds] }),
      });
      setDeleteConfirm(null);
      clearUserSelection();
      loadUsers(usersPage);
      loadAllUsersForSelect();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendPendingEmails = async () => {
    setError('');
    setResendResult(null);
    setResendLoading(true);
    try {
      const data = await request('/leave/resend-pending-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setResendResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const openAdModal = useCallback(() => {
    setAdModalOpen(true);
    setAdUsername('');
    setAdPassword('');
    setSyncResult(null);
    setSyncError('');
    setAdFetchedUsers([]);
    setAdSelectedUsernames(new Set());
    setAdSearchFilter('');
  }, []);

  const handleFetchFromAd = async (e) => {
    e.preventDefault();
    if (!adUsername.trim() || !adPassword) {
      setSyncError('AD username and password are required');
      return;
    }
    setSyncLoading(true);
    setSyncError('');
    setSyncResult(null);
    setAdFetchedUsers([]);
    setAdSelectedUsernames(new Set());
    try {
      const data = await request('/users/sync-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_username: adUsername.trim(), ad_password: adPassword, dry_run: true }),
      });
      const users = data.users || [];
      setAdFetchedUsers(users);
      setAdSelectedUsernames(new Set(users.map((u) => u.username).filter(Boolean)));
      setAdSearchFilter('');
      setAdPassword('');
    } catch (err) {
      setSyncError(err.message || 'Fetch failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const toggleAdUser = useCallback((username) => {
    setAdSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }, []);

  const adSearchLower = adSearchFilter.trim().toLowerCase();
  const adFilteredUsers = useMemo(() => {
    return adSearchLower
      ? adFetchedUsers.filter((u) => {
          const name = (u.full_name || '').toLowerCase();
          const un = (u.username || '').toLowerCase();
          const em = (u.email || '').toLowerCase();
          const div = (u.division_name || '').toLowerCase();
          return name.includes(adSearchLower) || un.includes(adSearchLower) || em.includes(adSearchLower) || div.includes(adSearchLower);
        })
      : adFetchedUsers;
  }, [adFetchedUsers, adSearchLower]);

  const selectAllAdUsers = useCallback((visibleOnly = false) => {
    const list = visibleOnly && adSearchFilter.trim() ? adFilteredUsers : adFetchedUsers;
    setAdSelectedUsernames(new Set(list.map((u) => u.username).filter(Boolean)));
  }, [adSearchFilter, adFilteredUsers, adFetchedUsers]);

  const deselectAllAdUsers = useCallback((visibleOnly = false) => {
    if (visibleOnly && adSearchFilter.trim()) {
      const visible = new Set(adFilteredUsers.map((u) => u.username).filter(Boolean));
      setAdSelectedUsernames((prev) => {
        const next = new Set(prev);
        visible.forEach((u) => next.delete(u));
        return next;
      });
    } else {
      setAdSelectedUsernames(new Set());
    }
  }, [adSearchFilter, adFilteredUsers]);

  const handleImportSelectedAdUsers = async () => {
    const toImport = adFetchedUsers.filter((u) => u.username && adSelectedUsernames.has(u.username));
    if (toImport.length === 0) {
      setSyncError('Select at least one user to import.');
      return;
    }
    setImportLoading(true);
    setSyncError('');
    setSyncResult(null);
    try {
      const data = await request('/users/import-ad-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: toImport }),
      });
      setSyncResult(data);
      loadUsers(usersPage);
      loadAllUsersForSelect();
    } catch (err) {
      setSyncError(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const openUserBalanceManagement = useCallback((user) => {
    setSelectedUserForBalances(user);
    setTab('balanceManagement');
  }, []);

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle="Manage users, roles, and acting supervisors."
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Pending leave notifications</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Send (or resend) approval emails for all leave applications still pending PSO, Manager, or Director. Use this if emails were not sent when applications were submitted.
        </p>
        <Button type="button" variant="secondary" onClick={handleResendPendingEmails} loading={resendLoading} loadingText="Sending…">
          Send emails for pending approvals
        </Button>
        {resendResult && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 6 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{resendResult.message}</p>
            {resendResult.details?.length > 0 && (
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {resendResult.details.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="tabs">
        <button type="button" className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          Users & roles
        </button>
        <button type="button" className={`tab ${tab === 'delegations' ? 'active' : ''}`} onClick={() => setTab('delegations')}>
          Delegation tool
        </button>
        <button type="button" className={`tab ${tab === 'balanceManagement' ? 'active' : ''}`} onClick={() => setTab('balanceManagement')} disabled={!selectedUserForBalances}>
          Balance Management {selectedUserForBalances ? `(${selectedUserForBalances.full_name})` : ''}
        </button>
        <button type="button" className={`tab ${tab === 'leavePolicies' ? 'active' : ''}`} onClick={() => setTab('leavePolicies')}>
          Leave Policies
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {tab === 'users' && (
        <>
          <UsersSectionHeader
            onOpenAdModal={openAdModal}
            onAddUser={() => setUserForm({ mode: 'create', ...emptyUserForm(roles[0]?.id) })}
          />

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
            <DivisionFilter
              value={divisionFilter}
              divisions={divisions}
              onChange={(newDivision) => {
                setDivisionFilter(newDivision);
                loadUsers(1, newDivision, usersSearch);
              }}
            />
            <UsersSearchFilter
              value={usersSearch}
              onChange={(nextSearch) => {
                setUsersSearch(nextSearch);
                loadUsers(1, divisionFilter, nextSearch);
              }}
            />
          </div>

          <UserBulkActions
            selectedCount={selectedUserIds.size}
            usersLoading={usersLoading}
            loading={loading}
            onSelectAll={selectAllUsersOnPage}
            onClearSelection={clearUserSelection}
            onBulkDelete={() => setDeleteConfirm({ type: 'bulk', count: selectedUserIds.size })}
          />

          <UsersTable
            users={users}
            usersLoading={usersLoading}
            divisionFilter={divisionFilter}
            selectedUserIds={selectedUserIds}
            roles={roles}
            parseRoleIds={parseRoleIds}
            onToggleUserSelection={toggleUserSelection}
            onSelectAllOnPage={selectAllUsersOnPage}
            onClearSelection={clearUserSelection}
            onEditUser={openEditUser}
            onDeleteUser={(u) => setDeleteConfirm({ type: 'single', id: u.id, full_name: u.full_name })}
            onManageBalances={openUserBalanceManagement}
          />

          <UsersPagination
            usersTotal={usersTotal}
            usersPage={usersPage}
            usersLimit={usersLimit}
            usersLoading={usersLoading}
            usersTotalPages={usersTotalPages}
            paginationPageNumbers={paginationPageNumbers}
            onLoadUsers={loadUsers}
          />

          <div className="card">
            <h3 className="section-title">Roles</h3>
            <p className="card-subtitle">Assign roles to users in the form above. Role list (read-only):</p>
            {roles.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No roles loaded.</p>
            ) : (
              <div className="badge-group" style={{ gap: '0.5rem' }}>
                {roles.map((r) => (
                  <span key={r.id} className="badge" title={`ID: ${r.id}`}>{r.role_name}</span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={adModalOpen}
        title="Update users from Active Directory"
        titleId="ad-modal-title"
        maxWidth={adFetchedUsers.length > 0 ? 720 : 480}
        onClose={() => { setAdModalOpen(false); setAdFetchedUsers([]); setAdSelectedUsernames(new Set()); setAdSearchFilter(''); setSyncError(''); setSyncResult(null); }}
      >
          {syncError && <div className="alert alert-danger">{syncError}</div>}
          {syncResult && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--success-soft)', borderRadius: 6 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{syncResult.message}</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                Created: {syncResult.created} · Updated: {syncResult.updated}
              </p>
              {syncResult.hint && <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{syncResult.hint}</p>}
            </div>
          )}

          {adFetchedUsers.length === 0 ? (
            <>
              <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
                Enter your AD credentials to fetch the list of users from VMGD AD. Then choose which users to import. Users are read from the configured OUs (Engineering, Climate, Forecast, Geoscience, Administration, Observation).
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Server: 192.168.60.2 (hpserver2l8.vmgd.gov.vu) · Domain: vmgd.gov.vu
              </p>
              <form onSubmit={handleFetchFromAd}>
                <div className="form-group">
                  <label htmlFor="ad-username">AD username</label>
                  <input
                    id="ad-username"
                    type="text"
                    value={adUsername}
                    onChange={(e) => setAdUsername(e.target.value)}
                    placeholder="e.g. imichel or your AD logon"
                    autoComplete="username"
                    disabled={syncLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ad-password">AD password</label>
                  <input
                    id="ad-password"
                    type="password"
                    value={adPassword}
                    onChange={(e) => setAdPassword(e.target.value)}
                    placeholder="Your AD password"
                    autoComplete="current-password"
                    disabled={syncLoading}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="submit" variant="primary" loading={syncLoading} loadingText="Fetching…">Fetch from AD</Button>
                  <Button type="button" variant="secondary" onClick={() => { setAdModalOpen(false); setAdFetchedUsers([]); setAdSelectedUsernames(new Set()); setAdSearchFilter(''); setSyncError(''); setSyncResult(null); }} disabled={syncLoading}>Cancel</Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className="card-subtitle" style={{ marginBottom: '0.75rem' }}>
                Select the users to import. Uncheck any accounts you don’t want (e.g. service or test accounts). Then click Import selected.
              </p>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="ad-search-users" style={{ marginBottom: '0.25rem' }}>Search</label>
                <input
                  id="ad-search-users"
                  type="text"
                  value={adSearchFilter}
                  onChange={(e) => setAdSearchFilter(e.target.value)}
                  placeholder="Search by name, username, email, or division…"
                  style={{ width: '100%', maxWidth: 360 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <Button type="button" variant="secondary" onClick={() => selectAllAdUsers(true)} disabled={importLoading}>Select all{adSearchFilter.trim() ? ' visible' : ''}</Button>
                <Button type="button" variant="secondary" onClick={() => deselectAllAdUsers(true)} disabled={importLoading}>Deselect all{adSearchFilter.trim() ? ' visible' : ''}</Button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  {adSelectedUsernames.size} of {adFetchedUsers.length} selected
                  {adSearchFilter.trim() && adFilteredUsers.length !== adFetchedUsers.length && ` (${adFilteredUsers.length} visible)`}
                </span>
              </div>
              <div className="table-wrap" style={{ maxHeight: 320, overflow: 'auto', marginBottom: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}></th>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Division</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adFilteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                          {adSearchFilter.trim() ? 'No users match your search.' : 'No users.'}
                        </td>
                      </tr>
                    ) : adFilteredUsers.map((u) => (
                      <tr key={u.username || u.email}>
                        <td>
                          <input
                            type="checkbox"
                            checked={u.username ? adSelectedUsernames.has(u.username) : false}
                            onChange={() => u.username && toggleAdUser(u.username)}
                            disabled={!u.username}
                            aria-label={`Select ${u.full_name || u.username}`}
                          />
                        </td>
                        <td><strong>{u.full_name || '—'}</strong></td>
                        <td>{u.username || '—'}</td>
                        <td>{u.email || '—'}</td>
                        <td>{u.division_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button type="button" variant="primary" onClick={handleImportSelectedAdUsers} loading={importLoading} loadingText="Importing…" disabled={adSelectedUsernames.size === 0}>
                  Import selected ({adSelectedUsernames.size})
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setAdFetchedUsers([]); setAdSelectedUsernames(new Set()); setAdSearchFilter(''); setSyncError(''); setSyncResult(null); }} disabled={importLoading}>Fetch again</Button>
                <Button type="button" variant="secondary" onClick={() => { setAdModalOpen(false); setAdFetchedUsers([]); setAdSelectedUsernames(new Set()); setAdSearchFilter(''); setSyncError(''); setSyncResult(null); }} disabled={importLoading}>Close</Button>
              </div>
            </>
          )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.type === 'single' ? 'Confirm delete' : 'Confirm bulk delete'}
        message={deleteConfirm?.type === 'single'
          ? <>Delete user <strong>{deleteConfirm.full_name}</strong>? This will remove their leave applications and cannot be undone.</>
          : <>Delete <strong>{deleteConfirm?.count ?? 0}</strong> user(s)? This will remove their leave applications and cannot be undone.</>
        }
        confirmText={deleteConfirm?.type === 'single' ? 'Delete' : `Delete ${deleteConfirm?.count ?? 0} user(s)`}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={deleteConfirm?.type === 'single' ? handleDeleteUser : handleBulkDelete}
        loading={loading}
        loadingText="Deleting…"
      />

      {userForm && (
        <UserFormModal
          userForm={userForm}
          setUserForm={setUserForm}
          onSave={handleSaveUser}
          onClose={() => setUserForm(null)}
          loading={loading}
          error={error}
          roles={roles}
          divisions={divisions}
          allUsersForSelect={allUsersForSelect}
        />
      )}

      {tab === 'delegations' && (
        <DelegationManagement
          allUsersForSelect={allUsersForSelect}
          loadAllUsersForSelect={loadAllUsersForSelect}
          loading={loading}
          error={error}
          setError={setError}
        />
      )}

      {tab === 'balanceManagement' && selectedUserForBalances && (
        <div className="card">
          <h3 className="section-title">Leave Balances for {selectedUserForBalances.full_name} ({selectedUserForBalances.email})</h3>
          <UserBalanceManagement
            userId={selectedUserForBalances.id}
            onError={setError}
          />
        </div>
      )}

      {tab === 'leavePolicies' && (
        <LeavePolicyManagement
          onError={setError}
        />
      )}
    </>
  );
}
