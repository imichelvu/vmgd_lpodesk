import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Button from '../components/Button';
import StatsRow from '../components/StatsRow';

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
      <h2>Approvals</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Applications from your division requiring your approval. Acting delegations are included.
      </p>
      <StatsRow items={stats} />
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
                    <Button to={`/application/${app.id}`} variant="primary" size="sm" style={{ padding: '0.35rem 0.75rem' }}>
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
