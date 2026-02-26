import nodemailer from 'nodemailer';
import pool from '../db/pool.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
  return transporter;
}

/** Base URL of the leave app (e.g. https://leave.vmgd.gov.vu) for links in emails. */
function getAppUrl() {
  const url = process.env.APP_URL || process.env.FRONTEND_URL || '';
  return url.replace(/\/$/, '');
}

/** Escape for HTML to avoid XSS and broken layout. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a professional HTML email for leave notifications.
 * @param {{ title: string, bodyText: string, viewUrl: string|null, appName: string }}
 */
function buildNotificationEmailHtml({ title, bodyText, viewUrl, appName }) {
  const safeBody = escapeHtml(bodyText).replace(/\n/g, '<br>');
  const safeTitle = escapeHtml(title);
  const safeAppName = escapeHtml(appName);

  const headerBg = '#1e3a5f';
  const accent = '#2563eb';
  const textColor = '#374151';
  const mutedColor = '#6b7280';
  const borderColor = '#e5e7eb';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;font-size:15px;line-height:1.5;color:${textColor};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:${headerBg};color:#ffffff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;font-weight:600;letter-spacing:0.02em;">${safeAppName}</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Leave application notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:${textColor};">${safeTitle}</h2>
              <p style="margin:0 0 24px;color:${textColor};font-size:15px;">${safeBody}</p>
              ${viewUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="padding:8px 0 20px;">
                <a href="${viewUrl}" style="display:inline-block;background:${accent};color:#ffffff !important;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">View &amp; take action</a>
              </td></tr>
              <tr><td style="padding:0 0 8px;font-size:13px;color:${mutedColor};">Or copy this link:</td></tr>
              <tr><td style="font-size:13px;"><a href="${viewUrl}" style="color:${accent};word-break:break-all;">${escapeHtml(viewUrl)}</a></td></tr></table>`
    : `<p style="margin:0;font-size:14px;color:${mutedColor};">Log in to the leave system and open <strong>Approvals</strong> to view this application.</p>`}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid ${borderColor};font-size:12px;color:${mutedColor};">
              This is an automated message from ${safeAppName}. Please do not reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send password reset email with a link to the reset page.
 * @param {string} toEmail - Recipient email
 * @param {string} resetLink - Full URL to reset password (e.g. https://app.example.com/reset-password?token=xxx)
 * @param {string} appName - Application name for the email
 */
export async function sendPasswordResetEmail(toEmail, resetLink, appName = 'Leave Application') {
  const email = (toEmail || '').trim().toLowerCase();
  if (!email) return;
  const safeApp = escapeHtml(appName);
  const safeLink = escapeHtml(resetLink);
  const headerBg = '#1e3a5f';
  const accent = '#2563eb';
  const textColor = '#374151';
  const mutedColor = '#6b7280';
  const borderColor = '#e5e7eb';
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset your password</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;font-size:15px;line-height:1.5;color:${textColor};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:${headerBg};color:#ffffff;padding:20px 24px;"><h1 style="margin:0;font-size:20px;font-weight:600;">${safeApp}</h1><p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Password reset</p></td></tr>
        <tr><td style="padding:28px 24px;">
          <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:${textColor};">Reset your password</h2>
          <p style="margin:0 0 24px;color:${textColor};">You requested a password reset. Click the button below to set a new password. This link expires in 1 hour.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td><a href="${resetLink}" style="display:inline-block;background:${accent};color:#ffffff !important;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reset password</a></td></tr>
          <tr><td style="padding:12px 0 0;font-size:13px;color:${mutedColor};">Or copy this link: <a href="${resetLink}" style="color:${accent};word-break:break-all;">${safeLink}</a></td></tr></table>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid ${borderColor};font-size:12px;color:${mutedColor};">This is an automated message from ${safeApp}. If you did not request this, you can ignore this email.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `Reset your password\n\nYou requested a password reset for ${safeApp}. Open this link in your browser (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can ignore this email.`;
  await sendEmail({ toEmail: email, subject: `Reset your password – ${safeApp}`, text, html });
}

/**
 * Send email to the next person in the workflow chain.
 * @param {Object} options - { toEmail, subject, text, html }
 */
export async function sendEmail({ toEmail, subject, text, html }) {
  const email = (toEmail || '').trim().toLowerCase();
  if (!email) {
    console.warn('Email not sent: no recipient address');
    return;
  }
  const transport = getTransporter();
  if (!transport) {
    console.warn('SMTP not configured (set SMTP_HOST in .env); email not sent to', email);
    return;
  }
  const fromAddr = process.env.NOTIFICATION_FROM || 'leave@vmgd.gov.vu';
  const fromName = process.env.NOTIFICATION_NAME;
  const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr;
  try {
    await transport.sendMail({
      from,
      to: email,
      subject,
      text: text || undefined,
      html: html || undefined,
    });
    console.log('Email sent to', email, '|', subject);
  } catch (err) {
    console.error('Failed to send email to', email, err.message);
  }
}

/**
 * Create in-app notification and send email when sendEmailTo is set.
 * If leaveApplicationId is set and APP_URL/FRONTEND_URL is configured, appends a "View application" link to the email.
 * @param {Object} options - { userId, leaveApplicationId, title, body, sendEmailTo }
 */
export async function notifyUser({ userId, leaveApplicationId, title, body, sendEmailTo = null }) {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO notifications (user_id, leave_application_id, title, body) VALUES ($1, $2, $3, $4)',
      [userId, leaveApplicationId || null, title, body || null]
    );
    if (sendEmailTo) {
      const baseUrl = getAppUrl();
      const viewUrl = baseUrl && leaveApplicationId ? `${baseUrl}/application/${leaveApplicationId}` : null;
      const bodyText = body || '';
      const appName = process.env.NOTIFICATION_NAME || 'Leave System';
      const text = viewUrl
        ? `${bodyText}\n\n---\nView and take action:\n${viewUrl}\n`
        : `${bodyText}\n\nLog in to the leave system and open Approvals to view this application.`;
      const html = buildNotificationEmailHtml({ title, bodyText, viewUrl, appName });
      if (!viewUrl && leaveApplicationId) {
        console.warn('APP_URL (or FRONTEND_URL) not set in .env – add it so notification emails include a direct link to the application.');
      }
      await sendEmail({
        toEmail: sendEmailTo,
        subject: title,
        text,
        html,
      });
    }
  } finally {
    client.release();
  }
}

/**
 * Get all people who can approve at Pending_PSO (PSO + division Manager), deduplicated.
 * Used when submitting a new application so both PSO and Manager get the email.
 * Returns array of { userId, email } (email may be null if user has no email in DB).
 */
export async function getPendingPsoApprovers(applicationId) {
  const { rows } = await pool.query(
    `SELECT la.applicant_id, u.division_id, u.reports_to_id
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     WHERE la.id = $1`,
    [applicationId]
  );
  if (!rows.length) return [];
  const { applicant_id: applicantId, division_id: divisionId, reports_to_id: reportsToId } = rows[0];
  const seen = new Set();
  const approvers = [];

  const supervisor = await getSupervisorOrDelegate(applicantId);
  if (supervisor && !seen.has(supervisor.userId)) {
    seen.add(supervisor.userId);
    approvers.push(supervisor);
  }

  if (divisionId) {
    const manager = await getDivisionManager(divisionId);
    if (manager && !seen.has(manager.userId)) {
      seen.add(manager.userId);
      approvers.push(manager);
    }
  }

  return approvers;
}

/**
 * Get the next approver in the workflow: PSO -> Manager -> Director.
 * Returns { userId, email } or null.
 */
export async function getNextApprover(applicationId) {
  const { rows } = await pool.query(
    `SELECT la.status, la.applicant_id, u.division_id, u.reports_to_id
     FROM leave_applications la
     JOIN users u ON u.id = la.applicant_id
     WHERE la.id = $1`,
    [applicationId]
  );
  if (!rows.length) return null;
  const app = rows[0];
  const status = app.status;

  if (status === 'Pending_PSO') {
    const next = await getSupervisorOrDelegate(app.applicant_id);
    if (next) return next;
    if (app.division_id) return getDivisionManager(app.division_id);
    return null;
  }
  if (status === 'Pending_Manager') {
    return getDivisionManager(app.division_id);
  }
  if (status === 'Pending_Director') {
    return getDirector();
  }
  return null;
}

async function getSupervisorOrDelegate(applicantId) {
  const { rows } = await pool.query(
    'SELECT reports_to_id, division_id FROM users WHERE id = $1',
    [applicantId]
  );
  const reportsToId = rows[0]?.reports_to_id;
  if (!reportsToId) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { rows: del } = await pool.query(
    `SELECT d.delegatee_id FROM delegations d
     WHERE d.delegator_id = $1 AND d.is_active = true AND $2::date BETWEEN d.start_date AND d.end_date`,
    [reportsToId, today]
  );
  const notifyUserId = del.length ? del[0].delegatee_id : reportsToId;
  const { rows: u } = await pool.query('SELECT id, email FROM users WHERE id = $1', [notifyUserId]);
  return u[0] ? { userId: u[0].id, email: u[0].email } : null;
}

async function getDivisionManager(divisionId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     WHERE u.division_id = $1 AND ur.role_id = 3
     LIMIT 1`,
    [divisionId]
  );
  return rows[0] ? { userId: rows[0].id, email: rows[0].email } : null;
}

async function getDirector() {
  const { rows } = await pool.query(
    `SELECT u.id, u.email FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     WHERE ur.role_id = 4
     LIMIT 1`
  );
  return rows[0] ? { userId: rows[0].id, email: rows[0].email } : null;
}

/**
 * Notify the applicant (in-app + email) e.g. when leave is approved or disapproved.
 * @param {number} applicationId
 * @param {string} title
 * @param {string} body
 */
export async function notifyApplicant(applicationId, title, body) {
  const { rows } = await pool.query(
    'SELECT id, email FROM users WHERE id = (SELECT applicant_id FROM leave_applications WHERE id = $1)',
    [applicationId]
  );
  if (!rows.length) return;
  const { id: userId, email } = rows[0];
  await notifyUser({
    userId,
    leaveApplicationId: applicationId,
    title,
    body,
    sendEmailTo: email || null,
  });
}
