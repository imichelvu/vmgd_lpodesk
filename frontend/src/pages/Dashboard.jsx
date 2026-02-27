import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import StatsRow from '../components/StatsRow';

const STATUS_LABELS = {
  Pending_PSO: 'Pending Superior',
  Pending_Manager: 'Pending Manager',
  Pending_Director: 'Pending Director',
  Approved: 'Approved',
  Disapproved: 'Disapproved',
};

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { request } = useApi();
  const [applications, setApplications] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    let cancelled = false;
    request('/leave/mine')
      .then((data) => { if (!cancelled) setApplications(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [request]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(applications.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [applications, page]);

  const stats = useMemo(() => {
    if (!Array.isArray(applications) || !applications.length) {
      return [];
    }
    const total = applications.length;
    const pending = applications.filter((a) => a.status && String(a.status).startsWith('Pending')).length;
    const approved = applications.filter((a) => a.status === 'Approved').length;
    const disapproved = applications.filter((a) => a.status === 'Disapproved').length;
    return [
      { label: 'Total applications', value: total, tone: 'default' },
      { label: 'Pending', value: pending, tone: pending ? 'warning' : 'default', hint: pending ? 'Waiting on approvals' : 'None pending' },
      { label: 'Approved', value: approved, tone: approved ? 'success' : 'default' },
      { label: 'Disapproved', value: disapproved, tone: disapproved ? 'danger' : 'default' },
    ];
  }, [applications]);

  const pagedApplications = useMemo(() => {
    if (!applications.length) return [];
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return applications.slice(start, end);
  }, [applications, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((applications.length || 0) / PAGE_SIZE)),
    [applications.length]
  );

  return (
    <>
      <h2>Dashboard</h2>
      <p style={{ color: 'var(--text-muted)' }}>Welcome, {user?.full_name}.</p>

      <StatsRow items={stats} />

      {hasRole(ROLE_IDS.Staff) && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>My leave applications</h3>
            <Button to="/apply" variant="primary">New application</Button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            View status of your applications. Use “New application” to submit PSC Form 4-9.
          </p>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent applications</h3>
        {applications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No applications yet.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedApplications.map((app) => (
                    <tr key={app.id}>
                      <td>{app.id}</td>
                      <td>{app.leave_type}</td>
                      <td>{app.start_date}</td>
                      <td>{app.end_date}</td>
                      <td>{app.total_working_days}</td>
                      <td>{STATUS_LABELS[app.status] || app.status}</td>
                      <td>
                        <Link to={`/application/${app.id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {applications.length > PAGE_SIZE && (
              <div className="table-pagination">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span className="table-pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {hasRole([ROLE_IDS.PSO, ROLE_IDS.Manager]) && (
          <Button to="/supervisor" variant="secondary">Go to Approvals</Button>
        )}
        {hasRole(ROLE_IDS.Director) && (
          <Button to="/director" variant="secondary">Director view</Button>
        )}
        {hasRole(ROLE_IDS.Admin) && (
          <Button to="/admin" variant="secondary">Admin</Button>
        )}
      </div>
    </>
  );
}
