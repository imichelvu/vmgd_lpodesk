import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
  loadingText = 'Processing...',
  maxWidth = 420,
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose?.();
      }}
      title={title}
      titleId="confirm-dialog-title"
      maxWidth={maxWidth}
      closeOnBackdrop={!loading}
    >
      {typeof message === 'string' ? <p>{message}</p> : message}
      <div className="actions-cell">
        <Button type="button" variant={confirmVariant} onClick={onConfirm} loading={loading} loadingText={loadingText}>
          {confirmText}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
      </div>
    </Modal>
  );
}
