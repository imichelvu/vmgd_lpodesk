/**
 * Author: Igor Michel
 * Purpose: List all procurement requests created by the current user with filtering.
 * Last updated: 2026-03-11
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import StatsRow from '../components/StatsRow';
import Button from '../components/Button';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'manager_approved', label: 'Manager Approved' },
  { value: 'ict_approved', label: 'ICT Approved' },
  { value: 'procurement_approved', label: 'Procurement Approved' },
  { value: 'director_approved', label: 'Director Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

function formatAmount(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-VU', { style: 'currency', currency: 'VUV', maximumFractionDigits: 0 }).format(amount);
}

export default function MyRequests() {
  const { api } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api('/requests/mine')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
        return data;
      })
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Failed to load requests'))
      .finally(() => setLoading(false));
  }, [api]);

  const filtered = requests.filter((r) => {
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.supplier_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Total', value: requests.length, tone: 'default' },
    { label: 'In Progress', value: requests.filter((r) => !['draft','rejected','completed'].includes(r.status)).length, tone: 'warning' },
    { label: 'Completed', value: requests.filter((r) => r.status === 'completed').length, tone: 'success' },
    { label: 'Rejected', value: requests.filter((r) => r.status === 'rejected').length, tone: requests.filter((r) => r.status === 'rejected').length ? 'danger' : 'default' },
  ];

  return (
    <div className="page-content">
      <PageHeader title="My Requests" subtitle="All procurement requests you have created">
        <Link to="/requests/new" className="btn btn-primary">+ New Request</Link>
      </PageHeader>

      <StatsRow stats={stats} />

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="filter-row" style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Search by title or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-control"
          style={{ maxWidth: 220 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {requests.length === 0
            ? <p>No requests yet. <Link to="/requests/new">Create your first request.</Link></p>
            : <p>No requests match your current filter.</p>
          }
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Payment</th>
                  <th>Budget</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                    <td><strong>{req.title}</strong></td>
                    <td><span className="tag">{req.payment_type || 'LPO'}</span></td>
                    <td>{req.budget_type || <span className="muted">—</span>}</td>
                    <td><span className="tag">{req.category}</span></td>
                  <td>{formatAmount(req.amount)}</td>
                  <td><StatusBadge status={req.status} /></td>
                  <td>{new Date(req.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/requests/${req.id}`} className="btn btn-sm btn-secondary">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-count muted" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Showing {filtered.length} of {requests.length} requests
          </p>
        </div>
      )}
    </div>
  );
}
