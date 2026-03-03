import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import Button from '../Button';

export default function UserBalanceManagement({ userId, year = new Date().getFullYear(), onError }) {
  const { request } = useApi();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBalanceId, setEditingBalanceId] = useState(null);
  const [editForm, setEditForm] = useState({ allocated_days: '', carried_over_days: '' });

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    onError('');
    try {
      const data = await request(`/users/${userId}/balances?year=${year}`);
      setBalances(data);
    } catch (err) {
      onError(err.message || 'Failed to fetch user balances.');
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [userId, year, request, onError]);

  useEffect(() => {
    if (userId) {
      fetchBalances();
    }
  }, [userId, fetchBalances]);

  const startEdit = useCallback((balance) => {
    setEditingBalanceId(balance.id);
    setEditForm({
      allocated_days: balance.allocated_days,
      carried_over_days: balance.carried_over_days,
    });
    onError('');
  }, [onError]);

  const cancelEdit = useCallback(() => {
    setEditingBalanceId(null);
    setEditForm({ allocated_days: '', carried_over_days: '' });
    onError('');
  }, [onError]);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const saveBalance = useCallback(async (balanceId) => {
    onError('');
    // Simple validation
    if (editForm.allocated_days < 0 || editForm.carried_over_days < 0) {
      onError('Days cannot be negative.');
      return;
    }

    try {
      await request(`/users/${userId}/balances/${balanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocated_days: parseFloat(editForm.allocated_days),
          carried_over_days: parseFloat(editForm.carried_over_days),
        }),
      });
      await fetchBalances(); // Refresh the balances after saving
      cancelEdit();
    } catch (err) {
      onError(err.message || 'Failed to update leave balance.');
    }
  }, [userId, editForm, request, fetchBalances, cancelEdit, onError]);

  if (loading) {
    return <p className="text-muted">Loading balances...</p>;
  }

  return (
    <div className="user-balance-management">
      {balances.length === 0 ? (
        <p className="text-muted">No leave balances found for this user.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Year</th>
                <th>Allocated Days</th>
                <th>Used Days</th>
                <th>Carried Over</th>
                <th>Remaining</th>
                <th>Max Carry</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => {
                const isEditing = editingBalanceId === balance.id;
                const remainingDays = (balance.allocated_days || 0) + (balance.carried_over_days || 0) - (balance.used_days || 0);
                return (
                  <tr key={balance.id}>
                    <td>{balance.leave_type}</td>
                    <td>{balance.year}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          name="allocated_days"
                          value={editForm.allocated_days}
                          onChange={handleEditChange}
                          style={{ width: '80px' }}
                        />
                      ) : (
                        balance.allocated_days
                      )}
                    </td>
                    <td>{balance.used_days}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          name="carried_over_days"
                          value={editForm.carried_over_days}
                          onChange={handleEditChange}
                          style={{ width: '80px' }}
                        />
                      ) : (
                        balance.carried_over_days
                      )}
                    </td>
                    <td>{remainingDays}</td>
                    <td>{balance.is_unlimited ? 'Unlimited' : balance.max_carry_over_days}</td>
                    <td>
                      {isEditing ? (
                        <>
                          <Button type="button" variant="primary" size="sm" onClick={() => saveBalance(balance.id)} style={{ marginRight: '0.5rem' }}>Save</Button>
                          <Button type="button" variant="secondary" size="sm" onClick={cancelEdit}>Cancel</Button>
                        </>
                      ) : (
                        <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(balance)}>Edit</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
