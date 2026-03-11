/**
 * Author: Igor Michel
 * Purpose: Provide a user-facing FAQ covering procurement requests, approvals, and LPODesk usage.
 * Last updated: 2026-03-11
 */
import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';

const SECTIONS = [
  {
    title: '📝 Submitting a Request',
    items: [
      {
        q: 'How do I create a new procurement request?',
        a: 'Click "New Request" in the sidebar. Fill in the title, description, supplier name, estimated amount, and select a category. Attach a supplier quote or specification document if available. You can save it as a draft or submit it for approval immediately.',
      },
      {
        q: 'What categories are available?',
        a: 'ICT Equipment · Office Supplies · Services · Maintenance · Consultancy. If your item does not fit neatly into one category, choose the closest match and describe it clearly in the description field.',
      },
      {
        q: 'What is the difference between "Save as Draft" and "Submit for Approval"?',
        a: 'A draft is only visible to you and can be edited before submission. Once you submit, the request enters the approval workflow and can no longer be edited. Use drafts when you need to gather more information before sending it forward.',
      },
      {
        q: 'Can I attach multiple documents to one request?',
        a: 'Yes. After the request is created, additional documents can be uploaded from the request details page. Supported formats are PDF, Word, Excel, and common image types (JPG, PNG). Maximum file size is 10 MB per file.',
      },
    ],
  },
  {
    title: '🔄 Approval Workflow',
    items: [
      {
        q: 'What is the approval chain for a procurement request?',
        a: 'All requests go through: Manager → Procurement Officer → Director. If the category is ICT Equipment, an additional ICT Manager approval step is inserted between Manager and Procurement Officer.',
      },
      {
        q: 'Why does my ICT Equipment request have an extra approval step?',
        a: 'ICT Equipment requests require technical validation from the ICT Manager before they proceed to Procurement. This ensures that specifications are correct and compatible with existing infrastructure before a purchase order is issued.',
      },
      {
        q: 'What do the status labels mean?',
        a: [
          'draft — saved but not yet submitted.',
          'submitted — sent to the Manager for first review.',
          'manager_approved — Manager has approved; moving to ICT Manager (ICT) or Procurement (other).',
          'ict_approved — ICT Manager has validated; moving to Procurement Officer.',
          'procurement_approved — Procurement Officer has approved; moving to Director.',
          'director_approved / completed — fully approved, LPO can be issued.',
          'rejected — refused at some stage; a comment explaining the reason should be present.',
        ].join(' | '),
      },
      {
        q: 'Can I approve a request that I created myself?',
        a: 'No. The workflow checks are role-based, not request-owner-based at the database level, but approvers should not act on requests they created. Self-approval would constitute a conflict of interest under procurement regulations.',
      },
      {
        q: 'What happens when I reject a request?',
        a: 'The request status changes to "rejected" and the requester receives an email notification with your comment. A rejected request cannot be resubmitted — the requester must create a new request if they wish to try again.',
      },
    ],
  },
  {
    title: '👤 Roles and Permissions',
    items: [
      {
        q: 'Who can submit a request?',
        a: 'Any staff member with an active LPODesk account can create and submit procurement requests.',
      },
      {
        q: 'Who can approve requests?',
        a: 'Manager (role 3) approves first. ICT Manager (role 6) approves ICT Equipment requests next. Procurement Officer (role 7) approves after ICT validation or directly after Manager for non-ICT requests. Director (role 4) gives final approval.',
      },
      {
        q: 'Can a user have more than one role?',
        a: 'Yes. A user can hold multiple roles simultaneously — for example, a user could be both a Staff member and a Manager. Roles are assigned by the Admin in Settings.',
      },
      {
        q: 'What can the Admin do that other users cannot?',
        a: 'Admins can manage all users, assign roles, manage divisions, set up acting delegations, and configure system-wide settings. Admins can also view all requests in the system regardless of status.',
      },
    ],
  },
  {
    title: '📁 Documents',
    items: [
      {
        q: 'What types of documents should I attach?',
        a: 'Supplier quotations are required for most procurements. For ICT requests, include technical specifications. For services, attach a scope of work or terms of reference. For maintenance, include a description of the work and cost estimate.',
      },
      {
        q: 'Where are uploaded documents stored?',
        a: 'Documents are stored securely on the server and linked to your request. They are visible to all users who can view the request, including all approvers in the chain.',
      },
    ],
  },
  {
    title: '⚙️ Account and Access',
    items: [
      {
        q: 'How do I reset my password?',
        a: 'On the login page click "Forgot password". Enter your email address and a reset link will be sent to you. The link is valid for 1 hour. If you do not receive an email, check your spam folder or contact Admin.',
      },
      {
        q: 'I cannot log in. What should I check?',
        a: 'Make sure you are using your correct username or email. Passwords are case-sensitive. If you have forgotten your password, use the Forgot Password link. If your account may have been deactivated, contact Admin.',
      },
      {
        q: 'How do I update my profile information?',
        a: 'Go to "My Profile" in the sidebar. You can update your post title, department, and ministry details. Contact your Admin to change your name, email, division, or role assignments.',
      },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item" style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
      <button
        type="button"
        className="faq-question"
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.9rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontWeight: 600, fontSize: '0.95rem', color: 'var(--text, #111827)',
        }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {q}
        <span style={{ marginLeft: '1rem', fontSize: '1.1rem', flexShrink: 0, color: 'var(--text-muted, #6b7280)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="faq-answer" style={{ padding: '0 0 0.9rem', color: 'var(--text-secondary, #374151)', lineHeight: 1.7, fontSize: '0.9rem' }}>
          {a}
        </div>
      )}
    </div>
  );
}

function FaqSection({ title, items }) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{title}</h2>
      {items.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
    </div>
  );
}

export default function Faq() {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const filtered = q
    ? SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            (typeof item.a === 'string' && item.a.toLowerCase().includes(q))
        ),
      })).filter((s) => s.items.length > 0)
    : SECTIONS;

  return (
    <div className="page-content">
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Quick answers for staff and approvers using LPODesk."
      />

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="faq-search">Search questions</label>
          <input
            id="faq-search"
            type="search"
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. ICT, approval, document, category…"
            autoComplete="off"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card">
          <p className="muted">No matching questions found for &ldquo;<strong>{search}</strong>&rdquo;. Try a different keyword.</p>
        </div>
      )}

      {filtered.map((section) => (
        <FaqSection key={section.title} title={section.title} items={section.items} />
      ))}

      <div className="card" style={{ marginTop: '1rem' }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          Still have questions? Contact your system administrator or the Procurement Unit.
        </p>
      </div>
    </div>
  );
}
