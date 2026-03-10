/**
 * Author: Igor Michel
 * Purpose: Centralize leave balance policies, accrual, and validation logic.
 * Last updated: 2026-02-28
 */

export const toPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const currentYear = () => new Date().getFullYear();

const startOfTodayIso = () => new Date().toISOString().slice(0, 10);

function daysBetween(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function countWorkedMonthsInYear(entryDateStr, year) {
  if (!entryDateStr) return 0;
  const entryDate = new Date(entryDateStr);
  if (Number.isNaN(entryDate.getTime())) return 0;

  const today = new Date(startOfTodayIso());
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31`);

  const periodStart = entryDate > yearStart ? entryDate : yearStart;
  const periodEnd = today < yearEnd ? today : yearEnd;
  if (periodEnd < periodStart) return 0;

  const startMonth = periodStart.getFullYear() * 12 + periodStart.getMonth();
  const endMonth = periodEnd.getFullYear() * 12 + periodEnd.getMonth();
  return Math.max(0, endMonth - startMonth + 1);
}

async function getAnnualMonthlyAccrualRate(client, yearsOfService) {
  const { rows } = await client.query(
    `SELECT monthly_days
     FROM leave_accrual_tiers
     WHERE leave_type = 'Annual vacation' AND min_years <= $1
     ORDER BY min_years DESC
     LIMIT 1`,
    [Math.max(0, Math.floor(yearsOfService))]
  );
  if (!rows.length) return 1.25;
  return Number(rows[0].monthly_days) || 1.25;
}

async function getUserEntryDate(client, userId) {
  const { rows } = await client.query('SELECT entry_date FROM users WHERE id = $1', [userId]);
  return rows[0]?.entry_date || null;
}

async function calculateAnnualVacationAllocation(client, userId, year) {
  const entryDate = await getUserEntryDate(client, userId);
  if (!entryDate) return 0;
  const yearsOfService = Math.max(0, year - new Date(entryDate).getFullYear());
  const monthlyRate = await getAnnualMonthlyAccrualRate(client, yearsOfService);
  const monthsWorked = countWorkedMonthsInYear(entryDate, year);
  return Number((monthsWorked * monthlyRate).toFixed(2));
}

export async function getBalanceSnapshot(client, userId, leaveType, year, { lock = false } = {}) {
  // TOIL balance is derived from overtime entries — not stored in leave_balances
  if (leaveType === TOIL_LEAVE_TYPE) {
    return getTOILBalance(client, userId);
  }

  const { rows: policyRows } = await client.query(
    `SELECT leave_type, default_allocation_days, requires_balance, allow_negative, min_notice_days
     FROM leave_balance_policies
     WHERE leave_type = $1`,
    [leaveType]
  );
  const policy = policyRows[0];
  if (!policy) return null;

  let allocatedDays = Number(policy.default_allocation_days) || 0;
  if (leaveType === 'Annual vacation') {
    allocatedDays = await calculateAnnualVacationAllocation(client, userId, year);
  }

  await client.query(
    `INSERT INTO leave_balances (user_id, leave_type, year, allocated_days)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, leave_type, year)
     DO UPDATE SET allocated_days = EXCLUDED.allocated_days, updated_at = CURRENT_TIMESTAMP`,
    [userId, leaveType, year, allocatedDays]
  );

  const sql = `
    SELECT p.leave_type,
           p.default_allocation_days,
           p.requires_balance,
           p.allow_negative,
           p.min_notice_days,
           b.allocated_days,
           b.carry_forward_days,
           b.used_days,
           (COALESCE(b.allocated_days, 0) + COALESCE(b.carry_forward_days, 0) - COALESCE(b.used_days, 0)) AS available_days
    FROM leave_balance_policies p
    JOIN leave_balances b
      ON b.user_id = $1 AND b.leave_type = p.leave_type AND b.year = $3
    WHERE p.leave_type = $2
    ${lock ? 'FOR UPDATE OF b' : ''}
  `;
  const { rows } = await client.query(sql, [userId, leaveType, year]);
  return rows[0];
}

export async function getBalanceListForUser(client, userId, year) {
  const { rows: policyRows } = await client.query(
    `SELECT leave_type FROM leave_balance_policies ORDER BY leave_type`
  );

  const items = [];
  for (const policy of policyRows) {
    const balance = await getBalanceSnapshot(client, userId, policy.leave_type, year);
    if (!balance) continue;
    const item = {
      leave_type:             balance.leave_type,
      requires_balance:       balance.requires_balance,
      allow_negative:         balance.allow_negative,
      min_notice_days:        balance.min_notice_days,
      default_allocation_days: balance.default_allocation_days ?? 0,
      allocated_days:         balance.allocated_days,
      carry_forward_days:     balance.carry_forward_days,
      used_days:              balance.used_days,
      available_days:         balance.available_days,
    };
    // Attach TOIL-specific fields for the dashboard/form to display
    if (balance.leave_type === TOIL_LEAVE_TYPE) {
      item.available_hours = balance.available_hours;
      item.earned_hours    = balance.earned_hours;
      item.used_hours      = balance.used_hours;
      item.multiplier      = balance.multiplier;
      item.expiry_months   = balance.expiry_months;
    }
    items.push(item);
  }
  return items;
}

export function assertSufficientBalance(balance, requestedDays, leaveType) {
  if (!balance) return;
  if (!balance.requires_balance) return;
  if (balance.allow_negative) return;
  if (Number(balance.available_days) >= requestedDays) return;
  const available = Math.max(0, Number(balance.available_days) || 0).toFixed(1);
  throw new Error(`Insufficient ${leaveType} balance. Available: ${available} day(s).`);
}

const TOIL_LEAVE_TYPE = 'Time Off In Lieu';
const HOURS_PER_WORKDAY = 8;

/** Read a numeric setting from app_settings, falling back to defaultVal if missing. */
async function readSetting(client, key, defaultVal) {
  try {
    const { rows } = await client.query(`SELECT value FROM app_settings WHERE key = $1`, [key]);
    const num = Number(rows[0]?.value);
    return Number.isFinite(num) && num > 0 ? num : defaultVal;
  } catch {
    return defaultVal;
  }
}

/**
 * Compute TOIL balance for a user.
 * Earned = SUM(overtime net hours within expiry window) × multiplier
 * Used   = SUM(total_working_days × 8h) for Approved/Pending TOIL leave applications
 * Available (hours) = Earned − Used
 * Available (days)  = Available hours ÷ 8
 */
export async function getTOILBalance(client, userId) {
  const multiplier   = await readSetting(client, 'toil_multiplier',    1.25);
  const expiryMonths = await readSetting(client, 'toil_expiry_months', 3);

  const { rows: earnedRows } = await client.query(
    `SELECT COALESCE(SUM(hours), 0)::numeric(10,2) AS net_hours
     FROM overtime_entries
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 || ' months')::INTERVAL`,
    [userId, String(expiryMonths)]
  );
  const earnedHours = Number(earnedRows[0]?.net_hours || 0) * multiplier;

  const { rows: usedRows } = await client.query(
    `SELECT COALESCE(SUM(total_working_days * $2), 0)::numeric(10,2) AS used_hours
     FROM leave_applications
     WHERE applicant_id = $1
       AND leave_type = $3
       AND status IN ('Pending_PSO', 'Pending_Manager', 'Pending_Director', 'Approved')`,
    [userId, HOURS_PER_WORKDAY, TOIL_LEAVE_TYPE]
  );
  const usedHours = Number(usedRows[0]?.used_hours || 0);

  const availableHours = Math.max(0, Math.round((earnedHours - usedHours) * 100) / 100);
  const availableDays  = Math.round((availableHours / HOURS_PER_WORKDAY) * 100) / 100;

  return {
    leave_type:       TOIL_LEAVE_TYPE,
    multiplier,
    expiry_months:    expiryMonths,
    earned_hours:     Math.round(earnedHours * 100) / 100,
    used_hours:       usedHours,
    available_hours:  availableHours,
    available_days:   availableDays,
    requires_balance: true,
    allow_negative:   false,
    min_notice_days:  0,
    // fields expected by assertSufficientBalance / display
    allocated_days:   availableDays,
    carry_forward_days: 0,
    used_days:        Math.round((usedHours / HOURS_PER_WORKDAY) * 100) / 100,
  };
}

export function assertAdvanceNotice(balance, startDate, leaveType) {
  const minNoticeDays = Number(balance?.min_notice_days) || 0;
  if (!minNoticeDays || !startDate) return;
  const noticeDays = daysBetween(startOfTodayIso(), startDate);
  if (noticeDays >= minNoticeDays) return;
  throw new Error(`${leaveType} requests must be submitted at least ${minNoticeDays} days before the leave start date.`);
}

