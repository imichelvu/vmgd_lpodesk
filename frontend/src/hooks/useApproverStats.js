/**
 * Author: Igor Michel
 * Purpose: Calculate summary statistics for a list of pending procurement requests.
 * Last updated: 2026-03-11
 */
import { useMemo } from 'react';

/**
 * Calculates summary statistics for a list of procurement requests.
 * @param {Array<Object>} requests - The list of pending procurement requests.
 * @returns {Array<Object>} An array of stat objects for display.
 */
export function useApproverStats(requests) {
  return useMemo(() => {
    if (!Array.isArray(requests) || !requests.length) return [];

    const total = requests.length;
    const highValue = requests.filter((r) => r.amount > 100000).length;
    const ictEquipment = requests.filter((r) => r.category === 'ICT Equipment').length;
    const other = total - ictEquipment;

    return [
      { label: 'Pending requests', value: total, tone: total ? 'warning' : 'default' },
      { label: 'ICT Equipment', value: ictEquipment, tone: ictEquipment ? 'success' : 'default' },
      { label: 'Other categories', value: other, tone: 'default' },
      { label: 'High value (>100k VUV)', value: highValue, tone: highValue ? 'danger' : 'default', hint: highValue ? 'Requires careful review' : undefined },
    ];
  }, [requests]);
}
