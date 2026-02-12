/**
 * Calculate working days between start and end (exclude Sat/Sun).
 * If isHalfDay, count as 0.5 for a single day.
 */
export function getWorkingDays(startDate, endDate, isHalfDay = false) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;
  let days = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) days += 1;
    d.setDate(d.getDate() + 1);
  }
  return isHalfDay ? 0.5 : days;
}

/** PSC: 1 full working day = 8 hours, between 08:00 and 17:00 (lunch excluded). */
const HOURS_PER_WORKING_DAY = 8;
const PSC_WORK_START_HOUR = 8;  // 08:00
const PSC_WORK_END_HOUR = 17;   // 17:00 (5pm)

/**
 * Calculate WORKING days from a date+time range using PSC rules.
 * - Only weekdays (Mon–Fri) count; weekends are excluded.
 * - One full day = 8 hours of work between 08:00 and 17:00 (lunch excluded).
 * - For each weekday, only hours within 08:00–17:00 are counted; (hours in window) ÷ 8 = days, max 1 per day.
 */
export function getWorkingDaysFromDateTime(startDate, startTime, endDate, endTime) {
  if (!startDate || !startTime || !endDate || !endTime) return 0;
  const startMs = parseDateTimeLocal(startDate, startTime);
  const endMs = parseDateTimeLocal(endDate, endTime);
  if (startMs == null || endMs == null || endMs <= startMs) return 0;

  const msPerHour = 1000 * 60 * 60;
  const cursor = new Date(startMs);
  const endD = new Date(endMs);
  cursor.setHours(0, 0, 0, 0);
  endD.setHours(0, 0, 0, 0);

  let totalDays = 0;
  const c = new Date(cursor.getTime());
  while (c <= endD) {
    if (c.getDay() === 0 || c.getDay() === 6) {
      c.setDate(c.getDate() + 1);
      continue;
    }
    const dayWorkStartMs = c.getTime() + PSC_WORK_START_HOUR * msPerHour;
    const dayWorkEndMs = c.getTime() + PSC_WORK_END_HOUR * msPerHour;
    const overlapStart = Math.max(startMs, dayWorkStartMs);
    const overlapEnd = Math.min(endMs, dayWorkEndMs);
    const hoursInWindow = Math.max(0, (overlapEnd - overlapStart) / msPerHour);
    const cappedHours = Math.min(hoursInWindow, HOURS_PER_WORKING_DAY);
    totalDays += cappedHours / HOURS_PER_WORKING_DAY;
    c.setDate(c.getDate() + 1);
  }

  const rounded = Math.round(totalDays * 10) / 10;
  return Number.isFinite(rounded) && rounded >= 0 ? rounded : 0;
}

/** Parse YYYY-MM-DD + HH:mm (or HH:mm:ss) as local date+time; return timestamp or null. */
function parseDateTimeLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const datePart = dateStr.trim().split('-').map(Number);
  const timePart = timeStr.trim().split(':').map(Number);
  if (datePart.length < 3 || timePart.length < 2) return null;
  const [y, mo, d] = datePart;
  const [h, m] = timePart;
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const date = new Date(y, mo - 1, d, Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

/**
 * Check if today is less than 21 days before startDate (for advance pay warning).
 */
export function isAdvancePayWarning(today, startDate) {
  if (!startDate) return false;
  const start = new Date(startDate);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((start - t) / (1000 * 60 * 60 * 24));
  return diffDays < 21;
}
