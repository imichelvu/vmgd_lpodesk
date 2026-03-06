/**
 * Author: Igor Michel
 * Purpose: Show supervisor approval queue with inline accordion review and decisions.
 * Last updated: 2026-02-09
 */
/**
 * Author: Igor Michel
 * Purpose: Show supervisor approval queue with inline accordion review and decisions.
 * Last updated: 2026-02-09
 */
import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import ApproverApplicationList from '../components/ApproverApplicationList';

export default function SupervisorView() {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Applications from your division requiring your approval. Acting delegations are included."
      />
      <div className="tabs" role="tablist" aria-label="Approvals view mode">
        <button
          type="button"
          role="tab"
          id="supervisor-tab-pending"
          aria-controls="supervisor-panel-pending"
          aria-selected={activeTab === 'pending'}
          className={`tab${activeTab === 'pending' ? ' active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending
        </button>
        <button
          type="button"
          role="tab"
          id="supervisor-tab-history"
          aria-controls="supervisor-panel-history"
          aria-selected={activeTab === 'history'}
          className={`tab${activeTab === 'history' ? ' active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'pending' && (
        <div role="tabpanel" id="supervisor-panel-pending" aria-labelledby="supervisor-tab-pending">
          <ApproverApplicationList
            endpoint="/leave/supervisor"
            pageTitle="Pending Approvals"
            emptyMessage="No applications pending your approval."
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div role="tabpanel" id="supervisor-panel-history" aria-labelledby="supervisor-tab-history">
          <ApproverApplicationList
            endpoint="/leave/supervisor/history"
            pageTitle="Approval History"
            emptyMessage="No historical decisions yet."
          />
        </div>
      )}
    </>
  );
}
