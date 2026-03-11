/**
 * Author: Igor Michel
 * Purpose: Role-aware dashboard showing request stats and quick actions for LPODesk.
 * Last updated: 2026-03-11
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_IDS } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import StatsRow from '../components/StatsRow';

const CATEGORIES = ['ICT Equipment', 'Office Supplies', 'Services', 'Maintenance', 'Consultancy'];

function formatAmount(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-VU', { style: 'currency', currency: 'VUV', maximumFractionDigits: 0 }).format(amount);
}

export default function Dashboard() {
  const { user, api, hasRole } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [error, setError] = useState('');

  const isApprover = hasRole([ROLE_IDS.Manager, ROLE_IDS.ICTManager, ROLE_IDS.Procurement, ROLE_IDS.Director]);
  const isAdmin = hasRole(ROLE_IDS.Admin);

  useEffect(() => {
    setLoadingMine(true);
    api('/requests/mine')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
        return data;
      })
      .then((data) => setMyRequests(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Failed to load your requests'))
      .finally(() => setLoadingMine(false));
  }, [api]);

  useEffect(() => {
    if (!isApprover && !isAdmin) return;
    setLoadingPending(true);
    api('/requests/pending')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return [];
        return data;
      })
      .then((data) => setPendingRequests(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingPending(false));
  }, [api, isApprover, isAdmin]);

  const recentRequests = myRequests.slice(0, 5);

  const stats = [
    { label: 'My Requests', value: myRequests.length, tone: 'default' },
    { label: 'Draft', value: myRequests.filter((r) => r.status === 'draft').length, tone: 'default' },
    { label: 'In Progress', value: myRequests.filter((r) => !['draft','rejected','completed'].includes(r.status)).length, tone: myRequests.filter((r) => !['draft','rejected','completed'].includes(r.status)).length ? 'warning' : 'default' },
    { label: 'Completed', value: myRequests.filter((r) => r.status === 'completed').length, tone: 'success' },
  ];

  return (
    <div className="page-content">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'User'}`}
        subtitle="LPODesk — Local Purchase Order Request Workflow"
      />

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <StatsRow stats={stats} />

      <div className="dashboard-actions" style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
        <Link to="/requests/new" className="btn btn-primary">+ New Request</Link>
        <Link to="/requests" className="btn btn-secondary">View All My Requests</Link>
        {isApprover && (
          <Link to="/approvals" className="btn btn-secondary">
            Pending Approvals {pendingRequests.length > 0 && <span className="badge">{pendingRequests.length}</span>}
          </Link>
        )}
      </div>

      <section>
        <h2 className="section-title">Recent Requests</h2>
        {loadingMine ? (
          <p className="muted">Loading...</p>
        ) : recentRequests.length === 0 ? (
          <div className="empty-state">
            <p>No requests yet. <Link to="/requests/new">Submit your first request.</Link></p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td>{req.title}</td>
                    <td><span className="tag">{req.category}</span></td>
                    <td>{formatAmount(req.amount)}</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td><Link to={`/requests/${req.id}`} className="btn btn-sm btn-secondary">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {myRequests.length > 5 && (
          <div style={{ marginTop: '0.75rem' }}>
            <Link to="/requests" className="link-subtle">View all {myRequests.length} requests →</Link>
          </div>
        )}
      </section>

      {isApprover && (
        <section style={{ marginTop: '2rem' }}>
          <h2 className="section-title">Pending Your Approval</h2>
          {loadingPending ? (
            <p className="muted">Loading...</p>
          ) : pendingRequests.length === 0 ? (
            <p className="muted">No requests pending your approval.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Requester</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.slice(0, 5).map((req) => (
                    <tr key={req.id}>
                      <td>{req.id}</td>
                      <td>{req.title}</td>
                      <td>{req.requester_name}</td>
                      <td><span className="tag">{req.category}</span></td>
                      <td>{formatAmount(req.amount)}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td><Link to={`/requests/${req.id}`} className="btn btn-sm btn-primary">Review</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pendingRequests.length > 5 && (
            <div style={{ marginTop: '0.75rem' }}>
              <Link to="/approvals" className="link-subtle">View all {pendingRequests.length} pending →</Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
