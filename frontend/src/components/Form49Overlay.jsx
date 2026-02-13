import React from 'react';
import './Form49Overlay.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

/** Format as "01 Sep 2014" / "13 Feb 2026" for overlay */
function formatDDMMMYYYY(str) {
  const normalized = toYYYYMMDD(str);
  if (!normalized) return '';
  const [y, m, d] = normalized.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return normalized;
  const day = d.padStart(2, '0');
  return `${day} ${MONTHS[monthIdx]} ${y}`;
}

/**
 * PSC Form 4-9 preview: form image + absolutely positioned overlay text.
 * Matches overlay.html structure and IDs so your manual positions apply.
 */
export default function Form49Overlay({ user, formData }) {
  const fullname = user?.full_name || '';
  const vnpfno = user?.vnpf_no || '';
  const postitle = user?.post_title || '';
  const posno = user?.post_no || '';
  const grade = user?.grade || '';
  const department = user?.department || 'VMGD';
  const ministry = user?.ministry || 'MoCCA';
  const entrydate = user?.entry_date ? formatDDMMMYYYY(user.entry_date) : '';
  const leavetype = formData?.leave_type || '';
  const leavedest = formData?.destination || '';
  const firstleavedt = formatDDMMMYYYY(formData?.start_date || '');
  const lastleavedt = formatDDMMMYYYY(formData?.end_date || '');
  const totalnumleave = formData?.total_working_days != null ? String(formData.total_working_days) : '';
  const advancePay = formData?.advance_pay;
  const advancePayDate = formData?.advance_pay_date ? formatDDMMMYYYY(formData.advance_pay_date) : '';
  const signatureData = formData?.signature_data;
  const hasSignature = typeof signatureData === 'string' && signatureData.startsWith('data:');
  const staffsigdt = hasSignature ? formatDDMMMYYYY(new Date().toISOString().slice(0, 10)) : '';

  return (
    <div className="form49-overlay-preview">
      <div id="image-container" className="form49-overlay-container">
        <img
          id="image"
          className="form49-overlay-img"
          src="/form4-9.png"
          alt="PSC Form 4-9"
        />
        <p className="pscformtext statinfo" id="fullname">{fullname}</p>
        <p className="pscformtext statinfo" id="vnpfno">{vnpfno}</p>
        <p className="pscformtext statinfo" id="postitle">{postitle}</p>
        <p className="pscformtext statinfo" id="posno">{posno}</p>
        <p className="pscformtext statinfo" id="grade">{grade}</p>
        <p className="pscformtext statinfo" id="department">{department}</p>
        <p className="pscformtext statinfo" id="ministry">{ministry}</p>
        <p className="pscformtext statinfo" id="entrydate">{entrydate}</p>
        <p className="pscformtext" id="leavetype">{leavetype}</p>
        <p className="pscformtext" id="leavedest">{leavedest}</p>
        <p className="pscformtext" id="firstleavedt">{firstleavedt}</p>
        <p className="pscformtext" id="lastleavedt">{lastleavedt}</p>
        <p className="pscformtext" id="totalnumleave">{totalnumleave}</p>
        <div id="advance" className="pscformtext form49-advance-wrap">
          {advancePay ? <span className="yes">YES</span> : null}
          {!advancePay && advancePay !== undefined ? <span className="no">NO</span> : null}
        </div>
        <p className="pscformtext" id="advance-pay-date">{advancePayDate}</p>
        <p className="pscformtext" id="staffsig">
          {hasSignature ? (
            <img src={signatureData} alt="Signature" className="form49-overlay-sig-img" />
          ) : null}
        </p>
        <p className="pscformtext" id="staffsigdt">{staffsigdt}</p>
        <p className="pscformtext" id="supsig" />
        <p className="pscformtext" id="supsigdt" />
      </div>
    </div>
  );
}
