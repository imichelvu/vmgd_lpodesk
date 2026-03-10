import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import SearchableSelect from '../SearchableSelect';

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
  if (typeof roleIds === 'string') return roleIds.replace(/^{\s*|\s*}$/g, '').split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n));
  return [];
};

export default function UserFormModal({
  userForm,
  setUserForm,
  onSave,
  onClose,
  loading,
  error,
  roles,
  divisions,
  allUsersForSelect,
}) {
  const isCreate = userForm?.mode === 'create';
  const isEdit = userForm?.mode === 'edit';

  const [currentForm, setCurrentForm] = useState(userForm);

  useEffect(() => {
    setCurrentForm(userForm);
  }, [userForm]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setCurrentForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRoleChange = useCallback((e, roleId) => {
    const { checked } = e.target;
    setCurrentForm((prev) => ({
      ...prev,
      role_ids: checked
        ? [...(prev.role_ids || []), roleId]
        : (prev.role_ids || []).filter((rid) => rid !== roleId),
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    onSave(currentForm);
  }, [onSave, currentForm]);

  if (!userForm) return null;

  return (
    <Modal
      open={true}
      title={isCreate ? 'New user' : 'Edit user'}
      titleId="user-form-modal-title"
      maxWidth={640}
      style={{ maxHeight: '90vh', overflow: 'auto' }}
      closeOnBackdrop={!loading}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ marginTop: '0.5rem' }}>
        {error && <div className="alert alert-danger">{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Full name *</label>
            <input
              name="full_name"
              value={currentForm.full_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              name="username"
              value={currentForm.username}
              onChange={handleChange}
              placeholder="e.g. jdoe (for login)"
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={currentForm.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password {isEdit && '(leave blank to keep current)'}</label>
            <input
              type="password"
              name="password"
              value={currentForm.password}
              onChange={handleChange}
              required={isCreate}
              placeholder={isEdit ? '••••••••' : ''}
            />
          </div>
          <div className="form-group">
            <label>VNPF no</label>
            <input
              name="vnpf_no"
              value={currentForm.vnpf_no}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Post title</label>
            <input
              name="post_title"
              value={currentForm.post_title}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Post no</label>
            <input
              name="post_no"
              value={currentForm.post_no}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Grade</label>
            <input
              name="grade"
              value={currentForm.grade}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input
              name="department"
              value={currentForm.department}
              onChange={handleChange}
              placeholder="e.g. VMGD"
            />
          </div>
          <div className="form-group">
            <label>Ministry</label>
            <input
              name="ministry"
              value={currentForm.ministry}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Entry date of service</label>
            <input
              type="date"
              name="entry_date"
              value={currentForm.entry_date}
              onChange={handleChange}
              title="Date when staff entered service or took their post"
            />
          </div>
          <div className="form-group">
            <label>Division</label>
            <SearchableSelect
              value={currentForm.division_id ?? ''}
              options={divisions}
              getOptionLabel={(d) => d.name}
              onChange={(v) => setCurrentForm((f) => ({ ...f, division_id: v ?? '' }))}
              placeholder="—"
              emptyOptionLabel="—"
            />
          </div>
          <div className="form-group">
            <label>Reports to</label>
            <SearchableSelect
              value={currentForm.reports_to_id ?? ''}
              options={allUsersForSelect || []}
              getOptionLabel={(u) => u.full_name}
              onChange={(v) => setCurrentForm((f) => ({ ...f, reports_to_id: v ?? '' }))}
              placeholder="—"
              emptyOptionLabel="—"
              excludeId={currentForm.id}
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
                  checked={(currentForm.role_ids || []).includes(r.id)}
                  onChange={(e) => handleRoleChange(e, r.id)}
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
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

