/**
 * Author: Igor Michel
 * Purpose: Reusable hook for calculating summary statistics for approver views.
 * Last updated: 2026-02-09
 */
import { useMemo } from 'react';

/**
 * Calculates summary statistics for a list of leave applications.
 * @param {Array<Object>} applications - The list of leave applications.
 * @returns {Array<Object>} An array of stat objects for display.
 */
export function useApproverStats(applications) {
  return useMemo(() => {
    if (!Array.isArray(applications) || !applications.length) return [];

    const total = applications.length;
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

    applications.forEach((app) => {
      const d = toDate(app.start_date);
      if (!d) return;
      if (d.toISOString().slice(0, 10) === todayStr) startingToday += 1;
      else if (d > today && d <= in7Days) startingSoon += 1;
      else if (d < today) alreadyStarted += 1;
    });

    return [
      { label: 'Pending applications', value: total, tone: total ? 'warning' : 'default' },
      { label: 'Starting today', value: startingToday, tone: startingToday ? 'success' : 'default' },
      { label: 'Next 7 days', value: startingSoon, tone: startingSoon ? 'success' : 'default', hint: 'Upcoming leave in your queue' },
      { label: 'Past start date', value: alreadyStarted, tone: alreadyStarted ? 'danger' : 'default', hint: alreadyStarted ? 'Needs quick decision' : undefined },
    ];
  }, [applications]);
}
