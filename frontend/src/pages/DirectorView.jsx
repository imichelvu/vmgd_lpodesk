/**
 * Author: Igor Michel
 * Purpose: Show director final sign-off queue with inline accordion actions.
 * Last updated: 2026-02-09
 */
import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import ApproverApplicationList from '../components/ApproverApplicationList';

export default function DirectorView() {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <>
      <PageHeader
        title="Director — Final sign-off"
        subtitle="All VMGD staff applications across divisions, after manager approval. Perform final sign-off here."
      />
      <div className="tabs" role="tablist" aria-label="Director approvals view mode">
        <button type="button" className={`tab${activeTab === 'pending' ? ' active' : ''}`} onClick={() => setActiveTab('pending')}>
          Pending
        </button>
        <button type="button" className={`tab${activeTab === 'history' ? ' active' : ''}`} onClick={() => setActiveTab('history')}>
          History
        </button>
      </div>

      {activeTab === 'pending' && (
        <ApproverApplicationList
          endpoint="/leave/director"
          pageTitle="Pending Director Sign-off"
          emptyMessage="No applications pending Director sign-off."
        />
      )}

      {activeTab === 'history' && (
        <ApproverApplicationList
          endpoint="/leave/director/history"
          pageTitle="Director Sign-off History"
          emptyMessage="No historical sign-off records yet."
        />
      )}
    </>
  );
}