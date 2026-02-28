/**
 * Author: Igor Michel
 * Purpose: Render PSC Form 4-9 image overlay with dynamic fields and signatures.
 * Last updated: 2026-02-28
 */
import React, { useEffect, useState } from 'react';
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

function normalizeSignatureData(rawValue) {
  if (!rawValue) return '';
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (trimmed.startsWith('data:')) return trimmed;
    // Legacy rows may store JSON-encoded strings.
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'string' && parsed.startsWith('data:') ? parsed : '';
    } catch (_) {
      return '';
    }
  }
  if (typeof rawValue === 'object') {
    const maybeDataUrl = rawValue.dataUrl || rawValue.value || rawValue.signature;
    return typeof maybeDataUrl === 'string' && maybeDataUrl.startsWith('data:') ? maybeDataUrl : '';
  }
  return '';
}

function useTransparentSignatureData(dataUrl) {
  const [processedDataUrl, setProcessedDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!dataUrl) {
      setProcessedDataUrl('');
      return () => { cancelled = true; };
    }

    if (!String(dataUrl).startsWith('data:image')) {
      setProcessedDataUrl(dataUrl);
      return () => { cancelled = true; };
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('2D context unavailable');

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Remove white/light background pixels while preserving ink strokes.
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          if (a === 0) continue;

          if (r > 248 && g > 248 && b > 248) {
            pixels[i + 3] = 0;
          } else if (r > 238 && g > 238 && b > 238) {
            pixels[i + 3] = Math.min(a, 30);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const cleaned = canvas.toDataURL('image/png');
        if (!cancelled) setProcessedDataUrl(cleaned);
      } catch (_) {
        if (!cancelled) setProcessedDataUrl(dataUrl);
      }
    };
    img.onerror = () => {
      if (!cancelled) setProcessedDataUrl(dataUrl);
    };
    img.src = dataUrl;

    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  return processedDataUrl || dataUrl || '';
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
  const isHalfDay = !!formData?.is_half_day;
  const halfStart = formData?.half_day_time_start || '';
  const halfEnd = formData?.half_day_time_end || '';
  const totalnumleave = formData?.total_working_days != null ? String(formData.total_working_days) : '';
  const advancePay = formData?.advance_pay;
  const advancePayDate = formData?.advance_pay_date ? formatDDMMMYYYY(formData.advance_pay_date) : '';
  const remarks = formData?.reason_or_remarks || '';

  const signatureData = normalizeSignatureData(formData?.signature_data);
  const transparentStaffSignatureData = useTransparentSignatureData(signatureData);
  const hasSignature = !!signatureData;
  const staffsigdt = hasSignature ? formatDDMMMYYYY(formData?.created_at || new Date().toISOString().slice(0, 10)) : '';

  const supervisorSignatureData = normalizeSignatureData(formData?.manager_signature_data || formData?.pso_signature_data);
  const transparentSupervisorSignatureData = useTransparentSignatureData(supervisorSignatureData);
  const hasSupervisorSignature = !!supervisorSignatureData;
  const supervisorName = formData?.approved_by_manager_name || formData?.approved_by_pso_name || '';

  const directorSignatureData = normalizeSignatureData(formData?.director_signature_data);
  const transparentDirectorSignatureData = useTransparentSignatureData(directorSignatureData);
  const hasDirectorSignature = !!directorSignatureData;
  const directorName = formData?.approved_by_director_name || '';
  const directorSigDate = hasDirectorSignature ? formatDDMMMYYYY(formData?.updated_at || '') : '';

  const approvedDecision = formData?.status === 'Approved' ? 'yes' : (formData?.status === 'Disapproved' ? 'no' : '');

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
        <p className="pscformtext" id="firstleavedt">
          {isHalfDay && halfStart ? `${firstleavedt} ${halfStart}` : firstleavedt}
        </p>
        <p className="pscformtext" id="lastleavedt">
          {isHalfDay && halfEnd ? `${lastleavedt} ${halfEnd}` : lastleavedt}
        </p>
        <p className="pscformtext" id="totalnumleave">{totalnumleave}</p>
        <p className="pscformtext" id="remarks">{remarks}</p>
        <div id="advance" className="pscformtext form49-advance-wrap">
          {advancePay ? <span className="yes">YES</span> : null}
          {!advancePay && advancePay !== undefined ? <span className="no">NO</span> : null}
        </div>
        <p className="pscformtext" id="advance-pay-date">{advancePayDate}</p>
        <p className="pscformtext" id="staffsig">
          {hasSignature ? (
            <img src={transparentStaffSignatureData} alt="Signature" className="form49-overlay-sig-img" />
          ) : null}
        </p>
        <p className="pscformtext" id="staffsigdt">{staffsigdt}</p>
        <p className="pscformtext" id="supsig">
          {hasSupervisorSignature ? (
            <img src={transparentSupervisorSignatureData} alt="Supervisor signature" className="form49-overlay-sig-img" />
          ) : null}
        </p>
        <p className="pscformtext" id="supname">{supervisorName}</p>
        <p className="pscformtext" id="supsigdt" />
        <div id="leave-approved" className="pscformtext form49-approval-wrap">
          {approvedDecision === 'yes' ? <span className="yes" /> : null}
          {approvedDecision === 'no' ? <span className="no" /> : null}
        </div>
        <p className="pscformtext" id="directorname">{directorName}</p>
        <p className="pscformtext" id="directorsig">
          {hasDirectorSignature ? (
            <img src={transparentDirectorSignatureData} alt="Director signature" className="form49-overlay-sig-img" />
          ) : null}
        </p>
        <p className="pscformtext" id="directorsigdt">{directorSigDate}</p>
      </div>
    </div>
  );
}
