import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const STATUS_LABELS = {
  Pending_PSO: 'Pending Superior',
  Pending_Manager: 'Pending Manager',
};

export default function SupervisorView() {
  const { request } = useApi();
  const [list, setList] = useState([]);

  useEffect(() => {
    let cancelled = false;
    request('/leave/supervisor')
      .then((data) => { if (!cancelled) setList(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [request]);

  return (
    <>
      <h2>Approvals</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Applications from your division requiring your approval. Acting delegations are included.
      </p>
      {list.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)' }}>No applications pending your approval.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Applicant</th>
                <th>Division</th>
                <th>Type</th>
                <th>Start</th>
                <th>Days</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((app) => (
                <tr key={app.id}>
                  <td>{app.id}</td>
                  <td>{app.applicant_name}</td>
                  <td>{app.division_name || '—'}</td>
                  <td>{app.leave_type}</td>
                  <td>{app.start_date}</td>
                  <td>{app.total_working_days}</td>
                  <td>{STATUS_LABELS[app.status] || app.status}</td>
                  <td>
                    <Link to={`/application/${app.id}`} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem' }}>
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
