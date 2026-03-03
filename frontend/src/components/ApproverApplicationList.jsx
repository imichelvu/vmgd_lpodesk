/**
 * Author: Igor Michel
 * Purpose: Reusable component for displaying paginated leave application lists for approvers, including division filter.
 * Last updated: 2026-02-09
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth, ROLE_IDS } from '../context/AuthContext';
import Button from './Button';
import SignatureField from './SignatureField';
import StatusBadge from './StatusBadge';
import DivisionFilter from './admin/DivisionFilter';
import StatsRow from './StatsRow'; // Import StatsRow
import { useApproverStats } from '../hooks/useApproverStats'; // Import useApproverStats
import { formatLeaveEnd, formatLeaveStart } from '../utils/leaveDateDisplay';

const URGENT_DAYS_THRESHOLD = 3;

export default function ApproverApplicationList({ endpoint, pageTitle, emptyMessage, onReloadParent }) {
  const { hasRole } = useAuth();
  const { request } = useApi();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [divisionFilter, setDivisionFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState(''); // New state for from date filter
  const [toDateFilter, setToDateFilter] = useState(''); // New state for to date filter
  const [pageSize, setPageSize] = useState(10);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDraft, setActionDraft] = useState({
    appId: null,
    action: null,
    comment: '',
    signature: null,
    error: '',
  });
  const [recentActionsCount, setRecentActionsCount] = useState(0);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const isPendingView = !endpoint.includes('history');
  const stats = useApproverStats(isPendingView ? applications : []);

  const canApproveApplication = useCallback((app) => {
    if (endpoint.includes('supervisor')) {
      return (app.status === 'Pending_PSO' && (hasRole(ROLE_IDS.PSO) || hasRole(ROLE_IDS.Manager)))
        || (app.status === 'Pending_Manager' && hasRole(ROLE_IDS.Manager));
    } else if (endpoint.includes('director')) {
      return app.status === 'Pending_Director' && hasRole(ROLE_IDS.Director);
    }
    return false;
  }, [endpoint, hasRole]);

  const loadApplications = useCallback(async (page = currentPage, currentDivisionId = divisionFilter, currentLeaveType = leaveTypeFilter, currentFromDate = fromDateFilter, currentToDate = toDateFilter, currentPageSize = pageSize) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(currentPageSize),
      });
      if (currentDivisionId && Number(currentDivisionId) > 0) {
        params.set('division_id', String(currentDivisionId));
      }
      if (currentLeaveType) {
        params.set('leave_type', currentLeaveType);
      }
      if (currentFromDate) {
        params.set('from_date', currentFromDate);
      }
      if (currentToDate) {
        params.set('to_date', currentToDate);
      }
      const data = await request(`${endpoint}?${params.toString()}`);
      setApplications(Array.isArray(data?.items) ? data.items : []);
      setCurrentPage(Number(data?.page) || page);
      setTotalPages(Number(data?.totalPages) || 1);
      setTotalItems(Number(data?.total) || 0);
    } catch (e) {
      setError(e?.message || 'Failed to load applications.');
      setApplications([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
      if (onReloadParent) onReloadParent();

      if (!isPendingView) {
        try {
          const recentActionsData = await request('/leave/recent-actions-count?days=7');
          setRecentActionsCount(recentActionsData?.count || 0);
        } catch (e) {
          console.error('Failed to load recent actions count:', e);
          setRecentActionsCount(0);
        }
      }
    }
  }, [currentPage, divisionFilter, leaveTypeFilter, fromDateFilter, toDateFilter, pageSize, endpoint, request, onReloadParent, isPendingView]); // Added date filters to dependencies

  // Fetch leave types on component mount
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const data = await request('/leave/types');
        setLeaveTypes(data);
      } catch (e) {
        console.error('Failed to load leave types:', e);
        setLeaveTypes([]);
      }
    };
    fetchLeaveTypes();
  }, [request]);

  useEffect(() => {
    loadApplications(1, divisionFilter, leaveTypeFilter, fromDateFilter, toDateFilter, pageSize); // Load applications when component mounts, filter, or page size changes
  }, [divisionFilter, leaveTypeFilter, fromDateFilter, toDateFilter, pageSize, loadApplications]); // Added date filters to dependencies

  const resetDraft = useCallback(() => {
    setActionDraft({
      appId: null,
      action: null,
      comment: '',
      signature: null,
      error: '',
    });
  }, []);

  const openActionDraft = useCallback((appId, action) => {
    setActionDraft({
      appId,
      action,
      comment: '',
      signature: null,
      error: '',
    });
  }, []);

  const submitDecision = useCallback(async () => {
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
      loadApplications(currentPage, divisionFilter, leaveTypeFilter, fromDateFilter, toDateFilter, pageSize); // Pass date filters
    } catch (e) {
      setActionDraft((prev) => ({ ...prev, error: e?.message || 'Could not complete approval action.' }));
    } finally {
      setActionLoading(false);
    }
  }, [actionDraft, request, resetDraft, loadApplications, currentPage, divisionFilter, leaveTypeFilter, fromDateFilter, toDateFilter, pageSize]); // Added date filters to dependencies

  const allDivisions = useMemo(() => {
    // This should ideally come from a common context or a shared API call if used widely
    return [
      { id: 1, name: 'ICT_Engineering' },
      { id: 2, name: 'Climate' },
      { id: 3, name: 'Forecast' },
      { id: 4, name: 'Geo-Hazards' },
      { id: 5, name: 'Admin' },
      { id: 6, name: 'Observations' },
    ];
  }, []);

  const handleDivisionChange = useCallback((newDivisionId) => {
    setDivisionFilter(newDivisionId);
    setCurrentPage(1);
  }, []);

  const handleLeaveTypeChange = useCallback((e) => {
    setLeaveTypeFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleFromDateChange = useCallback((e) => { // New handler
    setFromDateFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleToDateChange = useCallback((e) => { // New handler
    setToDateFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  }, []);

  const getUrgencyClass = useCallback((app) => {
    if (!isPendingView || !app.start_date) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    const startDate = new Date(app.start_date);
    startDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return ' dashboard-accordion-item--past-start';
    } else if (diffDays <= URGENT_DAYS_THRESHOLD) {
      return ' dashboard-accordion-item--starting-soon';
    }
    return '';
  }, [isPendingView]);

  return (
    <div className="approver-application-list">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <DivisionFilter
          value={divisionFilter}
          divisions={allDivisions}
          onChange={handleDivisionChange}
          placeholder="Filter by division"
        />

        <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 150 }}>
          <label htmlFor="leave-type-select">Leave Type</label>
          <select
            id="leave-type-select"
            value={leaveTypeFilter}
            onChange={handleLeaveTypeChange}
            style={{ width: '100%' }}
            disabled={loading}
          >
            <option value="">All Types</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {!isPendingView && (
          <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 150 }}>
            <label htmlFor="from-date-filter">From Date</label>
            <input
              type="date"
              id="from-date-filter"
              value={fromDateFilter}
              onChange={handleFromDateChange}
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>
        )}

        {!isPendingView && (
          <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 150 }}>
            <label htmlFor="to-date-filter">To Date</label>
            <input
              type="date"
              id="to-date-filter"
              value={toDateFilter}
              onChange={handleToDateChange}
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 150 }}>
          <label htmlFor="page-size-select">Items per page</label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={handlePageSizeChange}
            style={{ width: '100%' }}
            disabled={loading}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {!isPendingView && recentActionsCount > 0 && (
        <p className="text-muted">{recentActionsCount} actions in the last 7 days</p>
      )}

      {isPendingView && stats.length > 0 && <StatsRow items={stats} />}

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && <p className="text-muted">Loading applications...</p>}

      {!loading && applications.length === 0 ? (
        <div className="card">
          <p className="text-muted">{emptyMessage}</p>
        </div>
      ) : (
        !loading && (
          <>
            <div className="dashboard-accordion-list">
              {applications.map((app) => {
                const isDraftForItem = actionDraft.appId === app.id;
                const canApprove = canApproveApplication(app);
                return (
                  <details key={app.id} className={`dashboard-accordion-item${getUrgencyClass(app)}`}>
                    <summary className="dashboard-accordion-summary">
                      <div className="dashboard-accordion-headline">
                        <strong>#{app.id} · {app.applicant_name}{app.acting_for_name ? ` (Acting for ${app.acting_for_name})` : ''}</strong>
                        <span className="text-muted">
                          {app.division_name || '—'} · {app.leave_type} · {formatLeaveStart(app)}
                        </span>
                      </div>
                      <StatusBadge status={app.status} />
                    </summary>

                    <div className="dashboard-accordion-content">
                      <div className="dashboard-accordion-grid">
                        <p><strong>Division:</strong> {app.division_name || '—'}</p>
                        <p><strong>Type:</strong> {app.leave_type}</p>
                        <p><strong>Start:</strong> {formatLeaveStart(app)}</p>
                        <p><strong>End:</strong> {formatLeaveEnd(app)}</p>
                        <p><strong>Working days:</strong> {app.total_working_days}</p>
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

                      <div className="dashboard-accordion-meta">
                        <Link to={`/application/${app.id}`}>Open full details</Link>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

            {totalItems > 0 && (
              <div className="table-pagination">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1 || loading}
                >
                  Previous
                </button>
                <span className="table-pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}