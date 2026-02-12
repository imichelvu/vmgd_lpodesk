import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const emptyUserForm = (defaultRoleId) => ({
  full_name: '',
  username: '',
  email: '',
  password: '',
  vnpf_no: '',
  post_title: '',
  post_no: '',
  grade: '',
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
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [delegForm, setDelegForm] = useState({ delegator_id: '', delegatee_id: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendResult, setResendResult] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);

  const loadUsers = () => request('/users').then(setUsers).catch(() => {});
  const loadRoles = () => request('/users/roles').then(setRoles).catch(() => {});
  const loadDivisions = () => request('/users/divisions').then(setDivisions).catch(() => {});
  const loadDelegations = () => request('/delegations').then(setDelegations).catch(() => {});

  useEffect(() => {
    loadDivisions();
    loadRoles();
    loadUsers();
  }, [request]);
  useEffect(() => {
    if (tab === 'delegations') loadDelegations();
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
          entry_date: f.entry_date?.trim() || null,
          division_id: f.division_id ? parseInt(f.division_id, 10) : null,
          reports_to_id: f.reports_to_id ? parseInt(f.reports_to_id, 10) : null,
          role_ids: f.role_ids?.length ? f.role_ids : (roles[0] ? [roles[0].id] : []),
        }),
      });
      setUserForm(null);
      loadUsers();
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
      loadUsers();
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
      entry_date: u.entry_date ? String(u.entry_date).slice(0, 10) : '',
      division_id: u.division_id ?? '',
      reports_to_id: u.reports_to_id ?? '',
      role_ids: parseRoleIds(u.role_ids),
    });
    setError('');
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setLoading(true);
    setError('');
    try {
      await request(`/users/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      loadUsers();
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
        <button type="button" className="btn btn-secondary" onClick={handleResendPendingEmails} disabled={resendLoading}>
          {resendLoading ? 'Sending…' : 'Send emails for pending approvals'}
        </button>
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
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="section-title">Users</h3>
                <button type="button" className="btn btn-primary" onClick={() => setUserForm({ mode: 'create', ...emptyUserForm(roles[0]?.id) })}>
                Add user
              </button>
            </div>

            {(isCreate || isEdit) && (
              <form
                onSubmit={isCreate ? handleCreateUser : handleUpdateUser}
                style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}
              >
                <h4 className="section-title">{isCreate ? 'New user' : 'Edit user'}</h4>
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
                    <select
                      value={userForm.division_id ?? ''}
                      onChange={(e) => setUserForm((f) => ({ ...f, division_id: e.target.value || null }))}
                    >
                      <option value="">—</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reports to</label>
                    <select
                      value={userForm.reports_to_id ?? ''}
                      onChange={(e) => setUserForm((f) => ({ ...f, reports_to_id: e.target.value || null }))}
                    >
                      <option value="">—</option>
                      {users.filter((u) => u.id !== userForm.id).map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
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
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {isCreate ? 'Create user' : 'Save changes'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setUserForm(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Division</th>
                  <th>Roles</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td>{u.username || '—'}</td>
                    <td>{u.email}</td>
                    <td>{u.division_name || '—'}</td>
                    <td>
                      <div className="badge-group">
                        {parseRoleIds(u.role_ids).map((rid) => {
                          const r = roles.find((x) => x.id === rid);
                          return r ? <span key={r.id} className="badge">{r.role_name}</span> : null;
                        })}
                        {parseRoleIds(u.role_ids).length === 0 && '—'}
                      </div>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button type="button" className="btn btn-secondary" onClick={() => openEditUser(u)}>Edit</button>
                        <button type="button" className="btn btn-danger" onClick={() => setDeleteConfirm({ id: u.id, full_name: u.full_name })}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      {deleteConfirm && (
        <div className="card card-danger">
          <h3 className="section-title">Confirm delete</h3>
          <p>Delete user <strong>{deleteConfirm.full_name}</strong>? This will remove their leave applications and cannot be undone.</p>
          <div className="actions-cell">
            <button type="button" className="btn btn-danger" onClick={handleDeleteUser} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
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
                <select value={delegForm.delegator_id} onChange={(e) => setDelegForm((f) => ({ ...f, delegator_id: e.target.value }))} required>
                  <option value="">Select...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Delegatee (acting)</label>
                <select value={delegForm.delegatee_id} onChange={(e) => setDelegForm((f) => ({ ...f, delegatee_id: e.target.value }))} required>
                  <option value="">Select...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
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
              <button type="submit" className="btn btn-primary" disabled={loading}>Create delegation</button>
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
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => deactivateDelegation(d.id)}>
                              Deactivate
                            </button>
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
