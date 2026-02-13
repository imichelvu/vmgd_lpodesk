import React from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(str) {
  if (!str || typeof str !== 'string') return '';
  const [y, m, d] = str.trim().split('-');
  if (y && m && d) return `${d}/${m}/${y}`;
  return str;
}

function toYYYYMMDD(val) {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatEntryDate(str) {
  const normalized = toYYYYMMDD(str);
  if (!normalized) return '';
  const [y, m, d] = normalized.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return normalized;
  const day = d.padStart(2, '0');
  return `${day} ${MONTHS[monthIdx]} ${y}`;
}

/**
 * PSC Form 4-9 as HTML – flexible CSS Grid (no table).
 */
export default function Form49Html({ user, formData }) {
  const name = user?.full_name || '';
  const postTitle = user?.post_title || '';
  const vnpfNo = user?.vnpf_no || '';
  const postNo = user?.post_no || '';
  const grade = user?.grade || '';
  const department = user?.department || '';
  const ministry = user?.ministry || '';
  const entryDate = user?.entry_date ? formatEntryDate(user.entry_date) : '';
  const leaveType = formData?.leave_type || '';
  const destination = formData?.destination || '';
  const firstDate = formatDate(formData?.start_date || '');
  const lastDate = formatDate(formData?.end_date || '');
  const totalDays = formData?.total_working_days != null ? String(formData.total_working_days) : '';
  const advancePay = formData?.advance_pay;
  const advancePayDate = formatDate(formData?.advance_pay_date || '');
  const remarks = formData?.reason_or_remarks || '';
  const signatureData = formData?.signature_data;
  const hasSignature = typeof signatureData === 'string' && signatureData.startsWith('data:');
  const signatureDate = hasSignature ? formatDate(new Date().toISOString().slice(0, 10)) : '';

  const Line = ({ children, minWidth }) => (
    <span className="form49-line" style={{ minWidth }}>{children}</span>
  );

  return (
    <div className="form49-doc">
      <div className="form49-doc-inner">
        <header className="form49-header">
          <span className="form49-form-id">PSC FORM 4-9</span>
          <h1 className="form49-title">APPLICATION FOR LEAVE FORM</h1>
        </header>

        <div className="form49-grid" role="presentation">
          {/* Name | VNPF No */}
          <div id="form49-name" className="form49-label">Name:</div>
          <div className="form49-value"><Line>{name}</Line></div>
          <div className="form49-label form49-label-right">VNPF No:</div>
          <div className="form49-value"><Line>{vnpfNo}</Line></div>

          {/* Post title | Grade (same row as on form) */}
          <div id="form49-post-title" className="form49-label">Post title:</div>
          <div className="form49-value"><Line>{postTitle}</Line></div>
          <div className="form49-label form49-label-right">Grade:</div>
          <div className="form49-value"><Line>{grade}</Line></div>

          {/* Post No (own row, full width value) */}
          <div id="form49-post-no" className="form49-label">Post No:</div>
          <div className="form49-value form49-value-span"><Line>{postNo}</Line></div>

          {/* Department | Ministry */}
          <div id="form49-department" className="form49-label">Department:</div>
          <div className="form49-value"><Line>{department}</Line></div>
          <div className="form49-label form49-label-right">Ministry:</div>
          <div className="form49-value"><Line>{ministry}</Line></div>

          {/* Entry date */}
          <div id="form49-entry-date" className="form49-label form49-label-bold">ENTRY DATE OF SERVICE:</div>
          <div className="form49-value form49-value-span"><Line>{entryDate}</Line></div>

          {/* Leave type */}
          <div id="form49-leave-type" className="form49-label form49-label-bold">TYPE OF LEAVE TO BE TAKEN:</div>
          <div className="form49-value form49-value-span"><Line>{leaveType}</Line></div>

          {/* Destination */}
          <div id="form49-destination" className="form49-label form49-label-bold">DESTINATION OF LEAVE TO BE TAKEN:</div>
          <div className="form49-value form49-value-span"><Line>{destination}</Line></div>

          {/* First date | Last date */}
          <div id="form49-dates" className="form49-label form49-label-bold">FIRST DATE OF LEAVE:</div>
          <div className="form49-value"><Line>{firstDate}</Line></div>
          <div className="form49-label form49-label-right">LAST DATE OF LEAVE:</div>
          <div className="form49-value"><Line>{lastDate}</Line></div>

          {/* Total days */}
          <div id="form49-total-days" className="form49-label form49-label-bold">TOTAL NUMBER OF WORKING DAYS LEAVE:</div>
          <div className="form49-value form49-value-span"><Line>{totalDays}</Line></div>

          {/* Advance pay YES/NO + Date */}
          <div id="form49-advance-pay" className="form49-label form49-label-bold">ADVANCE LEAVE SALARY REQUIRED:</div>
          <div className="form49-value form49-value-span form49-yesno">
            <span className={'form49-yn' + (advancePay ? ' form49-yn-selected' : '')}>YES</span>
            <span className={'form49-yn' + (!advancePay && advancePay !== undefined ? ' form49-yn-selected' : '')}>NO</span>
            <span className="form49-label form49-label-inline">Date required:</span>
            <Line minWidth="120px">{advancePayDate}</Line>
          </div>

          <div id="form49-advance-note" className="form49-note form49-full">(please circle the appropriate answer and submit at least three weeks in advance)</div>

          {/* Signature staff */}
          <div id="form49-signature-staff" className="form49-label form49-label-bold">Signature of Staff Member:</div>
          <div className="form49-value form49-signature-cell">
            {hasSignature ? (
              <img src={signatureData} alt="Applicant signature" className="form49-signature-img" />
            ) : (
              <Line minWidth="180px" />
            )}
          </div>
          <div className="form49-label form49-label-right">Date:</div>
          <div className="form49-value"><Line minWidth="80px">{signatureDate}</Line></div>

          <div id="form49-supported" className="form49-label form49-label-bold form49-full">LEAVE APPLIED FOR IS SUPPORTED: YES/NO <span className="form49-note-inline">(please circle the appropriate answer)</span></div>

          {/* Signature supervisor */}
          <div id="form49-signature-supervisor" className="form49-label form49-label-bold">Signature of Supervisor:</div>
          <div className="form49-value"><Line minWidth="180px" /></div>
          <div className="form49-label form49-label-right">Date:</div>
          <div className="form49-value"><Line minWidth="80px" /></div>

          {/* Remarks */}
          <div id="form49-remarks" className="form49-label form49-label-bold">COMMENTS:</div>
          <div className="form49-value form49-value-span"><Line>{remarks}</Line></div>
        </div>

        <section className="form49-section">
          <h2 className="form49-section-title">DIRECTOR GENERAL/DIRECTOR OR SECRETARY, OPSC APPROVAL:</h2>
          <div className="form49-grid form49-grid-sm" role="presentation">
            <div className="form49-label form49-label-bold form49-label-span">LEAVE APPROVED: YES/NO</div>
            <div className="form49-label form49-label-right">Date:</div>
            <div className="form49-value"><Line minWidth="80px" /></div>
            <div className="form49-note form49-full">(please circle the appropriate answer)</div>
            <div className="form49-label">COMMENTS:</div>
            <div className="form49-value form49-value-span"><Line /></div>
            <div className="form49-label">Name:</div>
            <div className="form49-value"><Line minWidth="120px" /></div>
            <div className="form49-label form49-label-right">Signature:</div>
            <div className="form49-value"><Line minWidth="120px" /></div>
          </div>
          <p className="form49-note form49-note-block">(For annual vacation, standard sick leave, maternity, family, compassionate, international/provincial sporting, cultural and religious events only. A medical certificate is to be attached where the period of sick leave is more than 2 days and the staff member lives within the boundaries of Port Vila or Luganville or more than 4 days for all other areas)</p>
        </section>

        <section className="form49-section">
          <h2 className="form49-section-title form49-section-title-underline">PUBLIC SERVICE COMMISSION APPROVAL:</h2>
          <span className="form49-note-inline"> (For sabbatical, secondment, leave without pay and non-standard sick leave only)</span>
          <div className="form49-grid form49-grid-sm" role="presentation">
            <div className="form49-label form49-label-bold">APPROVED/NOT APPROVED</div>
            <div className="form49-label">PSC Meeting held on:</div>
            <div className="form49-value form49-value-span-right"><Line /></div>
            <div className="form49-note form49-full">(please circle decision)</div>
            <div className="form49-label form49-label-bold">SECRETARY, OPSC - Name:</div>
            <div className="form49-value"><Line minWidth="120px" /></div>
            <div className="form49-label form49-label-right">Signature:</div>
            <div className="form49-value"><Line minWidth="120px" /></div>
          </div>
        </section>

        <section className="form49-section form49-hro">
          <h2 className="form49-section-title form49-section-title-underline">HRO USE ONLY</h2>
          <div className="form49-grid form49-grid-sm" role="presentation">
            <div className="form49-label form49-label-bold">Date entered into HRMIS:</div>
            <div className="form49-value form49-value-span"><Line /></div>
          </div>
        </section>

        <footer className="form49-footer">Page 1 of 1</footer>
      </div>
    </div>
  );
}
