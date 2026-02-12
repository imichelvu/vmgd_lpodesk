/**
 * Test SMTP settings from backend/.env
 * Usage: node src/scripts/testSmtp.js [recipient@example.com]
 */
import '../loadEnv.js';
import nodemailer from 'nodemailer';

const toEmail = process.argv[2] || process.env.SMTP_TEST_TO || null;

function main() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromAddr = process.env.NOTIFICATION_FROM || 'leave@vmgd.gov.vu';
  const fromName = process.env.NOTIFICATION_NAME;
  const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr;

  console.log('SMTP settings:');
  console.log('  SMTP_HOST:', host || '(not set)');
  console.log('  SMTP_PORT:', process.env.SMTP_PORT || '587');
  console.log('  SMTP_USER:', user ? `${user.slice(0, 3)}***` : '(not set)');
  console.log('  SMTP_PASS:', pass ? '***' : '(not set)');
  console.log('  NOTIFICATION_FROM:', fromAddr);
  console.log('  NOTIFICATION_NAME:', fromName || '(not set)');
  console.log('  From header:', from);
  console.log('  To (test recipient):', toEmail || '(not set - provide as arg or SMTP_TEST_TO)');
  console.log('');

  if (!host) {
    console.error('ERROR: SMTP_HOST is not set in .env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  (async () => {
    try {
      console.log('Verifying SMTP connection...');
      await transporter.verify();
      console.log('OK SMTP connection verified.');
    } catch (err) {
      console.error('ERROR verifying SMTP:', err.message);
      if (err.code) console.error('  Code:', err.code);
      process.exit(1);
    }

    if (!toEmail) {
      console.log('No recipient given. Set SMTP_TEST_TO in .env or run: node src/scripts/testSmtp.js your@email.com');
      process.exit(0);
    }

    try {
      console.log('Sending test email to', toEmail, '...');
      const info = await transporter.sendMail({
        from: from,
        to: toEmail,
        subject: 'VMGD Leave System – SMTP test',
        text: 'This is a test email from the VMGD Leave backend. If you received this, SMTP is working.',
        html: '<p>This is a test email from the <strong>VMGD Leave</strong> backend.</p><p>If you received this, SMTP is working.</p>',
      });
      console.log('OK Test email sent. Message ID:', info.messageId);
      process.exit(0);
    } catch (err) {
      console.error('ERROR sending test email:', err.message);
      if (err.response) console.error('  Response:', err.response);
      process.exit(1);
    }
  })();
}

main();
