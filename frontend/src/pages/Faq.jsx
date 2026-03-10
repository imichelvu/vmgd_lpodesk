/**
 * Author: Igor Michel
 * Purpose: Provide a user-facing FAQ covering leave, overtime, signatures, and PSSRM rules.
 * Last updated: 2026-03-09
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const SECTIONS = [
  {
    title: '🖊 Signature',
    items: [
      {
        q: 'Why do I need to register a signature?',
        a: `Your registered signature is applied automatically to PSC Form 4-9 whenever you submit a leave application or an approver approves/disapproves. Without a registered signature you cannot submit or approve anything. Go to My Profile to draw and save your signature — you only need to do this once.`,
      },
      {
        q: 'How do I register or update my signature?',
        a: `Click My Profile in the left sidebar. Under "Registered Signature", draw your signature using your mouse or touchscreen and click Save. You can update it at any time by drawing a new one and clicking "Save new signature". A ⚠ warning icon will appear next to your name in the sidebar until a signature is registered.`,
      },
      {
        q: 'Can I use a different signature for approvals than for applications?',
        a: `No. One registered signature is used everywhere — leave applications, approvals, and the printed PSC Form 4-9. This ensures consistency and prevents fraud. If you need to update your signature, go to My Profile.`,
      },
    ],
  },
  {
    title: '📝 Leave Applications',
    items: [
      {
        q: 'How do I submit a leave application?',
        a: `Go to New Application in the sidebar. Complete all required fields on PSC Form 4-9: leave type, destination, start date, end date, and total working days. Your registered signature is applied automatically. Click Submit. The form is forwarded to your immediate superior (PSO or Manager) for approval.`,
      },
      {
        q: 'How is "Total working days" calculated?',
        a: `For full-day leave: the system counts working days (Monday–Friday) between your start and end dates, excluding weekends. For Date & time range (partial days): the system calculates elapsed hours using an 8-hour workday (08:00–17:00 excluding 1-hour lunch) and converts to a decimal day value (e.g., 4 hours = 0.5 days). All values are rounded to 1 decimal place.`,
      },
      {
        q: 'What is "Date & time range" leave?',
        a: `Use this option when taking less than a full day — for example, a half-day, 1.5 days, or a specific time window. You enter exact start and end date/time, and the system calculates the total automatically (e.g., Tuesday 08:00 to Wednesday 12:00 = 1.5 days).`,
      },
      {
        q: 'How much advance notice is required for leave?',
        a: `Per PSSRM, leave requests must be submitted at least 2 weeks in advance of the proposed start date. The system will block submission if the notice period is insufficient. Emergency leave types (Sick, Compassionate, Family) are exempt from this requirement.`,
      },
      {
        q: 'What leave types are available?',
        a: `Annual vacation · Home island · Sick leave · Maternity · Family · Compassionate · Sporting / Cultural / Religious · Leave without pay · Other. Annual vacation accrues at 1.25 days per month for employees with less than 6 years of service, and 1.75 days per month after 6 years.`,
      },
      {
        q: 'When can I print the approved form?',
        a: `Once your application is fully Approved by the Director, open the application from your dashboard and click "Printable full form". The A4 form shows all filled fields and all signatures overlaid on the official PSC Form 4-9.`,
      },
      {
        q: 'What do the status labels mean?',
        a: (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: '1.9' }}>
            <li><strong>Pending Superior</strong> — waiting for your PSO or Manager to act</li>
            <li><strong>Pending Director</strong> — waiting for the Director to give final sign-off</li>
            <li><strong>Approved</strong> — fully approved; you may proceed with your leave</li>
            <li><strong>Disapproved</strong> — rejected; a comment explaining the reason is attached</li>
          </ul>
        ),
      },
      {
        q: 'Why is my application blocked at submission?',
        a: `Two checks run at submission: (1) Insufficient leave balance — you do not have enough days available for this leave type in the current year. (2) Advance notice — you have not submitted at least 2 weeks before the start date. Check your Leave balances on the dashboard and adjust your dates accordingly.`,
      },
    ],
  },
  {
    title: '✅ Approval Workflow',
    items: [
      {
        q: 'Who approves my leave application?',
        a: `Your application first goes to your immediate superior (PSO or Division Manager). Once they approve it, it moves to the Director for final sign-off. Both stages are required before the status becomes Approved. Email notifications are sent at each stage.`,
      },
      {
        q: 'How does the system know who my supervisor is?',
        a: `Your "Reports to" field in Admin → Users links you to your supervisor. If your applications are not reaching the right person, contact your Admin to verify this mapping.`,
      },
      {
        q: 'Can a manager approve on behalf of someone who is on leave (delegation)?',
        a: `Yes. If a delegation is active, the acting manager will see the applications in their approval queue marked with "(Acting for [Name])". Delegation periods are managed by Admin.`,
      },
      {
        q: 'Can I approve my own leave application?',
        a: `No. The system prevents self-approval. Even if you hold a manager or director role, you cannot approve applications you submitted yourself.`,
      },
      {
        q: 'What happens after I disapprove an application?',
        a: `A comment is mandatory when disapproving. The applicant is notified by email with the status change and your comment. The application status becomes Disapproved and no further action is needed.`,
      },
    ],
  },
  {
    title: '⏱ Overtime & TOIL',
    items: [
      {
        q: 'What are the standard hours of work?',
        a: `The standard working week in the public service is 40 hours — 08:00–12:00 and 13:00–17:00, Monday to Friday (with a 1-hour unpaid lunch break). Any variation to these hours requires prior written consent from your Director-General, Director, Secretary, or equivalent position, and the Secretary must be notified of any such variation.`,
      },
      {
        q: 'What qualifies as overtime under the PSSRM?',
        a: `Overtime means hours worked beyond the standard monthly hours (working days in the calendar month × 8 hours per day). You must work a minimum of 1 full hour beyond the standard hours in a single working day to qualify. You must also be directed in writing by your supervisor before performing the overtime work — no claim is payable for self-directed overtime.`,
      },
      {
        q: 'What are the overtime entitlements by grade?',
        a: (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: '1.9' }}>
            <li><strong>PS1.1 – PS6.4 (and equivalents):</strong> Eligible for overtime <em>payment</em> OR Time Off In Lieu (TOIL) at <strong>1¼ hours off per hour worked</strong></li>
            <li><strong>PS7.1 and above (and equivalents):</strong> TOIL only (not eligible for overtime payment), also at <strong>1¼ hours off per hour worked</strong></li>
            <li>TOIL must be taken within <strong>3 months</strong> of the approved date, and every effort should be made to take it within the same financial year</li>
            <li>All overtime claims must be settled before the end of the same financial year</li>
            <li>Failing to comply is a disciplinary offence under PSSRM Chapter 6</li>
          </ul>
        ),
      },
      {
        q: 'What is required before claiming overtime?',
        a: (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: '1.9' }}>
            <li>Written direction from your supervisor to work overtime (before the work is performed)</li>
            <li>PSC Form 4-2 completed and endorsed by your immediate supervisor <em>and</em> Director / Director-General / Secretary or equivalent</li>
            <li>A timesheet to verify actual hours worked</li>
            <li>Overtime must be settled within the same financial year; claims submitted after year-end cannot be paid</li>
            <li>No payment is made for any overtime worked without prior written approval</li>
          </ul>
        ),
      },
      {
        q: 'What are unsocial hours?',
        a: `Under PSSRM s.4.1 Unsocial Hours Payments, "unsocial hours bandwidth" means 08:00–17:00 on Saturdays, Sundays, and Official Public Holidays. Weekday evenings are not classified as unsocial hours. Staff on PS1.1–PS6.4 (and daily-rated workers) are entitled to an additional unsocial hours payment on top of their ordinary rate or overtime rate for work performed during this window — but only when directed by a supervisor.`,
      },
      {
        q: 'What overtime types can I record in the system?',
        a: (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: '1.9' }}>
            <li><strong>Weekend / Field Work</strong> — worked on weekends or during local field trips (unsocial hours apply)</li>
            <li><strong>Emergency Callout</strong> — called in to fix server, workstation, or power issues outside standard hours</li>
            <li><strong>Standby Duty</strong> — on standby for Tropical Low / Cyclone events or operational alerts</li>
            <li><strong>Overseas Mission</strong> — international travel, training, conferences, or meetings outside the country</li>
            <li><strong>General Overtime</strong> — all other extra work performed beyond standard weekday hours</li>
          </ul>
        ),
      },
      {
        q: 'How do I account for break time within an overtime window?',
        a: `When adding an overtime entry, fill in the Start and End date/time for the full window (e.g., Saturday 08:00–17:00). Then enter any Break / deduction hours (e.g., 1.0 for a lunch break). The system calculates: Elapsed − Break = Net worked hours. Only the net hours count toward your overtime entitlement and TOIL calculation.`,
      },
      {
        q: 'How does lateness affect my overtime entitlement?',
        a: `Per PSSRM s.63, if you arrive 1 or more hours late without permission, you are required to make up those lost hours. Make-up hours owed reduce your net claimable overtime. Example: you worked 3 hours overtime on a day you were 1 hour late → net claimable overtime = 2 hours → TOIL = 2 × 1.25 = 2.5 hours. Lateness of less than 1 hour does not trigger the make-up rule.`,
      },
      {
        q: 'What happens with accumulated lateness?',
        a: (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: '1.9' }}>
            <li>Each late arrival of ≥1 hour (without permission) must be made up</li>
            <li>Accumulated lateness of <strong>8 hours total</strong> = 1 absence incident</li>
            <li><strong>3 or more absence incidents</strong> in any 6-month period → supervisor must conduct a counselling session</li>
            <li><strong>10 or more absence incidents</strong> → disciplinary offence under PSSRM</li>
          </ul>
        ),
      },
    ],
  },
  {
    title: '📊 Leave Balances',
    items: [
      {
        q: 'How does annual leave accrue?',
        a: `Annual vacation accrues monthly: 1.25 days per month for employees with less than 6 years of service, and 1.75 days per month for those with 6 or more years of continuous service — in accordance with Employment Act [Cap 160] (Vanuatu). Balances are shown on your dashboard.`,
      },
      {
        q: 'Can I check my leave balance before applying?',
        a: `Yes. Your current leave balances for each leave type and year are shown on the Dashboard under "Leave balances". The system will also block your application at submission if you have insufficient balance.`,
      },
    ],
  },
  {
    title: '👤 Account & Profile',
    items: [
      {
        q: 'How do I log in?',
        a: `Enter your username (e.g., imichel) or your email address, along with your password, on the login page. Contact Admin if you do not know your credentials.`,
      },
      {
        q: 'How do I reset my password?',
        a: `Click "Forgot password?" on the login page and enter your registered email. You will receive a reset link valid for 1 hour.`,
      },
      {
        q: 'Can I update my own profile (name, division, grade)?',
        a: `Personal details such as name, division, grade, and ministry are managed by Admin. Go to Admin → Users to request a change, or contact your HR Admin. You can manage your own signature on the My Profile page.`,
      },
      {
        q: 'Who do I contact if I have access or role issues?',
        a: `Contact your Admin user or HR. Common issues: account not activated, wrong division assignment, missing supervisor link (reports_to_id), or incorrect role mapping. All of these are managed in Admin → Users.`,
      },
    ],
  },
];

function FaqSection({ title, items }) {
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
        {title}
      </h2>
      <div className="faq-list" role="list">
        {items.map((item) => (
          <details key={item.q} className="faq-item" role="listitem">
            <summary className="faq-question">{item.q}</summary>
            <div className="faq-answer">
              {typeof item.a === 'string' ? <p style={{ margin: 0 }}>{item.a}</p> : item.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export default function Faq() {
  const [search, setSearch] = useState('');
  const q = search.toLowerCase().trim();

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
    <>
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Quick answers for staff and approvers using LeaveDesk."
      />

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="faq-search">Search questions</label>
          <input
            id="faq-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. overtime, signature, balance, lateness…"
            autoComplete="off"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card">
          <p className="text-muted">No matching questions found for "<strong>{search}</strong>". Try a different keyword.</p>
        </div>
      )}

      {filtered.map((section) => (
        <FaqSection key={section.title} title={section.title} items={section.items} />
      ))}

      <div className="card" style={{ marginTop: '1rem' }}>
        <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          Still have questions? Contact your Admin in the{' '}
          <Link to="/admin">Admin panel</Link>{' '}
          or email HR. For full policy details, refer to the PSSRM: Chapter 3 (Hours of Work) and Chapter 4 (Work Related Allowances — Overtime s.4.1, Unsocial Hours s.4.1).
        </p>
      </div>
    </>
  );
}
