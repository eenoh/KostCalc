import nodemailer from 'nodemailer';

/**
 * Mailer configuration
 * - In dev: uses MailDev (localhost:1025)
 * - In prod: uses real SMTP credentials from environment variables
 */
const isProd = process.env.NODE_ENV === 'production';

/**
 * Create transporter
 * You can later replace this with your real SMTP provider (e.g., Gmail, SendGrid)
 */
export const transporter = isProd
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false, // MailDev / MailHog has no TLS
    });

/**
 * Simple helper for sending emails
 * @param {object} options
 * @param {string} options.to - recipient email
 * @param {string} options.subject - email subject
 * @param {string} options.text - plain text version
 * @param {string} [options.html] - HTML version (optional)
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || !text) {
    throw new Error('Missing required email parameters');
  }

  try {
    const info = await transporter.sendMail({
      from: '"KostCalc" <no-reply@kostcalc.local>',
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    console.log(`📧 Email sent: ${info.messageId}`);
    if (!isProd) console.log('📬 View it in MailDev → http://localhost:1080');
    return info;
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    throw err;
  }
}
