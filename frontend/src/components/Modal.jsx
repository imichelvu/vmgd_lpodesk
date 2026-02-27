import React from 'react';

export default function Modal({
  open,
  onClose,
  title,
  titleId,
  children,
  className = '',
  style,
  maxWidth,
  closeOnBackdrop = true,
}) {
  if (!open) return null;

  const resolvedTitleId = titleId || 'modal-title';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? resolvedTitleId : undefined}
      onClick={() => {
        if (closeOnBackdrop) onClose?.();
      }}
    >
      <div
        className={`modal-dialog card ${className}`.trim()}
        style={{ ...(maxWidth ? { maxWidth } : {}), ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h3 id={resolvedTitleId} className="section-title" style={{ marginTop: 0 }}>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
