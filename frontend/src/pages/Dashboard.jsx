import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useRequestList } from '../hooks/useRequestList';
import { usePagination } from '../hooks/usePagination';
import Button from '../components/Button';
import StatsRow from '../components/StatsRow';
import PageHeader from '../components/PageHeader';
import { toApplicationStatusLabel } from '../constants/applicationStatus';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { request } = useApi();
  const { list: applications, loading, error } = useRequestList(request, '/leave/mine', []);
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedApplications,
    hasPagination,
    canPrev,
    canNext,
  } = usePagination(applications, 20);

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

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome, ${user?.full_name}.`}
      />

      <StatsRow items={stats} />

      {error && (
        <div className="alert alert-danger">
          Could not load your applications: {error}
        </div>
      )}

      <div className="card">
        <div className="dashboard-section-title-row">
          <h3 className="dashboard-section-title">My leave applications</h3>
          {hasRole(ROLE_IDS.Staff) && (
            <Button to="/apply" variant="primary">New application</Button>
          )}
        </div>
        <p className="text-muted dashboard-helper-text">
          View status of your applications. Use “New application” to submit PSC Form 4-9.
        </p>
        {loading ? (
          <p className="text-muted">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-muted">
            No applications found for this account yet.
          </p>
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
                      <td>{toApplicationStatusLabel(app.status)}</td>
                      <td>
                        <Link to={`/application/${app.id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasPagination && (
              <div className="table-pagination">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!canPrev}
                >
                  Previous
                </button>
                <span className="table-pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNext}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="dashboard-quick-actions">
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
