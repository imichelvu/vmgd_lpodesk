/**
 * Author: Igor Michel
 * Purpose: Admin UI for managing leave_balance_policies and leave_accrual_tiers.
 * Policy PK: leave_type (text). Tier PK: (leave_type, min_years). Value: monthly_days.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import Button from '../Button';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';

const emptyPolicyForm = () => ({
  leave_type: '',
  default_allocation_days: 0,
  requires_balance: true,
  allow_negative: false,
  min_notice_days: 0,
  mode: 'create',
});

const emptyTierForm = (leaveType) => ({
  leave_type: leaveType,
  min_years: 0,
  monthly_days: 0,
  mode: 'create',
});

export default function LeavePolicyManagement({ onError }) {
  const { request } = useApi();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policyForm, setPolicyForm] = useState(null);
  const [tierForm, setTierForm] = useState(null);
  const [deletePolicyConfirm, setDeletePolicyConfirm] = useState(null);
  const [deleteTierConfirm, setDeleteTierConfirm] = useState(null);
  const [policyTiers, setPolicyTiers] = useState({}); // { leaveType: tier[] }

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    onError('');
    try {
      const data = await request('/admin/leave-policies');
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err) {
      onError(err.message || 'Failed to fetch leave policies.');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [request, onError]);

  const fetchTiers = useCallback(async (leaveType) => {
    try {
      const data = await request(`/admin/leave-policies/${encodeURIComponent(leaveType)}/tiers`);
      setPolicyTiers((prev) => ({ ...prev, [leaveType]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      onError(err.message || 'Failed to fetch accrual tiers.');
    }
  }, [request, onError]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const handleSavePolicy = useCallback(async (form) => {
    onError('');
    try {
      if (form.mode === 'create') {
        await request('/admin/leave-policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leave_type: form.leave_type,
            default_allocation_days: Number(form.default_allocation_days) || 0,
            requires_balance: !!form.requires_balance,
            allow_negative: !!form.allow_negative,
            min_notice_days: Number(form.min_notice_days) || 0,
          }),
        });
      } else {
        await request(`/admin/leave-policies/${encodeURIComponent(form.leave_type)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            default_allocation_days: Number(form.default_allocation_days) || 0,
            requires_balance: !!form.requires_balance,
            allow_negative: !!form.allow_negative,
            min_notice_days: Number(form.min_notice_days) || 0,
          }),
        });
      }
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
      await request(`/admin/leave-policies/${encodeURIComponent(deletePolicyConfirm.leave_type)}`, { method: 'DELETE' });
      setDeletePolicyConfirm(null);
      fetchPolicies();
    } catch (err) {
      onError(err.message || 'Failed to delete leave policy.');
    }
  }, [request, deletePolicyConfirm, fetchPolicies, onError]);

  const handleSaveTier = useCallback(async (form) => {
    onError('');
    const base = `/admin/leave-policies/${encodeURIComponent(form.leave_type)}/tiers`;
    try {
      if (form.mode === 'create') {
        await request(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ min_years: Number(form.min_years), monthly_days: Number(form.monthly_days) }),
        });
      } else {
        await request(`${base}/${form.min_years}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthly_days: Number(form.monthly_days) }),
        });
      }
      setTierForm(null);
      fetchTiers(form.leave_type);
    } catch (err) {
      onError(err.message || 'Failed to save accrual tier.');
    }
  }, [request, fetchTiers, onError]);

  const handleDeleteTier = useCallback(async () => {
    if (!deleteTierConfirm) return;
    onError('');
    try {
      await request(
        `/admin/leave-policies/${encodeURIComponent(deleteTierConfirm.leaveType)}/tiers/${deleteTierConfirm.minYears}`,
        { method: 'DELETE' }
      );
      setDeleteTierConfirm(null);
      fetchTiers(deleteTierConfirm.leaveType);
    } catch (err) {
      onError(err.message || 'Failed to delete accrual tier.');
    }
  }, [request, deleteTierConfirm, fetchTiers, onError]);

  return (
    <div className="card">
      <div className="dashboard-section-title-row">
        <h3 className="dashboard-section-title">Leave Policies</h3>
        <Button type="button" variant="primary" onClick={() => setPolicyForm(emptyPolicyForm())}>
          Add policy
        </Button>
      </div>
      <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
        Configure leave types, default allocations, balance requirements and advance notice rules.
        Accrual tiers define how monthly accrual changes with years of service.
      </p>

      {loading ? (
        <p className="text-muted">Loading policies…</p>
      ) : policies.length === 0 ? (
        <p className="text-muted">No leave policies defined.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Leave type</th>
                <th title="Default days allocated per year">Default days</th>
                <th>Req. balance</th>
                <th>Allow −ve</th>
                <th>Notice (days)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <React.Fragment key={policy.leave_type}>
                  <tr>
                    <td><strong>{policy.leave_type}</strong></td>
                    <td>{Number(policy.default_allocation_days).toFixed(1)}</td>
                    <td>{policy.requires_balance ? 'Yes' : 'No'}</td>
                    <td>{policy.allow_negative ? 'Yes' : 'No'}</td>
                    <td>{policy.min_notice_days}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Button type="button" variant="secondary" onClick={() => setPolicyForm({ ...policy, mode: 'edit' })} style={{ marginRight: 4 }}>Edit</Button>
                      <Button type="button" variant="danger" onClick={() => setDeletePolicyConfirm({ leave_type: policy.leave_type })}>Delete</Button>
                    </td>
                  </tr>
                  {/* Accrual tiers sub-row */}
                  <tr>
                    <td colSpan={6} style={{ padding: '0 1rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.4rem 0' }}>
                        <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)' }}>Accrual tiers</span>
                        <Button type="button" variant="secondary" onClick={() => setTierForm(emptyTierForm(policy.leave_type))}>+ Add tier</Button>
                        {policyTiers[policy.leave_type] === undefined && (
                          <Button type="button" variant="secondary" onClick={() => fetchTiers(policy.leave_type)}>Load tiers</Button>
                        )}
                      </div>
                      {policyTiers[policy.leave_type]?.length === 0 && (
                        <p className="text-muted" style={{ fontSize: '0.83rem', margin: '0.25rem 0' }}>No accrual tiers — flat allocation only.</p>
                      )}
                      {policyTiers[policy.leave_type]?.length > 0 && (
                        <table style={{ fontSize: '0.85rem', width: 'auto' }}>
                          <thead>
                            <tr>
                              <th>Min years service</th>
                              <th>Days/month accrued</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {policyTiers[policy.leave_type].map((tier) => (
                              <tr key={tier.min_years}>
                                <td>≥ {tier.min_years} yr{tier.min_years !== 1 ? 's' : ''}</td>
                                <td>{Number(tier.monthly_days).toFixed(3)}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <Button type="button" variant="secondary" onClick={() => setTierForm({ ...tier, mode: 'edit' })} style={{ marginRight: 4 }}>Edit</Button>
                                  <Button type="button" variant="danger" onClick={() => setDeleteTierConfirm({ leaveType: tier.leave_type, minYears: tier.min_years })}>Delete</Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Policy form modal */}
      {policyForm && (
        <Modal open title={policyForm.mode === 'create' ? 'New leave policy' : `Edit — ${policyForm.leave_type}`} titleId="policy-form-modal" onClose={() => setPolicyForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); handleSavePolicy(policyForm); }} style={{ marginTop: '0.5rem' }}>
            <div className="form-group">
              <label>Leave type *</label>
              <input
                type="text"
                value={policyForm.leave_type}
                onChange={(e) => setPolicyForm((p) => ({ ...p, leave_type: e.target.value }))}
                required
                disabled={policyForm.mode === 'edit'}
                placeholder="e.g. Annual vacation"
              />
            </div>
            <div className="form-group">
              <label>Default allocation (days/year)</label>
              <input type="number" step="0.5" min="0" value={policyForm.default_allocation_days}
                onChange={(e) => setPolicyForm((p) => ({ ...p, default_allocation_days: e.target.value }))} />
              <p className="form-hint">Fixed days given per year. Set 0 if balance comes from accrual tiers.</p>
            </div>
            <div className="form-group">
              <label>Minimum advance notice (days)</label>
              <input type="number" min="0" value={policyForm.min_notice_days}
                onChange={(e) => setPolicyForm((p) => ({ ...p, min_notice_days: e.target.value }))} />
            </div>
            <div className="form-group" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
                <input type="checkbox" checked={!!policyForm.requires_balance}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, requires_balance: e.target.checked }))} />
                Requires balance
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
                <input type="checkbox" checked={!!policyForm.allow_negative}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, allow_negative: e.target.checked }))} />
                Allow negative balance
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">Save policy</Button>
              <Button type="button" variant="secondary" onClick={() => setPolicyForm(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tier form modal */}
      {tierForm && (
        <Modal open title={tierForm.mode === 'create' ? `New accrual tier — ${tierForm.leave_type}` : `Edit tier — ≥${tierForm.min_years} yrs`} titleId="tier-form-modal" onClose={() => setTierForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveTier(tierForm); }} style={{ marginTop: '0.5rem' }}>
            <div className="form-group">
              <label>Minimum years of service *</label>
              <input type="number" min="0" value={tierForm.min_years}
                onChange={(e) => setTierForm((t) => ({ ...t, min_years: e.target.value }))}
                disabled={tierForm.mode === 'edit'}
                required />
              <p className="form-hint">This tier applies to employees with ≥ this many years of service.</p>
            </div>
            <div className="form-group">
              <label>Days accrued per month *</label>
              <input type="number" min="0" step="0.001" value={tierForm.monthly_days}
                onChange={(e) => setTierForm((t) => ({ ...t, monthly_days: e.target.value }))}
                required />
              <p className="form-hint">e.g. 1.25 → 15 days/year. 1.75 → 21 days/year (PSSRM 6+ years).</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary">Save tier</Button>
              <Button type="button" variant="secondary" onClick={() => setTierForm(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(deletePolicyConfirm)}
        title="Delete leave policy"
        message={<>Delete policy <strong>{deletePolicyConfirm?.leave_type}</strong>? All accrual tiers for this type will also be removed. This cannot be undone.</>}
        confirmText="Delete"
        onClose={() => setDeletePolicyConfirm(null)}
        onConfirm={handleDeletePolicy}
        variant="danger"
      />
      <ConfirmDialog
        open={Boolean(deleteTierConfirm)}
        title="Delete accrual tier"
        message={<>Delete the tier for <strong>≥{deleteTierConfirm?.minYears} years</strong> on <strong>{deleteTierConfirm?.leaveType}</strong>? This cannot be undone.</>}
        confirmText="Delete"
        onClose={() => setDeleteTierConfirm(null)}
        onConfirm={handleDeleteTier}
        variant="danger"
      />
    </div>
  );
}
