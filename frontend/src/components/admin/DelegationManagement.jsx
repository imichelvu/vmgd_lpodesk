import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import SearchableSelect from '../SearchableSelect';
import Button from '../Button';

export default function DelegationManagement({
  allUsersForSelect,
  loadAllUsersForSelect,
  loading,
  error,
  setError,
}) {
  const { request } = useApi();
  const [delegations, setDelegations] = useState([]);
  const [delegForm, setDelegForm] = useState({ delegator_id: '', delegatee_id: '', start_date: '', end_date: '' });

  const loadDelegations = useCallback(() => request('/delegations').then(setDelegations).catch(() => {}), [request]);

  useEffect(() => {
    loadDelegations();
    if (allUsersForSelect.length === 0) loadAllUsersForSelect();
  }, [loadDelegations, allUsersForSelect, loadAllUsersForSelect]);

  const handleCreateDelegation = async (e) => {
    e.preventDefault();
    if (!delegForm.delegator_id || !delegForm.delegatee_id || !delegForm.start_date || !delegForm.end_date) {
      setError('All delegation fields required');
      return;
    }
    // setLoading(true); // Loading state is passed from parent
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
      // setLoading(false); // Loading state is passed from parent
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

  return (
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
  );
}
