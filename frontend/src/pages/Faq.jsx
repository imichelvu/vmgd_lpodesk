/**
 * Author: Igor Michel
 * Purpose: Provide a user-facing FAQ page for common leave workflow questions.
 * Last updated: 2026-02-09
 */
import React from 'react';
import PageHeader from '../components/PageHeader';

const FAQ_ITEMS = [
  {
    question: 'How do I submit a new leave application?',
    answer: 'Go to "New application", complete PSC Form 4-9 details, add required signatures, then submit.',
  },
  {
    question: 'Why can\'t I see my application on Dashboard?',
    answer: 'If loading fails, check your network and refresh. If it still does not appear, contact Admin to verify your account and role mapping.',
  },
  {
    question: 'How is total working days calculated?',
    answer: 'The system calculates duration based on your selected date/time range using an 8-hour workday standard, including decimal values when applicable.',
  },
  {
    question: 'When can I print my application form?',
    answer: 'After final approval, open the application detail and use the print action to view the printable PSC Form 4-9 with overlays and signatures.',
  },
  {
    question: 'What do statuses mean?',
    answer: 'Pending statuses mean the request is waiting for the next approver. Approved means completed successfully. Disapproved means the request was rejected.',
  },
  {
    question: 'Why am I blocked by leave balance or advance notice?',
    answer: 'Some leave types require enough available balance and minimum notice days before the start date. The system validates both before submission.',
  },
  {
    question: 'Who can help if I have access or role issues?',
    answer: 'Contact your Admin user or HR support to check account activation, division assignment, and role permissions.',
  },
];

export default function Faq() {
  return (
    <>
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Quick answers for staff and approvers using the leave workflow."
      />

      <div className="card">
        <div className="faq-list" role="list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="faq-item" role="listitem">
              <summary className="faq-question">{item.question}</summary>
              <p className="faq-answer">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
