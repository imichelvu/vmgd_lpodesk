import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import SearchableSelect from '../components/SearchableSelect';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import UsersSectionHeader from '../components/admin/UsersSectionHeader';
import DivisionFilter from '../components/admin/DivisionFilter';
import UserBulkActions from '../components/admin/UserBulkActions';
import UsersTable from '../components/admin/UsersTable';
import UsersPagination from '../components/admin/UsersPagination';

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

export default function AdminView() {
  const { request } = useApi();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [tab, setTab] = useState('users');
  const [userForm, setUserForm] = useState(null);
  /** Single: { type: 'single', id, full_name }. Bulk: { type: 'bulk', count }. Same modal for both. */
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [delegForm, setDelegForm] = useState({ delegator_id: '', delegatee_id: '', start_date: '', end_date: '' });
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
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

  const loadUsers = (page = usersPage, divisionIdOverride = undefined) => {
    setUsersLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(usersLimit) });
    const division = divisionIdOverride !== undefined ? divisionIdOverride : divisionFilter;
    if (division) params.set('division_id', division);
    return request(`/users?${params.toString()}`)
      .then((data) => {
        setUsers(data.users || []);
        setUsersTotal(data.total ?? 0);
        setUsersPage(data.page ?? page);
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  };
  const loadAllUsersForSelect = () => {
    return request('/users?limit=5000')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.users ?? []);
        setAllUsersForSelect(list);
      })
      .catch(() => {});
  };
  const loadRoles = () => request('/users/roles').then(setRoles).catch(() => {});
  const loadDivisions = () => request('/users/divisions').then(setDivisions).catch(() => {});
  const loadDelegations = () => request('/delegations').then(setDelegations).catch(() => {});

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));

  /** Page numbers to show in pagination (e.g. [1, 2, 3, '...', 9, 10]) */
  const paginationPageNumbers = (() => {
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
  })();

  useEffect(() => {
    loadDivisions();
    loadRoles();
    loadUsers(1);
    loadAllUsersForSelect();
  }, [request]);
  useEffect(() => {
    if (tab === 'delegations') {
      loadDelegations();
      if (allUsersForSelect.length === 0) loadAllUsersForSelect();
    }
  }, [tab, request]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const f = userForm;
    if (!f?.full_name || !f?.email || !f?.password) {
      setError('Name, email and password required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: f.full_name,
          username: f.username?.trim() || null,
          email: f.email,
          password: f.password,
          vnpf_no: f.vnpf_no || null,
          post_title: f.post_title || null,
          post_no: f.post_no || null,
          grade: f.grade || null,
          department: f.department?.trim() || null,
          ministry: f.ministry?.trim() || null,
          entry_date: f.entry_date?.trim() || null,
          division_id: f.division_id ? parseInt(f.division_id, 10) : null,
          reports_to_id: f.reports_to_id ? parseInt(f.reports_to_id, 10) : null,
          role_ids: f.role_ids?.length ? f.role_ids : (roles[0] ? [roles[0].id] : []),
        }),
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

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const f = userForm;
    if (!f?.id || !f?.full_name || !f?.email) {
      setError('Name and email required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = {
        full_name: f.full_name?.trim() || '',
        username: f.username?.trim() || null,
        email: (f.email || '').trim(),
        vnpf_no: f.vnpf_no || null,
        post_title: f.post_title || null,
        post_no: f.post_no || null,
        grade: f.grade || null,
        department: f.department?.trim() || null,
        ministry: f.ministry?.trim() || null,
        entry_date: f.entry_date?.trim() || null,
        division_id: f.division_id ? parseInt(f.division_id, 10) : null,
        reports_to_id: f.reports_to_id ? parseInt(f.reports_to_id, 10) : null,
        role_ids: f.role_ids || [],
      };
      if (f.password && f.password.trim()) body.password = f.password;
      await request(`/users/${f.id}`, {
        method: 'PATCH',
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

  const parseRoleIds = (roleIds) => {
    if (Array.isArray(roleIds)) return roleIds.map(Number).filter((n) => !Number.isNaN(n));
    if (typeof roleIds === 'string') return roleIds.replace(/^\{|\}$/g, '').split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n));
    return [];
  };

  const openEditUser = (u) => {
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
  };

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

  const toggleUserSelection = (id) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllUsersOnPage = () => {
    setSelectedUserIds(new Set(users.map((u) => u.id)));
  };

  const clearUserSelection = () => {
    setSelectedUserIds(new Set());
  };

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

  const handleCreateDelegation = async (e) => {
    e.preventDefault();
    if (!delegForm.delegator_id || !delegForm.delegatee_id || !delegForm.start_date || !delegForm.end_date) {
      setError('All delegation fields required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await request('/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegator_id: parseInt(delegForm.delegator_id, 10),
          delegatee_id: parseInt(delegForm.delegatee_id, 10),
          start_date: delegForm.start_date,
          end_date: delegForm.end_date,
        }),
      });
      setDelegForm({ delegator_id: '', delegatee_id: '', start_date: '', end_date: '' });
      loadDelegations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deactivateDelegation = async (id) => {
    try {
      await request(`/delegations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      loadDelegations();
    } catch (err) {
      setError(err.message);
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

  const openAdModal = () => {
    setAdModalOpen(true);
    setAdUsername('');
    setAdPassword('');
    setSyncResult(null);
    setSyncError('');
    setAdFetchedUsers([]);
    setAdSelectedUsernames(new Set());
    setAdSearchFilter('');
  };

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

  const toggleAdUser = (username) => {
    setAdSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const selectAllAdUsers = (visibleOnly = false) => {
    const list = visibleOnly && adSearchFilter.trim() ? adFilteredUsers : adFetchedUsers;
    setAdSelectedUsernames(new Set(list.map((u) => u.username).filter(Boolean)));
  };

  const deselectAllAdUsers = (visibleOnly = false) => {
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
  };

  const adSearchLower = adSearchFilter.trim().toLowerCase();
  const adFilteredUsers = adSearchLower
    ? adFetchedUsers.filter((u) => {
        const name = (u.full_name || '').toLowerCase();
        const un = (u.username || '').toLowerCase();
        const em = (u.email || '').toLowerCase();
        const div = (u.division_name || '').toLowerCase();
        return name.includes(adSearchLower) || un.includes(adSearchLower) || em.includes(adSearchLower) || div.includes(adSearchLower);
      })
    : adFetchedUsers;

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

  const isCreate = userForm?.mode === 'create';
  const isEdit = userForm?.mode === 'edit';

  return (
    <>
      <h2 style={{ marginBottom: '0.5rem' }}>Admin</h2>
      <p className="card-subtitle" style={{ marginTop: 0 }}>Manage users, roles, and acting supervisors.</p>

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
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {tab === 'users' && (
        <>
          <UsersSectionHeader
            onOpenAdModal={openAdModal}
            onAddUser={() => setUserForm({ mode: 'create', ...emptyUserForm(roles[0]?.id) })}
          />

          <DivisionFilter
            value={divisionFilter}
            divisions={divisions}
            onChange={(newDivision) => {
              setDivisionFilter(newDivision);
              loadUsers(1, newDivision);
            }}
          />

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
                  <Button type="button" variant="secondary" onClick={() => { setAdModalOpen(false); setSyncError(''); setSyncResult(null); }} disabled={syncLoading}>Cancel</Button>
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

      {(isCreate || isEdit) && userForm && (
        <Modal
          open={Boolean((isCreate || isEdit) && userForm)}
          title={isCreate ? 'New user' : 'Edit user'}
          titleId="user-form-modal-title"
          maxWidth={640}
          style={{ maxHeight: '90vh', overflow: 'auto' }}
          closeOnBackdrop={!loading}
          onClose={() => setUserForm(null)}
        >
            <form
              onSubmit={isCreate ? handleCreateUser : handleUpdateUser}
              style={{ marginTop: '0.5rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Full name *</label>
                  <input
                    value={userForm.full_name}
                    onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    value={userForm.username}
                    onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. imichel (for login)"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password {isEdit && '(leave blank to keep current)'}</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                    required={isCreate}
                    placeholder={isEdit ? '••••••••' : ''}
                  />
                </div>
                <div className="form-group">
                  <label>VNPF no</label>
                  <input
                    value={userForm.vnpf_no}
                    onChange={(e) => setUserForm((f) => ({ ...f, vnpf_no: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Post title</label>
                  <input
                    value={userForm.post_title}
                    onChange={(e) => setUserForm((f) => ({ ...f, post_title: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Post no</label>
                  <input
                    value={userForm.post_no}
                    onChange={(e) => setUserForm((f) => ({ ...f, post_no: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Grade</label>
                  <input
                    value={userForm.grade}
                    onChange={(e) => setUserForm((f) => ({ ...f, grade: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    value={userForm.department}
                    onChange={(e) => setUserForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. VMGD"
                  />
                </div>
                <div className="form-group">
                  <label>Ministry</label>
                  <input
                    value={userForm.ministry}
                    onChange={(e) => setUserForm((f) => ({ ...f, ministry: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Entry date of service</label>
                  <input
                    type="date"
                    value={userForm.entry_date}
                    onChange={(e) => setUserForm((f) => ({ ...f, entry_date: e.target.value }))}
                    title="Date when staff entered service or took their post"
                  />
                </div>
                <div className="form-group">
                  <label>Division</label>
                  <SearchableSelect
                    value={userForm.division_id ?? ''}
                    options={divisions}
                    getOptionLabel={(d) => d.name}
                    onChange={(v) => setUserForm((f) => ({ ...f, division_id: v ?? '' }))}
                    placeholder="—"
                    emptyOptionLabel="—"
                  />
                </div>
                <div className="form-group">
                  <label>Reports to</label>
                  <SearchableSelect
                    value={userForm.reports_to_id ?? ''}
                    options={allUsersForSelect || []}
                    getOptionLabel={(u) => u.full_name}
                    onChange={(v) => setUserForm((f) => ({ ...f, reports_to_id: v ?? '' }))}
                    placeholder="—"
                    emptyOptionLabel="—"
                    excludeId={userForm.id}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Roles</label>
                <div className="badge-group" style={{ gap: '0.5rem' }}>
                  {roles.map((r) => (
                    <label key={r.id} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={(userForm.role_ids || []).includes(r.id)}
                        onChange={(e) => setUserForm((f) => ({
                          ...f,
                          role_ids: e.target.checked
                            ? [...(f.role_ids || []), r.id]
                            : (f.role_ids || []).filter((rid) => rid !== r.id),
                        }))}
                        style={{ marginRight: '0.35rem' }}
                      />
                      <span className="badge" style={{ marginBottom: 0 }}>{r.role_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="submit" variant="primary" loading={loading} loadingText={isCreate ? 'Creating…' : 'Saving…'}>
                  {isCreate ? 'Create user' : 'Save changes'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setUserForm(null)}>Cancel</Button>
              </div>
            </form>
        </Modal>
      )}

      {tab === 'delegations' && (
        <>
          <div className="card">
            <h3 className="section-title">Set Acting supervisor</h3>
            <p className="card-subtitle">
              Assign a delegatee to act as the delegator for a date range. The delegatee will receive notifications and approval rights for that period.
            </p>
            <form onSubmit={handleCreateDelegation} style={{ maxWidth: 500 }}>
              <div className="form-group">
                <label>Delegator (person away)</label>
                <SearchableSelect
                  value={delegForm.delegator_id}
                  options={allUsersForSelect || []}
                  getOptionLabel={(u) => `${u.full_name} (${u.email || ''})`}
                  onChange={(v) => setDelegForm((f) => ({ ...f, delegator_id: v ?? '' }))}
                  placeholder="Select..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Delegatee (acting)</label>
                <SearchableSelect
                  value={delegForm.delegatee_id}
                  options={allUsersForSelect || []}
                  getOptionLabel={(u) => `${u.full_name} (${u.email || ''})`}
                  onChange={(v) => setDelegForm((f) => ({ ...f, delegatee_id: v ?? '' }))}
                  placeholder="Select..."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group">
                  <label>Start date</label>
                  <input type="date" value={delegForm.start_date} onChange={(e) => setDelegForm((f) => ({ ...f, start_date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>End date</label>
                  <input type="date" value={delegForm.end_date} onChange={(e) => setDelegForm((f) => ({ ...f, end_date: e.target.value }))} required />
                </div>
              </div>
              <Button type="submit" variant="primary" loading={loading} loadingText="Creating…">Create delegation</Button>
            </form>
          </div>
          <div className="card">
            <h3 className="section-title">Active delegations</h3>
            {delegations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>None.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Delegator</th>
                      <th>Delegatee</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Active</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {delegations.map((d) => (
                      <tr key={d.id}>
                        <td>{d.delegator_name}</td>
                        <td>{d.delegatee_name}</td>
                        <td>{d.start_date}</td>
                        <td>{d.end_date}</td>
                        <td>{d.is_active ? 'Yes' : 'No'}</td>
                        <td>
                          {d.is_active && (
                            <Button type="button" variant="secondary" size="sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => deactivateDelegation(d.id)}>
                              Deactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
