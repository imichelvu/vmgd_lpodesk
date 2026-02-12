import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

export default function DirectorView() {
  const { request } = useApi();
  const [list, setList] = useState([]);

  useEffect(() => {
    let cancelled = false;
    request('/leave/director')
      .then((data) => { if (!cancelled) setList(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [request]);

  return (
    <>
      <h2>Director — Final sign-off</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        All VMGD staff applications across divisions, after manager approval. Perform final sign-off here.
      </p>
      {list.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)' }}>No applications pending Director sign-off.</p>
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
                  <td>
                    <Link to={`/application/${app.id}`} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem' }}>
                      Sign off
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
