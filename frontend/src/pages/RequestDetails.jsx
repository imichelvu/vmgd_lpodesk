/**
 * Author: Igor Michel
 * Purpose: Show full procurement request details with approval history and approve/reject actions.
 * Last updated: 2026-03-11
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, ROLE_IDS } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import Modal from '../components/Modal';

const APPROVER_ROLE_IDS = [ROLE_IDS.Manager, ROLE_IDS.ICTManager, ROLE_IDS.Procurement, ROLE_IDS.Director];

function formatAmount(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-VU', { style: 'currency', currency: 'VUV', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();

  const [request, setRequest] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionModal, setActionModal] = useState(null); // 'approve' | 'reject' | null
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [submitLoading, setSubmitLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, appRes, docRes] = await Promise.all([
        api(`/requests/${id}`),
        api(`/requests/${id}/approvals`),
        api(`/documents/request/${id}`),
      ]);
      const reqData = await reqRes.json();
      if (!reqRes.ok) throw new Error(reqData.error || 'Request not found');
      setRequest(reqData);
      setApprovals(Array.isArray(await appRes.json()) ? await appRes.clone().json() : []);
      setDocuments(Array.isArray(await docRes.json()) ? await docRes.clone().json() : []);
    } catch (err) {
      setError(err.message || 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    // Fetch all three in parallel correctly
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [reqRes, appRes, docRes] = await Promise.all([
          api(`/requests/${id}`),
          api(`/requests/${id}/approvals`),
          api(`/documents/request/${id}`),
        ]);
        const [reqData, appData, docData] = await Promise.all([
          reqRes.json(),
          appRes.json(),
          docRes.json(),
        ]);
        if (!reqRes.ok) throw new Error(reqData.error || 'Request not found');
        setRequest(reqData);
        setApprovals(Array.isArray(appData) ? appData : []);
        setDocuments(Array.isArray(docData) ? docData : []);
      } catch (err) {
        setError(err.message || 'Failed to load request');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, api]);

  const roleIds = user?.role_ids || [];
  const isOwner = request?.created_by === user?.id;
  const isApprover = roleIds.some((rid) => APPROVER_ROLE_IDS.includes(rid));
  const canSubmit = isOwner && request?.status === 'draft';

  const TERMINAL_STATUSES = ['rejected', 'completed', 'director_approved'];
  const canAct = isApprover && request && !TERMINAL_STATUSES.includes(request.status) && request.status !== 'draft';

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const res = await api(`/requests/${id}/submit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setRequest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDecision = async () => {
    setActionError('');
    setActionLoading(true);
    const decision = actionModal;
    try {
      const res = await api(`/requests/${id}/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${decision}`);
      setRequest(data);
      // Reload approvals
      const appRes = await api(`/requests/${id}/approvals`);
      const appData = await appRes.json();
      setApprovals(Array.isArray(appData) ? appData : []);
      setActionModal(null);
      setComment('');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="page-content"><p className="muted">Loading...</p></div>;
  if (error) return <div className="page-content"><div className="alert alert-danger">{error}</div><Link to="/requests" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back</Link></div>;
  if (!request) return null;

  return (
    <div className="page-content">
      <PageHeader
        title={`Request #${request.id}: ${request.title}`}
        subtitle={`Submitted by ${request.requester_name}`}
      >
        <Link to="/requests" className="btn btn-secondary">← Back</Link>
      </PageHeader>

      {/* Status banner */}
      <div className="detail-status-bar" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <StatusBadge status={request.status} />
        <span className="muted" style={{ fontSize: '0.875rem' }}>
          Created {formatDate(request.created_at)}
        </span>
      </div>

      {/* Actions */}
      {(canSubmit || canAct) && (
        <div className="action-bar" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {canSubmit && (
            <Button variant="primary" loading={submitLoading} loadingText="Submitting..." onClick={handleSubmit}>
              Submit for Approval
            </Button>
          )}
          {canAct && (
            <>
              <Button variant="primary" onClick={() => { setActionModal('approve'); setActionError(''); setComment(''); }}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => { setActionModal('reject'); setActionError(''); setComment(''); }}>
                Reject
              </Button>
            </>
          )}
        </div>
      )}

      {/* Details grid */}
      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="detail-card">
          <dt>Payment Type</dt>
          <dd><span className="tag">{request.payment_type || 'LPO'}</span></dd>
        </div>
        <div className="detail-card">
          <dt>Budget Type</dt>
          <dd>{request.budget_type || <span className="muted">—</span>}</dd>
        </div>
        <div className="detail-card">
          <dt>Category</dt>
          <dd><span className="tag">{request.category}</span></dd>
        </div>
        <div className="detail-card">
          <dt>Total Amount</dt>
          <dd><strong>{formatAmount(request.amount)}</strong></dd>
        </div>
        <div className="detail-card">
          <dt>Supplier</dt>
          <dd>{request.supplier_name || <span className="muted">—</span>}</dd>
        </div>
        <div className="detail-card">
          <dt>Invoice / Quote No.</dt>
          <dd>{request.quote_number || <span className="muted">—</span>}</dd>
        </div>
        <div className="detail-card">
          <dt>Requesting Officer</dt>
          <dd>{request.requester_name}</dd>
        </div>
      </div>

      {request.description && (
        <section style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">Description / Justification</h3>
          <div className="prose-block" style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            {request.description}
          </div>
        </section>
      )}

      {/* Documents */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 className="section-title">Attached Documents</h3>
        {documents.length === 0 ? (
          <p className="muted">No documents attached.</p>
        ) : (
          <ul className="document-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {documents.map((doc) => (
              <li key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '1.25rem' }}>📎</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{doc.file_name}</div>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>Uploaded by {doc.uploader_name} · {new Date(doc.created_at).toLocaleDateString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Approval History */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 className="section-title">Approval History</h3>
        {approvals.length === 0 ? (
          <p className="muted">No approvals recorded yet.</p>
        ) : (
          <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {approvals.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', background: a.decision === 'rejected' ? '#fef2f2' : '#f0fdf4', borderRadius: 8, border: `1px solid ${a.decision === 'rejected' ? '#fecaca' : '#bbf7d0'}` }}>
                <span style={{ fontSize: '1.2rem' }}>{a.decision === 'approved' ? '✅' : '❌'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.approver_name} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.875rem' }}>({a.role.replace('_', ' ')})</span></div>
                  <div style={{ fontSize: '0.875rem', color: '#374151' }}>{a.decision === 'approved' ? 'Approved' : 'Rejected'} · {formatDate(a.approved_at)}</div>
                  {a.comment && <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: '#4b5563' }}>&ldquo;{a.comment}&rdquo;</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approve / Reject Modal */}
      {actionModal && (
        <Modal title={actionModal === 'approve' ? 'Approve Request' : 'Reject Request'} onClose={() => setActionModal(null)}>
          <p style={{ marginBottom: '1rem' }}>
            {actionModal === 'approve'
              ? `You are approving request #${request.id}: "${request.title}"`
              : `You are rejecting request #${request.id}: "${request.title}"`
            }
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="action-comment">
              Comment {actionModal === 'reject' && <span className="required">*</span>}
            </label>
            <textarea
              id="action-comment"
              className="form-control"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={actionModal === 'reject' ? 'Please provide a reason for rejection' : 'Optional comment...'}
            />
          </div>
          {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
          <div className="form-actions">
            <Button
              variant={actionModal === 'approve' ? 'primary' : 'danger'}
              loading={actionLoading}
              loadingText={actionModal === 'approve' ? 'Approving...' : 'Rejecting...'}
              onClick={handleDecision}
            >
              {actionModal === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
            <Button variant="secondary" onClick={() => setActionModal(null)} disabled={actionLoading}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
