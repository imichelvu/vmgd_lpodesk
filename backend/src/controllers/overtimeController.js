/**
 * Author: Igor Michel
 * Purpose: CRUD and summary APIs for staff overtime entries.
 * Last updated: 2026-02-09
 */
import pool from '../db/pool.js';

const PURPOSE_OVERTIME_PAYMENT = 'Overtime Payment';
const PURPOSE_TOIL = 'Time Off In Lieu';
const ALLOWED_PURPOSES = new Set([PURPOSE_OVERTIME_PAYMENT, PURPOSE_TOIL]);

// Nature-of-work categories for VMGD operations
export const OVERTIME_TYPES = [
  'Weekend / Field Work',   // worked on weekends during field trips
  'Emergency Callout',      // called in for server, workstation, or power issues
  'Standby Duty',           // standby during TL/TC or operational alert
  'Overseas Mission',       // international travel, training, conferences, or meetings
  'General Overtime',       // all other extra work
];
const ALLOWED_OVERTIME_TYPES = new Set(OVERTIME_TYPES);
const DEFAULT_OVERTIME_TYPE = 'General Overtime';

const HOURS_PER_WORKDAY = 8;
let overtimeHasDateTimeColumns = null;

function getPagination(query = {}) {
  const pageRaw = Number.parseInt(query.page, 10);
  const pageSizeRaw = Number.parseInt(query.pageSize, 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSizeUncapped = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : 20;
  const pageSize = Math.min(pageSizeUncapped, 100);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function validateWorkDate(value) {
  if (!value || !String(value).trim()) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return String(value).slice(0, 10);
}

function validateHours(value) {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 0 || num > MAX_ENTRY_HOURS) return null;
  return Math.round(num * 100) / 100;
}

function validateDateTime(value) {
  if (!value || !String(value).trim()) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// PSSRM allows multi-day entries (e.g. Overseas Mission). Cap at 31 days to catch typos.
const MAX_ENTRY_HOURS = 31 * 24; // 744 hours

function getHoursFromDateTimeRange(startDate, endDate) {
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return null;
  const hours = diffMs / (1000 * 60 * 60);
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_ENTRY_HOURS) return null;
  return Math.round(hours * 100) / 100;
}

function validateBreakHours(value) {
  if (value === undefined || value === null || value === '') return 0;
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num) || num < 0 || num >= 24) return null; // null = invalid
  return Math.round(num * 100) / 100;
}

