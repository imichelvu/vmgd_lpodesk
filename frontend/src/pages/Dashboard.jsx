import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

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

  useEffect(() => {
    let cancelled = false;
    request('/leave/mine')
      .then((data) => { if (!cancelled) setApplications(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [request]);

  return (
    <>
      <h2>Dashboard</h2>
      <p style={{ color: 'var(--text-muted)' }}>Welcome, {user?.full_name}.</p>

      {hasRole(ROLE_IDS.Staff) && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>My leave applications</h3>
            <Link to="/apply" className="btn btn-primary">New application</Link>
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
                {applications.slice(0, 10).map((app) => (
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
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {hasRole([ROLE_IDS.PSO, ROLE_IDS.Manager]) && (
          <Link to="/supervisor" className="btn btn-secondary">Go to Approvals</Link>
        )}
        {hasRole(ROLE_IDS.Director) && (
          <Link to="/director" className="btn btn-secondary">Director view</Link>
        )}
        {hasRole(ROLE_IDS.Admin) && (
          <Link to="/admin" className="btn btn-secondary">Admin</Link>
        )}
      </div>
    </>
  );
}
