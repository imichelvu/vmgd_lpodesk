import React from 'react';

/**
 * Reusable strip of small metric cards.
 * items: [{ label, value, hint?, tone?: 'default' | 'success' | 'warning' | 'danger' }]
 */
export default function StatsRow({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="stats-row">
      {items.map((item) => {
        const tone = item.tone || 'default';
        const key = item.key || item.label;
        return (
          <div
            key={key}
            className={`stat-card stat-card-${tone}`}
          >
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
            {item.hint ? <div className="stat-hint">{item.hint}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

