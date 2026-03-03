import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import Button from '../Button';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';

export default function LeavePolicyManagement({ onError }) {
  const { request } = useApi();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policyForm, setPolicyForm] = useState(null);
  const [tierForm, setTierForm] = useState(null);
  const [deletePolicyConfirm, setDeletePolicyConfirm] = useState(null);
  const [deleteTierConfirm, setDeleteTierConfirm] = useState(null);
  const [currentPolicyTiers, setCurrentPolicyTiers] = useState({});

  const emptyPolicyForm = () => ({
    leave_type: '',
    accrual_rate_per_year: 0,
    max_carry_over_days: 0,
    requires_balance: true,
    allow_negative: false,
    min_notice_days: 0,
    mode: 'create',
  });

  const emptyTierForm = (policyId) => ({
    leave_policy_id: policyId,
    min_years_service: 0,
    max_years_service: 99,
    accrual_rate_per_year: 0,
    mode: 'create',
  });

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    onError('');
    try {
      const data = await request('/admin/leave-policies');
      setPolicies(data);
    } catch (err) {
      onError(err.message || 'Failed to fetch leave policies.');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [request, onError]);

  const fetchAccrualTiers = useCallback(async (policyId) => {
    try {
      const data = await request(`/admin/leave-policies/${policyId}/tiers`);
      setCurrentPolicyTiers((prev) => ({ ...prev, [policyId]: data }));
    } catch (err) {
      onError(err.message || 'Failed to fetch accrual tiers.');
      setCurrentPolicyTiers((prev) => ({ ...prev, [policyId]: [] }));
    }
  }, [request, onError]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleSavePolicy = useCallback(async (form) => {
    onError('');
    try {
      const method = form.mode === 'create' ? 'POST' : 'PATCH';
      const url = form.mode === 'create' ? '/admin/leave-policies' : `/admin/leave-policies/${form.id}`;
      await request(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setPolicyForm(null);
      fetchPolicies();
    } catch (err) {
      onError(err.message || 'Failed to save leave policy.');
    }
  }, [request, fetchPolicies, onError]);

  const handleDeletePolicy = useCallback(async () => {
    if (!deletePolicyConfirm) return;
    onError('');
    try {
      await request(`/admin/leave-policies/${deletePolicyConfirm.id}`, { method: 'DELETE' });
      setDeletePolicyConfirm(null);
      fetchPolicies();
    } catch (err) {
      onError(err.message || 'Failed to delete leave policy.');
    }
  }, [request, deletePolicyConfirm, fetchPolicies, onError]);

  const handleSaveTier = useCallback(async (form) => {
    onError('');
    try {
      const method = form.mode === 'create' ? 'POST' : 'PATCH';
      const url = form.mode === 'create' ? `/admin/leave-policies/${form.leave_policy_id}/tiers` : `/admin/leave-policies/${form.leave_policy_id}/tiers/${form.id}`;
      await request(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setTierForm(null);
      fetchAccrualTiers(form.leave_policy_id);
    } catch (err) {
      onError(err.message || 'Failed to save accrual tier.');
    }
  }, [request, fetchAccrualTiers, onError]);

  const handleDeleteTier = useCallback(async () => {
    if (!deleteTierConfirm) return;
    onError('');
    try {
      await request(`/admin/leave-policies/${deleteTierConfirm.policyId}/tiers/${deleteTierConfirm.tierId}`, { method: 'DELETE' });
      setDeleteTierConfirm(null);
      fetchAccrualTiers(deleteTierConfirm.policyId);
    } catch (err) {
      onError(err.message || 'Failed to delete accrual tier.');
    }
  }, [request, deleteTierConfirm, fetchAccrualTiers, onError]);

  return (
    <div className="leave-policy-management">
      <div className="card">
        <h3 className="section-title">Leave Policies</h3>
        <p className="card-subtitle">Configure different leave types and their general rules.</p>
        <Button type="button" variant="primary" onClick={() => setPolicyForm(emptyPolicyForm())}>
          Add New Policy
        </Button>

        {loading ? (
          <p className="text-muted">Loading policies...</p>
        ) : policies.length === 0 ? (
          <p className="text-muted">No leave policies defined.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Accrual Rate (per year)</th>
                  <th>Max Carry Over</th>
                  <th>Requires Balance</th>
                  <th>Allow Negative</th>
                  <th>Min Notice (days)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <React.Fragment key={policy.id}>
                    <tr>
                      <td>{policy.leave_type}</td>
                      <td>{policy.accrual_rate_per_year}</td>
                      <td>{policy.max_carry_over_days}</td>
                      <td>{policy.requires_balance ? 'Yes' : 'No'}</td>
                      <td>{policy.allow_negative ? 'Yes' : 'No'}</td>
                      <td>{policy.min_notice_days}</td>
                      <td>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setPolicyForm({ ...policy, mode: 'edit' })} style={{ marginRight: '0.5rem' }}>Edit</Button>
                        <Button type="button" variant="danger" size="sm" onClick={() => setDeletePolicyConfirm({ id: policy.id, leave_type: policy.leave_type })}>Delete</Button>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={7} style={{ padding: '0 1rem 1rem', borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>Accrual Tiers for {policy.leave_type}</h4>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setTierForm(emptyTierForm(policy.id))}>Add New Tier</Button>
                        {currentPolicyTiers[policy.id] === undefined ? (
                          <Button type="button" variant="secondary" size="sm" onClick={() => fetchAccrualTiers(policy.id)} style={{ marginLeft: '0.5rem' }}>Load Tiers</Button>
                        ) : currentPolicyTiers[policy.id].length === 0 ? (
                          <p className="text-muted" style={{ marginTop: '0.5rem' }}>No accrual tiers defined for this policy.</p>
                        ) : (
                          <div className="table-wrap" style={{ marginTop: '0.5rem' }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Min Years Service</th>
                                  <th>Max Years Service</th>
                                  <th>Accrual Rate (per year)</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentPolicyTiers[policy.id].map((tier) => (
                                  <tr key={tier.id}>
                                    <td>{tier.min_years_service}</td>
                                    <td>{tier.max_years_service}</td>
                                    <td>{tier.accrual_rate_per_year}</td>
                                    <td>
                                      <Button type="button" variant="secondary" size="sm" onClick={() => setTierForm({ ...tier, mode: 'edit' })} style={{ marginRight: '0.5rem' }}>Edit</Button>
                                      <Button type="button" variant="danger" size="sm" onClick={() => setDeleteTierConfirm({ policyId: policy.id, tierId: tier.id })}>Delete</Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Policy Form Modal */}
      {policyForm && (
        <Modal
          open={true}
          title={policyForm.mode === 'create' ? 'New Leave Policy' : 'Edit Leave Policy'}
          titleId="policy-form-modal-title"
          onClose={() => setPolicyForm(null)}
        >
          <form onSubmit={(e) => { e.preventDefault(); handleSavePolicy(policyForm); }} style={{ marginTop: '0.5rem' }}>
            <div className="form-group">
              <label>Leave Type</label>
              <input
                type="text"
                value={policyForm.leave_type}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, leave_type: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Accrual Rate (days per year)</label>
              <input
                type="number"
                step="0.01"
                value={policyForm.accrual_rate_per_year}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, accrual_rate_per_year: parseFloat(e.target.value) }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Max Carry Over Days</label>
              <input
                type="number"
                step="0.01"
                value={policyForm.max_carry_over_days}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, max_carry_over_days: parseFloat(e.target.value) }))}
                required
              />
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="requires_balance"
                checked={policyForm.requires_balance}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, requires_balance: e.target.checked }))}
              />
              <label htmlFor="requires_balance">Requires Balance</label>
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="allow_negative"
                checked={policyForm.allow_negative}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, allow_negative: e.target.checked }))}
              />
              <label htmlFor="allow_negative">Allow Negative Balance</label>
            </div>
            <div className="form-group">
              <label>Minimum Notice Days</label>
              <input
                type="number"
                value={policyForm.min_notice_days}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, min_notice_days: parseInt(e.target.value, 10) }))}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">Save Policy</Button>
              <Button type="button" variant="secondary" onClick={() => setPolicyForm(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Accrual Tier Form Modal */}
      {tierForm && (
        <Modal
          open={true}
          title={tierForm.mode === 'create' ? 'New Accrual Tier' : 'Edit Accrual Tier'}
          titleId="tier-form-modal-title"
          onClose={() => setTierForm(null)}
        >
          <form onSubmit={(e) => { e.preventDefault(); handleSaveTier(tierForm); }} style={{ marginTop: '0.5rem' }}>
            <div className="form-group">
              <label>Min Years Service</label>
              <input
                type="number"
                value={tierForm.min_years_service}
                onChange={(e) => setTierForm((prev) => ({ ...prev, min_years_service: parseInt(e.target.value, 10) }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Max Years Service</label>
              <input
                type="number"
                value={tierForm.max_years_service}
                onChange={(e) => setTierForm((prev) => ({ ...prev, max_years_service: parseInt(e.target.value, 10) }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Accrual Rate (days per year)</label>
              <input
                type="number"
                step="0.01"
                value={tierForm.accrual_rate_per_year}
                onChange={(e) => setTierForm((prev) => ({ ...prev, accrual_rate_per_year: parseFloat(e.target.value) }))}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">Save Tier</Button>
              <Button type="button" variant="secondary" onClick={() => setTierForm(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Policy */}
      <ConfirmDialog
        open={Boolean(deletePolicyConfirm)}
        title="Confirm Delete Policy"
        message={<>Are you sure you want to delete the leave policy <strong>{deletePolicyConfirm?.leave_type}</strong>? This cannot be undone.</>}
        confirmText="Delete Policy"
        onClose={() => setDeletePolicyConfirm(null)}
        onConfirm={handleDeletePolicy}
        variant="danger"
      />

      {/* Confirm Delete Tier */}
      <ConfirmDialog
        open={Boolean(deleteTierConfirm)}
        title="Confirm Delete Accrual Tier"
        message={<>Are you sure you want to delete this accrual tier? This cannot be undone.</>}
        confirmText="Delete Tier"
        onClose={() => setDeleteTierConfirm(null)}
        onConfirm={handleDeleteTier}
        variant="danger"
      />
    </div>
  );
}
