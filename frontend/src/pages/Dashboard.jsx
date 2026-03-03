/**
 * Author: Igor Michel
 * Purpose: Render user dashboard with leave summaries, applications, and inline approval actions.
 * Last updated: 2026-02-09
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useRequestList } from '../hooks/useRequestList';
import { usePagination } from '../hooks/usePagination';
import Button from '../components/Button';
import StatsRow from '../components/StatsRow';
import PageHeader from '../components/PageHeader';
import SignatureField from '../components/SignatureField';
import StatusBadge from '../components/StatusBadge';
import { formatLeaveEnd, formatLeaveRange, formatLeaveStart } from '../utils/leaveDateDisplay';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { request } = useApi();
  const { list: applications, loading, error, reload: reloadApplications } = useRequestList(request, '/leave/mine', []);
  const [applicationsTab, setApplicationsTab] = useState('active');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [balances, setBalances] = useState([]);
  const [balancesYear, setBalancesYear] = useState(new Date().getFullYear());
  const [balancesError, setBalancesError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDraft, setActionDraft] = useState({
    appId: null,
    action: null,
    comment: '',
    signature: null,
    error: '',
  });
  const activeApplications = useMemo(
    () => applications.filter((a) => String(a.status || '').startsWith('Pending')),
    [applications]
  );
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedApplications,
    hasPagination,
    canPrev,
    canNext,
  } = usePagination(activeApplications, 20);
  const HISTORY_PAGE_SIZE = 10;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const query = new URLSearchParams({
        page: String(historyPage),
        pageSize: String(HISTORY_PAGE_SIZE),
      });
      const data = await request(`/leave/mine/history?${query.toString()}`);
      setHistoryItems(Array.isArray(data?.items) ? data.items : []);
      setHistoryTotalPages(Number(data?.totalPages) || 1);
      setHistoryTotal(Number(data?.total) || 0);
    } catch (e) {
      setHistoryError(e?.message || 'Could not load your history.');
      setHistoryItems([]);
      setHistoryTotalPages(1);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, request]);

  useEffect(() => {
    if (applicationsTab === 'history') loadHistory();
  }, [applicationsTab, loadHistory]);

  const canApproveApplication = (app) => (
    (app.status === 'Pending_PSO' && (hasRole(ROLE_IDS.PSO) || hasRole(ROLE_IDS.Manager)))
    || (app.status === 'Pending_Manager' && hasRole(ROLE_IDS.Manager))
    || (app.status === 'Pending_Director' && hasRole(ROLE_IDS.Director))
  );

  const resetDraft = () => {
    setActionDraft({
      appId: null,
      action: null,
      comment: '',
      signature: null,
      error: '',
    });
  };

  const openActionDraft = (appId, action) => {
    setActionDraft({
      appId,
      action,
      comment: '',
      signature: null,
      error: '',
    });
  };

  const submitDecision = async () => {
    if (!actionDraft.appId || !actionDraft.action) return;
    if (!actionDraft.signature) {
      setActionDraft((prev) => ({ ...prev, error: 'Signature is required before submitting.' }));
      return;
    }
    if (actionDraft.action === 'disapprove' && !actionDraft.comment.trim()) {
      setActionDraft((prev) => ({ ...prev, error: 'Comment is mandatory for disapproval.' }));
      return;
    }

    setActionLoading(true);
    try {
      await request(`/leave/${actionDraft.appId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionDraft.action,
          comment: actionDraft.comment.trim() || undefined,
          approver_signature_data: actionDraft.signature,
        }),
      });
      resetDraft();
      reloadApplications();
      if (applicationsTab === 'history') loadHistory();
    } catch (e) {
      setActionDraft((prev) => ({ ...prev, error: e?.message || 'Could not complete approval action.' }));
    } finally {
      setActionLoading(false);
    }
  };

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

  useEffect(() => {
    let cancelled = false;
    request('/leave/balances')
      .then((data) => {
        if (cancelled) return;
        setBalances(Array.isArray(data?.items) ? data.items : []);
        setBalancesYear(Number(data?.year) || new Date().getFullYear());
        setBalancesError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setBalances([]);
        setBalancesError(err?.message || 'Could not load leave balances.');
      });
    return () => { cancelled = true; };
  }, [request]);

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
      {balancesError && (
        <div className="alert alert-warning">
          Could not load leave balances: {balancesError}
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
        <div className="tabs" role="tablist" aria-label="My leave applications views">
          <button
            type="button"
            className={`tab${applicationsTab === 'active' ? ' active' : ''}`}
            onClick={() => setApplicationsTab('active')}
          >
            Active ({activeApplications.length})
          </button>
          <button
            type="button"
            className={`tab${applicationsTab === 'history' ? ' active' : ''}`}
            onClick={() => setApplicationsTab('history')}
          >
            History
          </button>
        </div>

        {applicationsTab === 'active' ? (
          loading ? (
            <p className="text-muted">Loading applications...</p>
          ) : activeApplications.length === 0 ? (
            <p className="text-muted">
              No active applications right now.
            </p>
          ) : (
          <>
            <div className="dashboard-accordion-list">
              {pagedApplications.map((app) => {
                const isDraftForItem = actionDraft.appId === app.id;
                const canApprove = canApproveApplication(app);
                return (
                  <details key={app.id} className="dashboard-accordion-item">
                    <summary className="dashboard-accordion-summary">
                      <div className="dashboard-accordion-headline">
                        <strong>#{app.id} · {app.leave_type}</strong>
                        <span className="text-muted">
                          {formatLeaveRange(app)} · {app.total_working_days} days
                        </span>
                      </div>
                      <StatusBadge status={app.status} />
                    </summary>

                    <div className="dashboard-accordion-content">
                      <div className="dashboard-accordion-grid">
                        <p><strong>Start:</strong> {formatLeaveStart(app)}</p>
                        <p><strong>End:</strong> {formatLeaveEnd(app)}</p>
                        <p><strong>Working days:</strong> {app.total_working_days}</p>
                        <p><strong>Type:</strong> {app.leave_type}</p>
                      </div>

                      {canApprove && !isDraftForItem && (
                        <div className="dashboard-accordion-actions">
                          <Button type="button" variant="primary" onClick={() => openActionDraft(app.id, 'approve')}>
                            Approve
                          </Button>
                          <Button type="button" variant="danger" onClick={() => openActionDraft(app.id, 'disapprove')}>
                            Disapprove
                          </Button>
                        </div>
                      )}

                      {isDraftForItem && (
                        <div className="dashboard-approval-box">
                          {actionDraft.error ? <div className="alert alert-danger">{actionDraft.error}</div> : null}
                          {actionDraft.action === 'disapprove' && (
                            <div className="form-group">
                              <label>Comment (mandatory for disapproval)</label>
                              <textarea
                                rows={3}
                                value={actionDraft.comment}
                                onChange={(e) => setActionDraft((prev) => ({ ...prev, comment: e.target.value, error: '' }))}
                              />
                            </div>
                          )}
                          <SignatureField
                            label="Your signature (required)"
                            hint="Sign below before confirming this action."
                            required
                            width={320}
                            height={120}
                            value={actionDraft.signature}
                            onChange={(value) => setActionDraft((prev) => ({ ...prev, signature: value, error: '' }))}
                          />
                          <div className="dashboard-accordion-actions">
                            <Button
                              type="button"
                              variant="primary"
                              loading={actionLoading}
                              loadingText="Processing..."
                              onClick={submitDecision}
                            >
                              {actionDraft.action === 'approve' ? 'Confirm approve' : 'Confirm disapprove'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={resetDraft}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {!canApprove && (
                        <div className="dashboard-accordion-meta">
                          <Link to={`/application/${app.id}`}>Open full details</Link>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
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
          )
        ) : (
          <>
            {historyError ? <div className="alert alert-danger">{historyError}</div> : null}
            {historyLoading ? (
              <p className="text-muted">Loading history...</p>
            ) : historyItems.length === 0 ? (
              <p className="text-muted">No completed application history yet.</p>
            ) : (
              <div className="dashboard-accordion-list">
                {historyItems.map((app) => (
                  <details key={`hist-${app.id}`} className="dashboard-accordion-item">
                    <summary className="dashboard-accordion-summary">
                      <div className="dashboard-accordion-headline">
                        <strong>#{app.id} · {app.leave_type}</strong>
                        <span className="text-muted">
                          {formatLeaveRange(app)} · {app.total_working_days} days
                        </span>
                      </div>
                      <StatusBadge status={app.status} />
                    </summary>
                    <div className="dashboard-accordion-content">
                      <div className="dashboard-accordion-grid">
                        <p><strong>Start:</strong> {formatLeaveStart(app)}</p>
                        <p><strong>End:</strong> {formatLeaveEnd(app)}</p>
                        <p><strong>Working days:</strong> {app.total_working_days}</p>
                        <p><strong>Type:</strong> {app.leave_type}</p>
                        <p><strong>PSO:</strong> {app.approved_by_pso_name || '—'}</p>
                        <p><strong>Manager:</strong> {app.approved_by_manager_name || '—'}</p>
                        <p><strong>Director:</strong> {app.approved_by_director_name || '—'}</p>
                      </div>
                      <div className="dashboard-accordion-meta">
                        <Link to={`/application/${app.id}`}>Open full details</Link>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
            {historyTotal > 0 && (
              <div className="table-pagination">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1 || historyLoading}
                >
                  Previous
                </button>
                <span className="table-pagination-info">
                  Page {historyPage} of {historyTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage >= historyTotalPages || historyLoading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h3 className="dashboard-section-title">Leave balances ({balancesYear})</h3>
        {!balances.length ? (
          <p className="text-muted">No leave balance data yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Leave type</th>
                  <th>Allocated</th>
                  <th>Carry</th>
                  <th>Used</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((item) => (
                  <tr key={item.leave_type}>
                    <td>{item.leave_type}</td>
                    <td>{Number(item.allocated_days).toFixed(1)}</td>
                    <td>{Number(item.carry_forward_days).toFixed(1)}</td>
                    <td>{Number(item.used_days).toFixed(1)}</td>
                    <td>{Number(item.available_days).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
