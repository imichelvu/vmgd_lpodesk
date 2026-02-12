import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import SignaturePad from '../components/SignaturePad';

const STATUS_LABELS = {
  Pending_PSO: 'Pending Superior',
  Pending_Manager: 'Pending Manager',
  Pending_Director: 'Pending Director',
  Approved: 'Approved',
  Disapproved: 'Disapproved',
};

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
      .then((data) => { if (!cancelled) setApp(data); })
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

  return (
    <>
      <h2>Application #{app.id}</h2>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span><strong>Status:</strong> {STATUS_LABELS[app.status] || app.status}</span>
          {app.applicant_id === user?.id && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
              Back to dashboard
            </button>
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
        <p><strong>Start:</strong> {app.start_date} {app.is_half_day && `(${app.half_day_time_start} - ${app.half_day_time_end})`}</p>
        <p><strong>End:</strong> {app.end_date}</p>
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

      {(app.approved_by_pso_name || app.approved_by_manager_name || app.approved_by_director_name) && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Approvers</h3>
          {app.approved_by_pso_name && <p><strong>Approved by (PSO level):</strong> {app.approved_by_pso_name}</p>}
          {app.approved_by_manager_name && <p><strong>Approved by (Manager):</strong> {app.approved_by_manager_name}</p>}
          {app.approved_by_director_name && <p><strong>Approved by (Director):</strong> {app.approved_by_director_name}</p>}
        </div>
      )}

      {canApprove && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Approve / Disapprove</h3>
          {action === null ? (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={() => setAction('approve')}>
                Approve
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setAction('disapprove')}>
                Disapprove
              </button>
            </div>
          ) : (
            <>
              {action === 'disapprove' && (
                <div className="form-group">
                  <label>Comment (mandatory for disapproval)</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} required />
                </div>
              )}
              <div className="form-group">
                <h4 className="section-title section-title-sm" style={{ marginBottom: 8 }}>Your signature (required)</h4>
                <p className="card-subtitle" style={{ marginTop: -4, marginBottom: 8 }}>Sign below before confirming.</p>
                <SignaturePad
                  width={320}
                  height={120}
                  onSave={setApproverSignature}
                  savedData={approverSignature}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={actionLoading || !approverSignature || (action === 'disapprove' && !comment.trim())}
                  onClick={() => handleAction(action)}
                >
                  {actionLoading ? 'Processing...' : action === 'approve' ? 'Approve' : 'Disapprove'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setAction(null); setComment(''); setApproverSignature(null); }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
