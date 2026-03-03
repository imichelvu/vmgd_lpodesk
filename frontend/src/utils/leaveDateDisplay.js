/**
 * Author: Igor Michel
 * Purpose: Normalize leave date/time display for full-day and half-day records.
 * Last updated: 2026-02-09
 */
function extractDate(value) {
  if (!value) return '—';
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return text;
}

export function formatLeaveStart(app) {
  const date = extractDate(app?.start_date);
  if (app?.is_half_day && app?.half_day_time_start && app?.half_day_time_end) {
    return `${date} (${app.half_day_time_start} - ${app.half_day_time_end})`;
  }
  return date;
}

export function formatLeaveEnd(app) {
  return extractDate(app?.end_date);
}

export function formatLeaveRange(app) {
  return `${formatLeaveStart(app)} -> ${formatLeaveEnd(app)}`;
}
