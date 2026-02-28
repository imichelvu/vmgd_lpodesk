import React from 'react';
import { useApi } from '../hooks/useApi';
import { useRequestList } from '../hooks/useRequestList';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';

export default function DirectorView() {
  const { request } = useApi();
  const { list } = useRequestList(request, '/leave/director', []);

  return (
    <>
      <PageHeader
        title="Director — Final sign-off"
        subtitle="All VMGD staff applications across divisions, after manager approval. Perform final sign-off here."
      />
      {list.length === 0 ? (
        <div className="card">
          <p className="text-muted">No applications pending Director sign-off.</p>
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
                    <Button to={`/application/${app.id}`} variant="primary" size="sm">
                      Sign off
                    </Button>
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
