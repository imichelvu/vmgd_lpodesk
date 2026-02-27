import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getWorkingDays, getWorkingDaysFromDateTime, isAdvancePayWarning } from '../utils/workingDays';
import SignatureField from './SignatureField';
import Button from './Button';

const LEAVE_TYPES = [
  'Annual vacation',
  'Home island',
  'Sick leave',
  'Maternity',
  'Family',
  'Compassionate',
  'Sporting / Cultural / Religious',
  'Leave without pay',
  'Other',
];

const HALF_DAY_DEFAULT = { start: '08:00', end: '12:00' };

export default function PSCForm49({ onSubmit, loading, initialValues, onFormChange }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [leave_type, setLeaveType] = useState(initialValues?.leave_type || '');
  const [destination, setDestination] = useState(initialValues?.destination || '');
  const [start_date, setStartDate] = useState(initialValues?.start_date || '');
  const [end_date, setEndDate] = useState(initialValues?.end_date || '');
  const [is_half_day, setIsHalfDay] = useState(!!initialValues?.is_half_day);
  const [half_day_time_start, setHalfDayTimeStart] = useState(initialValues?.half_day_time_start?.slice(0, 5) || HALF_DAY_DEFAULT.start);
  const [half_day_time_end, setHalfDayTimeEnd] = useState(initialValues?.half_day_time_end?.slice(0, 5) || HALF_DAY_DEFAULT.end);
  const [advance_pay, setAdvancePay] = useState(!!initialValues?.advance_pay);
  const [advance_pay_date, setAdvancePayDate] = useState(initialValues?.advance_pay_date || '');
  const [reason_or_remarks, setReasonOrRemarks] = useState(initialValues?.reason_or_remarks || '');
  const [signature_data, setSignatureData] = useState(initialValues?.signature_data || null);

  const useDateTimeRange = is_half_day;

  useEffect(() => {
    if (useDateTimeRange && start_date && (!end_date || end_date < start_date)) {
      setEndDate(start_date);
    }
  }, [useDateTimeRange, start_date, end_date]);

  const calculatedTotal = useMemo(() => {
    if (useDateTimeRange) {
      return getWorkingDaysFromDateTime(start_date, half_day_time_start, end_date, half_day_time_end);
    }
    return getWorkingDays(start_date, end_date, false);
  }, [useDateTimeRange, start_date, end_date, half_day_time_start, half_day_time_end]);

  const [totalWorkingDaysInput, setTotalWorkingDaysInput] = useState(() => {
    const v = initialValues?.total_working_days;
    if (v == null) return '';
    const n = Number(v);
    return Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : '';
  });
  const skipNextTotalSync = useRef(!!initialValues?.total_working_days);

  const roundedToOneDecimal = (n) => Math.round(Number(n) * 10) / 10;

  useEffect(() => {
    if (useDateTimeRange) {
      const value = roundedToOneDecimal(calculatedTotal);
      setTotalWorkingDaysInput(value > 0 ? value.toFixed(1) : '');
      return;
    }
    if (skipNextTotalSync.current) {
      skipNextTotalSync.current = false;
      return;
    }
    const value = roundedToOneDecimal(calculatedTotal);
    setTotalWorkingDaysInput(value !== 0 ? value.toFixed(1) : '');
  }, [calculatedTotal, useDateTimeRange]);

  const total_working_days = useMemo(() => {
    if (useDateTimeRange) return roundedToOneDecimal(calculatedTotal);
    const parsed = parseFloat(totalWorkingDaysInput);
    if (Number.isFinite(parsed) && parsed >= 0) return roundedToOneDecimal(parsed);
    return roundedToOneDecimal(calculatedTotal);
  }, [useDateTimeRange, totalWorkingDaysInput, calculatedTotal]);

  const advancePayWarn = useMemo(
    () => advance_pay && isAdvancePayWarning(today, start_date),
    [advance_pay, start_date, today]
  );

  const dateTimeRangeInvalid = useMemo(
    () =>
      useDateTimeRange &&
      start_date &&
      end_date &&
      half_day_time_start &&
      half_day_time_end &&
      calculatedTotal <= 0,
    [useDateTimeRange, start_date, end_date, half_day_time_start, half_day_time_end, calculatedTotal]
  );

  useEffect(() => {
    if (typeof onFormChange !== 'function') return;
    onFormChange({
      leave_type,
      destination,
      start_date,
      end_date,
      is_half_day,
      half_day_time_start,
      half_day_time_end,
      total_working_days,
      advance_pay,
      advance_pay_date,
      reason_or_remarks,
      signature_data,
    });
  }, [
    onFormChange,
    leave_type,
    destination,
    start_date,
    end_date,
    is_half_day,
    half_day_time_start,
    half_day_time_end,
    total_working_days,
    advance_pay,
    advance_pay_date,
    reason_or_remarks,
    signature_data,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      leave_type,
      destination: destination || null,
      start_date,
      end_date,
      is_half_day,
      half_day_time_start: is_half_day ? half_day_time_start : null,
      half_day_time_end: is_half_day ? half_day_time_end : null,
      total_working_days,
      advance_pay,
      advance_pay_date: advance_pay ? advance_pay_date || null : null,
      reason_or_remarks: reason_or_remarks || null,
      signature_data,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card form-card">
      <h3 className="section-title" style={{ marginTop: 0, marginBottom: 4 }}>PSC Form 4-9</h3>
      <p className="card-subtitle" style={{ marginBottom: 24 }}>Application for Leave</p>

      {/* Leave type & destination */}
      <section className="form-section">
        <h4 className="section-title section-title-sm">Leave details</h4>
        <div className="form-group">
          <label htmlFor="leave-type">Type of leave *</label>
          <select id="leave-type" value={leave_type} onChange={(e) => setLeaveType(e.target.value)} required>
            <option value="">Select...</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="destination">Destination</label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Home island, Port Vila"
          />
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={is_half_day}
              onChange={(e) => setIsHalfDay(e.target.checked)}
            />
            Date &amp; time range
          </label>
          <span className="form-hint" style={{ marginTop: 2 }}>
            Enter start and end date &amp; time; total working days are calculated automatically (1 decimal).
          </span>
        </div>
      </section>

      {/* Dates */}
      <section className="form-section">
        <h4 className="section-title section-title-sm">Dates</h4>
        {useDateTimeRange ? (
          <>
            <div className="form-group">
              <label htmlFor="start-date-dt">Start date *</label>
              <input
                id="start-date-dt"
                type="date"
                value={start_date}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="start-time-dt">Start time *</label>
              <input
                id="start-time-dt"
                type="time"
                value={half_day_time_start}
                onChange={(e) => setHalfDayTimeStart(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-date-dt">End date *</label>
              <input
                id="end-date-dt"
                type="date"
                value={end_date}
                onChange={(e) => setEndDate(e.target.value)}
                min={start_date}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-time-dt">End time *</label>
              <input
                id="end-time-dt"
                type="time"
                value={half_day_time_end}
                onChange={(e) => setHalfDayTimeEnd(e.target.value)}
                required
              />
            </div>
            {dateTimeRangeInvalid && (
              <div className="alert alert-warning">
                End date &amp; time must be after start. Please adjust the range.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="start-date">First date of leave *</label>
              <input
                id="start-date"
                type="date"
                value={start_date}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-date">Last date of leave *</label>
              <input
                id="end-date"
                type="date"
                value={end_date}
                onChange={(e) => setEndDate(e.target.value)}
                min={start_date}
                required
              />
            </div>
          </>
        )}
        <div className="form-group form-group-inline">
          <label htmlFor="total-days">Total working days</label>
          <input
            id="total-days"
            type="number"
            min="0"
            step="0.1"
            value={totalWorkingDaysInput}
            onChange={(e) => setTotalWorkingDaysInput(e.target.value)}
            placeholder={calculatedTotal ? roundedToOneDecimal(calculatedTotal).toFixed(1) : '0.0'}
            title="e.g. 0.5, 1.5, 2.5"
            readOnly={useDateTimeRange}
            aria-readonly={useDateTimeRange}
          />
          {useDateTimeRange ? (
            <span className="form-hint">Calculated from date &amp; time range (1 decimal)</span>
          ) : (
            <span className="form-hint">e.g. 0.5, 1.5, 2.5</span>
          )}
        </div>
      </section>

      {/* Advance pay */}
      <section className="form-section">
        <h4 className="section-title section-title-sm">Advance pay</h4>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={advance_pay}
              onChange={(e) => setAdvancePay(e.target.checked)}
            />
            Advance leave salary required
          </label>
        </div>
        {advance_pay && (
          <>
            <div className="form-group">
              <label htmlFor="advance-pay-date">Date required</label>
              <input
                id="advance-pay-date"
                type="date"
                value={advance_pay_date}
                onChange={(e) => setAdvancePayDate(e.target.value)}
              />
            </div>
            {advancePayWarn && (
              <div className="alert alert-warning">
                Advance pay is requested less than 21 days before the start of leave. Please confirm this is correct.
              </div>
            )}
          </>
        )}
      </section>

      {/* Remarks */}
      <section className="form-section">
        <h4 className="section-title section-title-sm">Reason / Remarks</h4>
        <div className="form-group">
          <label htmlFor="remarks">Optional notes</label>
          <textarea
            id="remarks"
            value={reason_or_remarks}
            onChange={(e) => setReasonOrRemarks(e.target.value)}
            rows={3}
            placeholder="Add any additional details..."
            style={{ resize: 'vertical', minHeight: 88 }}
          />
        </div>
      </section>

      {/* Signature */}
      <section className="form-section">
        <SignatureField
          label="Applicant signature"
          required
          width={320}
          height={120}
          value={typeof signature_data === 'string' ? signature_data : null}
          onChange={setSignatureData}
        />
      </section>

      <div className="form-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={!signature_data || dateTimeRangeInvalid}
          loading={loading}
          loadingText="Submitting..."
        >
          Submit application
        </Button>
      </div>
    </form>
  );
}
