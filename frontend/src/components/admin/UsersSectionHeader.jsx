import React from 'react';
import Button from '../Button';

export default function UsersSectionHeader({ onOpenAdModal, onAddUser }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 className="section-title">Users</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={onOpenAdModal}>Update users from Active Directory</Button>
          <Button type="button" variant="primary" onClick={onAddUser}>Add user</Button>
        </div>
      </div>
    </div>
  );
}
