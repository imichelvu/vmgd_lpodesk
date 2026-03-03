/**
 * Author: Igor Michel
 * Purpose: Show leave application details, approvers, status, and approval actions.
 * Last updated: 2026-02-28
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import SignatureField from '../components/SignatureField';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { formatLeaveEnd, formatLeaveStart } from '../utils/leaveDateDisplay';

const STATUS_LABELS = {
  Pending_PSO: 'Pending Superior',
  Pending_Manager: 'Pending Manager',
  Pending_Director: 'Pending Director',
  Approved: 'Approved',
  Disapproved: 'Disapproved',
};

function toRoleLabelForPsoStage(roleIds) {
  const ids = Array.isArray(roleIds) ? roleIds.map(Number) : [];
  if (ids.includes(ROLE_IDS.Manager) && !ids.includes(ROLE_IDS.PSO)) return 'Manager';
  return 'PSO';
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole, api } = useAuth();
  const [app, setApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [action, setAction] = useState(null);
  const [comment, setComment] = useState('');
  const [approverSignature, setApproverSignature] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api(`/leave/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setApp(data);
          const base = (import.meta.env.VITE_APP_NAME ?? '').trim();
          document.title = base ? `Application #${id} · ${base}` : `Application #${id}`;
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id, api]);

  const canApprove = app && (
    (app.status === 'Pending_PSO' && (hasRole(ROLE_IDS.PSO) || hasRole(ROLE_IDS.Manager))) ||
    (app.status === 'Pending_Manager' && hasRole(ROLE_IDS.Manager)) ||
    (app.status === 'Pending_Director' && hasRole(ROLE_IDS.Director))
  );

  const handleAction = async (act) => {
    if (!approverSignature) return;
    setActionLoading(true);
    try {
      const res = await api(`/leave/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: act,
          comment: comment.trim() || undefined,
          approver_signature_data: approverSignature,
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        if (!res.ok) throw new Error(res.statusText || 'Request failed');
      }
      if (!res.ok) throw new Error(data.detail || data.error || res.statusText || 'Approval failed');
      setAction(null);
      setComment('');
      setApproverSignature(null);
      const newStatus = data.status || (act === 'disapprove' ? 'Disapproved' : null);
      if (newStatus && app) setApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      const updated = await api(`/leave/${id}`).then((r) => r.json());
      setApp(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!app) return <div>Loading...</div>;

  const psoName = app.approved_by_pso_name || '';
  const managerName = app.approved_by_manager_name || '';
  const directorName = app.approved_by_director_name || '';
  const psoRoleLabel = toRoleLabelForPsoStage(app.approved_by_pso_role_ids);
  const samePersonForPsoAndManager = psoName && managerName && psoName === managerName;
  const hasApprovers = !!(psoName || managerName || directorName);

  return (
    <>
      <p style={{ margin: '0 0 8px 0' }}>
        <button type="button" className="nav-back" onClick={() => navigate('/')}>
          ← Back to dashboard
        </button>
      </p>
      <PageHeader title={`Application #${app.id}`} />
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span><strong>Status:</strong> <StatusBadge status={app.status} /></span>
          {app.status === 'Approved' && Number(user?.id) === Number(app.applicant_id) && (
            <Button to={`/application/${app.id}/print`} variant="secondary">Printable full form</Button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Applicant</h3>
        <p><strong>Name:</strong> {app.applicant_name}</p>
        <p><strong>Email:</strong> {app.applicant_email}</p>
        {app.division_name && <p><strong>Division:</strong> {app.division_name}</p>}
        {app.vnpf_no && <p><strong>VNPF No:</strong> {app.vnpf_no}</p>}
        {app.post_title && <p><strong>Post title:</strong> {app.post_title}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Leave details</h3>
        <p><strong>Type:</strong> {app.leave_type}</p>
        {app.destination && <p><strong>Destination:</strong> {app.destination}</p>}
        <p><strong>Start:</strong> {formatLeaveStart(app)}</p>
        <p><strong>End:</strong> {formatLeaveEnd(app)}</p>
        <p><strong>Working days:</strong> {app.total_working_days}</p>
        <p><strong>Advance pay:</strong> {app.advance_pay ? 'Yes' : 'No'}</p>
        {app.reason_or_remarks && <p><strong>Remarks:</strong> {app.reason_or_remarks}</p>}
      </div>

      {(app.pso_comment || app.manager_comment || app.director_comment) && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Comments</h3>
          {app.pso_comment && <p><strong>PSO:</strong> {app.pso_comment}</p>}
          {app.manager_comment && <p><strong>Manager:</strong> {app.manager_comment}</p>}
          {app.director_comment && <p><strong>Director:</strong> {app.director_comment}</p>}
        </div>
      )}

      {hasApprovers && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Approvers</h3>
          {samePersonForPsoAndManager ? (
            <p>
              <strong>Approved by (Manager):</strong> {managerName}
              {app.manager_approved_at ? ` (${formatDateTime(app.manager_approved_at)})` : ''}
            </p>
          ) : (
            <>
              {psoName && (
                <p>
                  <strong>Approved at PSO stage ({psoRoleLabel}):</strong> {psoName}
                  {app.pso_approved_at ? ` (${formatDateTime(app.pso_approved_at)})` : ''}
                </p>
              )}
              {managerName && (
                <p>
                  <strong>Approved at Manager stage (Manager):</strong> {managerName}
                  {app.manager_approved_at ? ` (${formatDateTime(app.manager_approved_at)})` : ''}
                </p>
              )}
            </>
          )}
          {directorName && (
            <p>
              <strong>Approved by (Director):</strong> {directorName}
              {app.director_approved_at ? ` (${formatDateTime(app.director_approved_at)})` : ''}
            </p>
          )}
        </div>
      )}

      {canApprove && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Approve / Disapprove</h3>
          {action === null ? (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Button type="button" variant="primary" onClick={() => setAction('approve')}>Approve</Button>
              <Button type="button" variant="danger" onClick={() => setAction('disapprove')}>Disapprove</Button>
            </div>
          ) : (
            <>
              {action === 'disapprove' && (
                <div className="form-group">
                  <label>Comment (mandatory for disapproval)</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} required />
                </div>
              )}
              <div>
                <SignatureField
                  label="Your signature (required)"
                  hint="Sign below before confirming."
                  required
                  width={320}
                  height={120}
                  value={approverSignature}
                  onChange={setApproverSignature}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!approverSignature || (action === 'disapprove' && !comment.trim())}
                  loading={actionLoading}
                  loadingText="Processing..."
                  onClick={() => handleAction(action)}
                >
                  {action === 'approve' ? 'Approve' : 'Disapprove'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setAction(null); setComment(''); setApproverSignature(null); }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
