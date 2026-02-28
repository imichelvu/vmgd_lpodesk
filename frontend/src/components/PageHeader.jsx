import React from 'react';

/**
 * Reusable page header for consistent title/subtitle styling.
 */
export default function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div className="page-header-copy">
        <h2 className="page-title">{title}</h2>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}

