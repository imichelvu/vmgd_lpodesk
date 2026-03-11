/**
 * Author: Igor Michel
 * Purpose: Show procurement requests awaiting the current approver's decision.
 * Last updated: 2026-03-11
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_IDS } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import StatsRow from '../components/StatsRow';

const ROLE_LABEL = {
  [ROLE_IDS.Manager]: 'Manager',
  [ROLE_IDS.ICTManager]: 'ICT Manager',
  [ROLE_IDS.Procurement]: 'Procurement Officer',
  [ROLE_IDS.Director]: 'Director',
};

function formatAmount(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-VU', { style: 'currency', currency: 'VUV', maximumFractionDigits: 0 }).format(amount);
}

export default function PendingApprovals() {
  const { api, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roleIds = user?.role_ids || [];
  const approverRoleLabels = roleIds
    .filter((rid) => ROLE_LABEL[rid])
    .map((rid) => ROLE_LABEL[rid])
    .join(', ');

  useEffect(() => {
    setLoading(true);
    api('/requests/pending')
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load pending requests'))
      .finally(() => setLoading(false));
  }, [api]);

  const stats = [
    { label: 'Pending', value: requests.length, tone: requests.length ? 'warning' : 'default' },
    { label: 'ICT Equipment', value: requests.filter((r) => r.category === 'ICT Equipment').length, tone: 'default' },
    { label: 'High Value (>100k)', value: requests.filter((r) => r.amount > 100000).length, tone: requests.filter((r) => r.amount > 100000).length ? 'danger' : 'default' },
  ];

  return (
    <div className="page-content">
      <PageHeader
        title="Pending Approvals"
        subtitle={approverRoleLabels ? `You are reviewing as: ${approverRoleLabels}` : 'Requests awaiting your decision'}
      />

      <StatsRow stats={stats} />

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <p>No requests are currently pending your approval.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Requester</th>
                <th>Supplier</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Stage</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td><strong>{req.title}</strong></td>
                  <td>{req.requester_name}</td>
                  <td>{req.supplier_name || <span className="muted">—</span>}</td>
                  <td><span className="tag">{req.category}</span></td>
                  <td>{formatAmount(req.amount)}</td>
                  <td><StatusBadge status={req.status} /></td>
                  <td>{new Date(req.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/requests/${req.id}`} className="btn btn-sm btn-primary">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
