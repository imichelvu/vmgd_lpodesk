import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import StatsRow from '../components/StatsRow';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';

// Context-sensitive location placeholder per overtime type
const LOCATION_PLACEHOLDER = {
  'Weekend / Field Work':  'e.g. Tanna AWS station, Efate weather post',
  'Emergency Callout':     'e.g. Server room, VMGD HQ, Port Vila',
  'Standby Duty':          'e.g. VMGD HQ or home (on-call)',
  'Overseas Mission':      'e.g. Melbourne, Australia — WMO training',
  'General Overtime':      'e.g. VMGD office, Port Vila',
};

// Nature-of-work categories — mirrors backend OVERTIME_TYPES
const OVERTIME_TYPES = [
  { value: 'Weekend / Field Work',  label: 'Weekend / Field Work',  hint: 'Worked on weekends or during field trips' },
  { value: 'Emergency Callout',     label: 'Emergency Callout',     hint: 'Called in for server, workstation, or power issues' },
  { value: 'Standby Duty',          label: 'Standby Duty',          hint: 'Standby for TL/TC or other operational alerts' },
  { value: 'Overseas Mission',      label: 'Overseas Mission',      hint: 'International travel, training, conferences, or meetings outside the country' },
  { value: 'General Overtime',      label: 'General Overtime',      hint: 'Other extra work outside normal hours' },
];

const INITIAL_FORM = {
  start_date: '',
  start_time: '',
  end_date: '',
  end_time: '',
  overtime_type: 'General Overtime',
  break_hours: '',
  location: '',
  remarks: '',
};

