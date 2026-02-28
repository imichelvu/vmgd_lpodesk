import React, { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useRequestList } from '../hooks/useRequestList';
import Button from '../components/Button';
import StatsRow from '../components/StatsRow';
import PageHeader from '../components/PageHeader';
import { toApplicationStatusLabel } from '../constants/applicationStatus';

export default function SupervisorView() {
  const { request } = useApi();
  const { list } = useRequestList(request, '/leave/supervisor', []);

  const stats = useMemo(() => {
    if (!Array.isArray(list) || !list.length) return [];
    const total = list.length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const toDate = (s) => {
      if (!s) return null;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const today = new Date(todayStr);
    const in7Days = new Date(todayStr);
    in7Days.setDate(in7Days.getDate() + 7);

    let startingToday = 0;
    let startingSoon = 0;
    let alreadyStarted = 0;

    list.forEach((app) => {
      const d = toDate(app.start_date);
      if (!d) return;
      if (d.toISOString().slice(0, 10) === todayStr) startingToday += 1;
      else if (d > today && d <= in7Days) startingSoon += 1;
      else if (d < today) alreadyStarted += 1;
    });

    return [
      { label: 'Pending approvals', value: total, tone: total ? 'warning' : 'default' },
      { label: 'Starting today', value: startingToday, tone: startingToday ? 'success' : 'default' },
      { label: 'Next 7 days', value: startingSoon, tone: startingSoon ? 'success' : 'default', hint: 'Upcoming leave in your queue' },
      { label: 'Past start date', value: alreadyStarted, tone: alreadyStarted ? 'danger' : 'default', hint: alreadyStarted ? 'Needs quick decision' : undefined },
    ];
  }, [list]);

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Applications from your division requiring your approval. Acting delegations are included."
      />
      <StatsRow items={stats} />
      {list.length === 0 ? (
        <div className="card">
          <p className="text-muted">No applications pending your approval.</p>
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
                  <td>{toApplicationStatusLabel(app.status)}</td>
                  <td>
                    <Button to={`/application/${app.id}`} variant="primary" size="sm">
                      Review
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