async function hasOvertimeDateTimeColumns() {
  if (typeof overtimeHasDateTimeColumns === 'boolean') return overtimeHasDateTimeColumns;
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'overtime_entries'
       AND column_name IN ('start_datetime', 'end_datetime')`
  );
  const names = new Set((rows || []).map((r) => r.column_name));
  overtimeHasDateTimeColumns = names.has('start_datetime') && names.has('end_datetime');
  return overtimeHasDateTimeColumns;
}

export async function createOvertimeEntry(req, res) {
  const userId = req.user.id;
  const { start_datetime, end_datetime, overtime_type, purpose, remarks, break_hours: rawBreak, location } = req.body || {};
  const startDateTime = validateDateTime(start_datetime);
  const endDateTime = validateDateTime(end_datetime);
  const rawPurpose = typeof purpose === 'string' ? purpose.trim() : '';
  const purposeValue = ALLOWED_PURPOSES.has(rawPurpose) ? rawPurpose : PURPOSE_OVERTIME_PAYMENT;
  const rawType = typeof overtime_type === 'string' ? overtime_type.trim() : '';
  const overtimeTypeValue = ALLOWED_OVERTIME_TYPES.has(rawType) ? rawType : DEFAULT_OVERTIME_TYPE;
  const remarksValue = remarks && String(remarks).trim() ? String(remarks).trim() : null;
  const locationValue = location && String(location).trim() ? String(location).trim() : null;

  if (!startDateTime || !endDateTime) {
    return res.status(400).json({ error: 'Valid start_datetime and end_datetime are required.' });
  }
  const elapsedHours = getHoursFromDateTimeRange(startDateTime, endDateTime);
  if (elapsedHours == null) {
    return res.status(400).json({ error: 'end_datetime must be after start_datetime (max 31 days per entry).' });
  }
  const breakHoursValue = validateBreakHours(rawBreak);
  if (breakHoursValue === null) {
    return res.status(400).json({ error: 'break_hours must be a number between 0 and 24.' });
  }
  const netHours = Math.round(Math.max(0, elapsedHours - breakHoursValue) * 100) / 100;
  // PSSRM s.4.1(e): minimum 1 hour above standard working hours per day to qualify for overtime/TOIL
  if (netHours < 1) {
    return res.status(400).json({
      error: 'Net worked hours must be at least 1 hour to qualify for overtime or TOIL under PSSRM s.4.1(e).',
    });
  }

  const workDate = startDateTime.toISOString().slice(0, 10);
  const supportsDateTime = await hasOvertimeDateTimeColumns();
  const { rows } = supportsDateTime
    ? await pool.query(
      `INSERT INTO overtime_entries (user_id, start_datetime, end_datetime, work_date, hours, break_hours, overtime_type, purpose, location, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, startDateTime.toISOString(), endDateTime.toISOString(), workDate, netHours, breakHoursValue, overtimeTypeValue, purposeValue, locationValue, remarksValue]
    )
    : await pool.query(
      `INSERT INTO overtime_entries (user_id, work_date, hours, break_hours, overtime_type, purpose, location, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, workDate, netHours, breakHoursValue, overtimeTypeValue, purposeValue, locationValue, remarksValue]
    );
  res.status(201).json(rows[0]);
}

export async function listMyOvertimeEntries(req, res) {
  const userId = req.user.id;
  const { page, pageSize, offset } = getPagination(req.query);
  const fromDate = validateWorkDate(req.query.from_date);
  const toDate = validateWorkDate(req.query.to_date);
  const purpose = typeof req.query.purpose === 'string' ? req.query.purpose.trim() : '';
  const overtimeType = typeof req.query.overtime_type === 'string' ? req.query.overtime_type.trim() : '';
  const supportsDateTime = await hasOvertimeDateTimeColumns();

  const conditions = ['user_id = $1'];
  const params = [userId];
  let i = 2;

  if (fromDate) {
    conditions.push(`${supportsDateTime ? 'COALESCE(start_datetime::date, work_date)' : 'work_date'} >= $${i++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`${supportsDateTime ? 'COALESCE(start_datetime::date, work_date)' : 'work_date'} <= $${i++}`);
    params.push(toDate);
  }
  if (ALLOWED_PURPOSES.has(purpose)) {
    conditions.push(`purpose = $${i++}`);
    params.push(purpose);
  }
  if (ALLOWED_OVERTIME_TYPES.has(overtimeType)) {
    conditions.push(`overtime_type = $${i++}`);
    params.push(overtimeType);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM overtime_entries ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.total || 0;

  const { rows } = await pool.query(
    `SELECT *
     FROM overtime_entries
     ${whereClause}
     ORDER BY ${supportsDateTime ? 'COALESCE(start_datetime, work_date::timestamp)' : 'work_date::timestamp'} DESC, id DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, pageSize, offset]
  );

  res.json({
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function getMyOvertimeSummary(req, res) {
  const userId = req.user.id;
  const fromDate = validateWorkDate(req.query.from_date);
  const toDate = validateWorkDate(req.query.to_date);
  const supportsDateTime = await hasOvertimeDateTimeColumns();

  const conditions = ['user_id = $1'];
  const params = [userId];
  let i = 2;

  if (fromDate) {
    conditions.push(`${supportsDateTime ? 'COALESCE(start_datetime::date, work_date)' : 'work_date'} >= $${i++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`${supportsDateTime ? 'COALESCE(start_datetime::date, work_date)' : 'work_date'} <= $${i++}`);
    params.push(toDate);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(hours), 0)::numeric(10,2) AS total_hours
     FROM overtime_entries
     ${whereClause}`,
    params
  );

  const totalHours = Number(rows[0]?.total_hours || 0);
  // PSSRM s.4.1(b)/(c): all eligible overtime accrues TOIL at 1¼ hours per hour worked
  const TOIL_MULTIPLIER = 1.25;
  const toilAdjustedHours = Math.round(totalHours * TOIL_MULTIPLIER * 100) / 100;

  res.json({
    total_hours: totalHours,
    toil_adjusted_hours: toilAdjustedHours,
    toil_days_equivalent: Number((toilAdjustedHours / HOURS_PER_WORKDAY).toFixed(2)),
    toil_multiplier: TOIL_MULTIPLIER,
    hours_per_workday: HOURS_PER_WORKDAY,
  });
}

export async function updateMyOvertimeEntry(req, res) {
  const userId = req.user.id;
  const entryId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'Invalid overtime entry id.' });
  }

  const updates = [];
  const params = [];
  let i = 1;

  const supportsDateTime = await hasOvertimeDateTimeColumns();
  const hasStart = req.body.start_datetime !== undefined;
  const hasEnd = req.body.end_datetime !== undefined;
  if (hasStart || hasEnd) {
    if (!supportsDateTime) {
      return res.status(400).json({ error: 'Datetime range update is unavailable until overtime migration is applied.' });
    }
    if (!(hasStart && hasEnd)) {
      return res.status(400).json({ error: 'Both start_datetime and end_datetime must be provided together.' });
    }
    const startDateTime = validateDateTime(req.body.start_datetime);
    const endDateTime = validateDateTime(req.body.end_datetime);
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Valid start_datetime and end_datetime are required.' });
    }
    const elapsedHours = getHoursFromDateTimeRange(startDateTime, endDateTime);
    if (elapsedHours == null) {
      return res.status(400).json({ error: 'end_datetime must be after start_datetime, with total hours <= 24.' });
    }
    const breakHoursValue = validateBreakHours(req.body.break_hours);
    if (breakHoursValue === null) {
      return res.status(400).json({ error: 'break_hours must be a number between 0 and 24.' });
    }
    const netHours = Math.round(Math.max(0, elapsedHours - breakHoursValue) * 100) / 100;
    if (netHours < 1) {
      return res.status(400).json({
        error: 'Net worked hours must be at least 1 hour to qualify for overtime or TOIL under PSSRM s.4.1(e).',
      });
    }
    updates.push(`start_datetime = $${i++}`);
    params.push(startDateTime.toISOString());
    updates.push(`end_datetime = $${i++}`);
    params.push(endDateTime.toISOString());
    updates.push(`work_date = $${i++}`);
    params.push(startDateTime.toISOString().slice(0, 10));
    updates.push(`break_hours = $${i++}`);
    params.push(breakHoursValue);
    updates.push(`hours = $${i++}`);
    params.push(netHours);
  } else if (req.body.hours !== undefined) {
    const hoursValue = validateHours(req.body.hours);
    if (hoursValue == null) return res.status(400).json({ error: 'Valid hours are required (0 < hours <= 24).' });
    updates.push(`hours = $${i++}`);
    params.push(hoursValue);
  }
  if (req.body.overtime_type !== undefined) {
    const rawType = typeof req.body.overtime_type === 'string' ? req.body.overtime_type.trim() : '';
    if (!ALLOWED_OVERTIME_TYPES.has(rawType)) {
      return res.status(400).json({ error: `overtime_type must be one of: ${OVERTIME_TYPES.join(', ')}.` });
    }
    updates.push(`overtime_type = $${i++}`);
    params.push(rawType);
  }
  if (req.body.purpose !== undefined) {
    const purpose = typeof req.body.purpose === 'string' ? req.body.purpose.trim() : '';
    if (!ALLOWED_PURPOSES.has(purpose)) {
      return res.status(400).json({ error: `purpose must be "${PURPOSE_OVERTIME_PAYMENT}" or "${PURPOSE_TOIL}".` });
    }
    updates.push(`purpose = $${i++}`);
    params.push(purpose);
  }
  if (req.body.location !== undefined) {
    const locationValue = req.body.location && String(req.body.location).trim() ? String(req.body.location).trim() : null;
    updates.push(`location = $${i++}`);
    params.push(locationValue);
  }
  if (req.body.remarks !== undefined) {
    const remarksValue = req.body.remarks && String(req.body.remarks).trim() ? String(req.body.remarks).trim() : null;
    updates.push(`remarks = $${i++}`);
    params.push(remarksValue);
  }

  if (!updates.length) return res.status(400).json({ error: 'No fields to update.' });
  params.push(userId, entryId);

  const { rowCount, rows } = await pool.query(
    `UPDATE overtime_entries
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $${i++} AND id = $${i++}
     RETURNING *`,
    params
  );
  if (!rowCount) return res.status(404).json({ error: 'Overtime entry not found.' });
  return res.json(rows[0]);
}

export async function deleteMyOvertimeEntry(req, res) {
  const userId = req.user.id;
  const entryId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return res.status(400).json({ error: 'Invalid overtime entry id.' });
  }

  const { rowCount } = await pool.query(
    'DELETE FROM overtime_entries WHERE user_id = $1 AND id = $2',
    [userId, entryId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Overtime entry not found.' });
  return res.json({ message: 'Overtime entry deleted.' });
}