// Badge styles per overtime type
const TYPE_BADGE_STYLES = {
  'Weekend / Field Work': { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' },
  'Emergency Callout':    { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  'Standby Duty':         { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
  'Overseas Mission':     { background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd' },
  'General Overtime':     { background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
};

function OvertimeTypeBadge({ type }) {
  const style = TYPE_BADGE_STYLES[type] || TYPE_BADGE_STYLES['General Overtime'];
  return (
    <span style={{
      ...style,
      display: 'inline-block',
      borderRadius: 999,
      padding: '2px 9px',
      fontSize: '0.78rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {type || 'General Overtime'}
    </span>
  );
}

function getComputedHours(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
}

// PSSRM s.4.1 Unsocial Hours: 08:00–17:00 Saturdays, Sundays, and Official Public Holidays.
// Weekday evenings are NOT unsocial hours under Vanuatu PSSRM.
function detectUnsocialHours(start, end) {
  if (!start || !end) return false;
  const s = new Date(start);
  const e = new Date(end);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()) || e <= s) return false;
  // Walk through each day in the range and check if any portion is on a weekend
  const cursor = new Date(s);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= e) {
    const dow = cursor.getDay(); // 0 = Sunday, 6 = Saturday
    if (dow === 0 || dow === 6) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

export default function Overtime() {
  const { request } = useApi();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const startDateTimeInputRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [summary, setSummary] = useState({
    total_hours: 0,
    toil_adjusted_hours: 0,
    toil_days_equivalent: 0,
  });

  const [purposeFilter, setPurposeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  // Combine separate date + time fields into ISO datetime strings for calculation
  const startDatetime = form.start_date && form.start_time ? `${form.start_date}T${form.start_time}` : '';
  const endDatetime   = form.end_date   && form.end_time   ? `${form.end_date}T${form.end_time}`     : '';

  const elapsedHours = useMemo(
    () => getComputedHours(startDatetime, endDatetime),
    [startDatetime, endDatetime]
  );
  const breakHoursNum = useMemo(() => {
    const n = parseFloat(form.break_hours);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }, [form.break_hours]);
  const netHours = useMemo(
    () => Math.max(0, Math.round((elapsedHours - breakHoursNum) * 100) / 100),
    [elapsedHours, breakHoursNum]
  );
  // PSSRM s.4.1(e): min 1 hour net to qualify
  const belowMinimum = netHours > 0 && netHours < 1;
  // PSSRM s.4.1 Unsocial Hours: entry spans a Saturday or Sunday
  const isUnsocialHours = useMemo(
    () => detectUnsocialHours(startDatetime, endDatetime),
    [startDatetime, endDatetime]
  );

  const loadEntries = useCallback(async (
    targetPage = page,
    targetPurpose = purposeFilter,
    targetFrom = fromDateFilter,
    targetTo = toDateFilter,
    targetType = typeFilter,
  ) => {
    setLoadingEntries(true);
    setEntriesError('');
    try {
      const query = new URLSearchParams({ page: String(targetPage), pageSize: '12' });
      if (targetPurpose) query.set('purpose', targetPurpose);
      if (targetType) query.set('overtime_type', targetType);
      if (targetFrom) query.set('from_date', targetFrom);
      if (targetTo) query.set('to_date', targetTo);
      const data = await request(`/overtime/mine?${query.toString()}`);
      setEntries(Array.isArray(data?.items) ? data.items : []);
      setPage(Number(data?.page) || targetPage);
      setTotalPages(Number(data?.totalPages) || 1);
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      setEntriesError(err?.message || 'Could not load overtime entries.');
      setEntries([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoadingEntries(false);
    }
  }, [fromDateFilter, page, purposeFilter, typeFilter, request, toDateFilter]);

  const loadSummary = useCallback(async (targetFrom = fromDateFilter, targetTo = toDateFilter) => {
    try {
      const query = new URLSearchParams();
      if (targetFrom) query.set('from_date', targetFrom);
      if (targetTo) query.set('to_date', targetTo);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const data = await request(`/overtime/mine/summary${suffix}`);
      setSummary({
        total_hours: Number(data?.total_hours || 0),
        toil_adjusted_hours: Number(data?.toil_adjusted_hours || 0),
        toil_days_equivalent: Number(data?.toil_days_equivalent || 0),
      });
    } catch {
      setSummary({
        total_hours: 0,
        toil_adjusted_hours: 0,
        toil_days_equivalent: 0,
      });
    }
  }, [fromDateFilter, request, toDateFilter]);

  useEffect(() => {
    loadEntries(1, purposeFilter, fromDateFilter, toDateFilter, typeFilter);
    loadSummary(fromDateFilter, toDateFilter);
  }, [purposeFilter, typeFilter, fromDateFilter, toDateFilter, loadEntries, loadSummary]);

  useEffect(() => {
    if (!entryModalOpen) return undefined;
    const focusTimer = setTimeout(() => {
      startDateTimeInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [entryModalOpen]);

  // PSSRM s.4.1(b)/(c): TOIL = net hours × 1.25
  const stats = useMemo(() => ([
    { label: 'Net extra hours', value: summary.total_hours.toFixed(1), tone: 'default', hint: 'After break deductions' },
    { label: 'TOIL entitlement (×1.25)', value: summary.toil_adjusted_hours.toFixed(1), tone: 'success', hint: 'PSSRM s.4.1(b)/(c)' },
    { label: 'TOIL day equivalent', value: summary.toil_days_equivalent.toFixed(2), tone: 'default', hint: 'Based on 8h workday' },
  ]), [summary]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitLoading(true);
    setSubmitError('');
    try {
      await request('/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          overtime_type: form.overtime_type,
          break_hours: breakHoursNum,
          location: form.location,
          remarks: form.remarks,
        }),
      });
      setForm(INITIAL_FORM);
      setEntryModalOpen(false);
      await loadEntries(1, purposeFilter, fromDateFilter, toDateFilter, typeFilter);
      await loadSummary(fromDateFilter, toDateFilter);
    } catch (err) {
      setSubmitError(err?.message || 'Could not record overtime.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await request(`/overtime/${id}`, { method: 'DELETE' });
      await loadEntries(page, purposeFilter, fromDateFilter, toDateFilter, typeFilter);
      await loadSummary(fromDateFilter, toDateFilter);
    } catch (err) {
      setEntriesError(err?.message || 'Could not delete overtime entry.');
    }
  };

  return (
    <>
      <PageHeader
        title="Overtime & TOIL"
        subtitle="Record extra hours with start and end date/time."
      />

      <StatsRow items={stats} />

      <div className="card">
        <div className="dashboard-section-title-row">
          <h3 className="dashboard-section-title">Record extra hours</h3>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setForm(INITIAL_FORM);
              setSubmitError('');
              setEntryModalOpen(true);
            }}
          >
            Add overtime entry
          </Button>
        </div>
        <p className="text-muted">
          Use the button above to record extra working hours.
        </p>
      </div>

      <Modal
        open={entryModalOpen}
        title="Record extra hours"
        titleId="overtime-entry-modal-title"
        maxWidth={560}
        onClose={() => {
          setEntryModalOpen(false);
          setSubmitError('');
        }}
      >
        {submitError ? <div className="alert alert-danger">{submitError}</div> : null}
        <form onSubmit={handleCreate}>
          {/* Start — date and time in separate inputs for clarity */}
          <div className="form-group">
            <label>Start date & time <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
              <input
                id="ot-start-date"
                type="date"
                ref={startDateTimeInputRef}
                value={form.start_date}
                onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                required
              />
              <input
                id="ot-start-time"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                required
                step="300"
              />
            </div>
          </div>

          {/* End — date and time in separate inputs for clarity */}
          <div className="form-group">
            <label>End date & time <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
              <input
                id="ot-end-date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                required
              />
              <input
                id="ot-end-time"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                required
                step="300"
              />
            </div>
          </div>
          {/* Hours breakdown — shown once start and end are filled */}
          {elapsedHours > 0 && (
            <div style={{
              background: 'var(--surface-raised)',
              border: `1px solid ${belowMinimum ? 'var(--warning, #f59e0b)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: '1rem',
              fontSize: '0.88rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="text-muted">Elapsed</span>
                <strong>{elapsedHours.toFixed(2)} h</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="text-muted">Break / deduction</span>
                <strong style={{ color: breakHoursNum > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  − {breakHoursNum.toFixed(2)} h
                </strong>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Net worked hours</span>
                <strong style={{ color: netHours > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1rem' }}>
                  {netHours.toFixed(2)} h
                </strong>
              </div>
              {/* PSSRM s.4.1(e) minimum threshold warning */}
              {belowMinimum && (
                <p style={{ margin: '8px 0 0', color: 'var(--warning, #b45309)', fontSize: '0.82rem', fontWeight: 500 }}>
                  ⚠ PSSRM requires at least 1 net hour to qualify for overtime or TOIL.
                </p>
              )}
              {/* PSSRM Unsocial Hours indicator */}
              {isUnsocialHours && (
                <p style={{ margin: '6px 0 0', color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 500 }}>
                  📅 Unsocial hours detected (Saturday/Sunday) — additional unsocial hours payment may apply. See PSSRM s.4.1 Unsocial Hours.
                </p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="ot-break">
              Break / deduction (hours)
              <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>optional</span>
            </label>
            <input
              id="ot-break"
              type="number"
              min="0"
              max="23"
              step="0.25"
              value={form.break_hours}
              onChange={(e) => setForm((prev) => ({ ...prev, break_hours: e.target.value }))}
              placeholder="e.g. 1 for 1 hour lunch break"
              style={{ maxWidth: 220 }}
            />
            <p className="form-hint" style={{ marginTop: 4 }}>
              Subtract lunch, dinner, or any non-working time from the elapsed window.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="ot-type">Type of overtime <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              id="ot-type"
              value={form.overtime_type}
              onChange={(e) => setForm((prev) => ({ ...prev, overtime_type: e.target.value }))}
              required
            >
              {OVERTIME_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="form-hint" style={{ marginTop: 4 }}>
              {OVERTIME_TYPES.find((t) => t.value === form.overtime_type)?.hint}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="ot-location">
              Location
              {['Weekend / Field Work', 'Emergency Callout', 'Overseas Mission'].includes(form.overtime_type) && (
                <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>
              )}
              {!['Weekend / Field Work', 'Emergency Callout', 'Overseas Mission'].includes(form.overtime_type) && (
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>optional</span>
              )}
            </label>
            <input
              id="ot-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder={LOCATION_PLACEHOLDER[form.overtime_type] || 'Where did you work?'}
              maxLength={255}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ot-remarks">Remarks <span className="text-muted" style={{ fontWeight: 400 }}>optional</span></label>
            <textarea
              id="ot-remarks"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="Supervisor direction, project name, incident reference..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary" loading={submitLoading} loadingText="Saving..." disabled={belowMinimum}>
              Save overtime entry
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEntryModalOpen(false);
                setSubmitError('');
              }}
              disabled={submitLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <div className="dashboard-section-title-row">
          <h3 className="dashboard-section-title">My overtime records</h3>
          <span className="text-muted">{total} record(s)</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem', minWidth: 180 }}>
            <label htmlFor="ot-filter-type">Type</label>
            <select
              id="ot-filter-type"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              disabled={loadingEntries}
            >
              <option value="">All types</option>
              {OVERTIME_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 160 }}>
            <label htmlFor="ot-filter-from">From date</label>
            <input
              id="ot-filter-from"
              type="date"
              value={fromDateFilter}
              onChange={(e) => { setFromDateFilter(e.target.value); setPage(1); }}
              disabled={loadingEntries}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 160 }}>
            <label htmlFor="ot-filter-to">To date</label>
            <input
              id="ot-filter-to"
              type="date"
              value={toDateFilter}
              onChange={(e) => { setToDateFilter(e.target.value); setPage(1); }}
              disabled={loadingEntries}
            />
          </div>
        </div>

        {entriesError ? <div className="alert alert-danger">{entriesError}</div> : null}
        {loadingEntries ? <p className="text-muted">Loading overtime entries...</p> : null}

        {!loadingEntries && entries.length === 0 ? (
          <p className="text-muted">No overtime records found for your current filter.</p>
        ) : (
          !loadingEntries && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Start</th>
                      <th>End</th>
                      <th title="Net hours after deducting breaks">Net hrs</th>
                      <th title="Break / non-working deduction">Break</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Remarks</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {entry.start_datetime
                            ? new Date(entry.start_datetime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                            : String(entry.work_date).slice(0, 10)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {entry.end_datetime
                            ? new Date(entry.end_datetime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                            : '—'}
                        </td>
                        <td><strong>{Number(entry.hours).toFixed(1)}</strong></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {Number(entry.break_hours) > 0 ? `−${Number(entry.break_hours).toFixed(1)}` : '—'}
                        </td>
                        <td>
                          <OvertimeTypeBadge type={entry.overtime_type} />
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {entry.location || '—'}
                        </td>
                        <td>{entry.remarks || '—'}</td>
                        <td>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleDelete(entry.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > 0 && (
                <div className="table-pagination">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const next = Math.max(1, page - 1);
                      setPage(next);
                      loadEntries(next, purposeFilter, fromDateFilter, toDateFilter, typeFilter);
                    }}
                    disabled={page <= 1 || loadingEntries}
                  >
                    Previous
                  </button>
                  <span className="table-pagination-info">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const next = Math.min(totalPages, page + 1);
                      setPage(next);
                      loadEntries(next, purposeFilter, fromDateFilter, toDateFilter, typeFilter);
                    }}
                    disabled={page >= totalPages || loadingEntries}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </>
  );
}
