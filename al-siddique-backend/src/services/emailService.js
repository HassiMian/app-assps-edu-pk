// src/services/emailService.js
// SMTP email service with fallback logging to prevent execution crashes

const fs = require('fs')
const path = require('path')

let nodemailer = null
try {
  nodemailer = require('nodemailer')
} catch (err) {
  console.warn('⚠️ nodemailer is not installed. Outbound emails will use local logging fallback.')
}

// Log directory configuration
const logsDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}
const fallbackLogPath = path.join(logsDir, 'email_fallbacks.log')

/**
 * Appends email content to local log file
 */
function logEmailFallback(to, subject, text, html) {
  const timestamp = new Date().toISOString()
  const logEntry = `
========================================
[EMAIL SEND FALLBACK] - ${timestamp}
To: ${to}
Subject: ${subject}
----------------------------------------
Text Body:
${text}
----------------------------------------
HTML Body:
${html}
========================================
\n`

  fs.appendFileSync(fallbackLogPath, logEntry, 'utf8')
  console.log(`✉️ Email fallback logged to logs/email_fallbacks.log [Subject: "${subject}" to "${to}"]`)
}

/**
 * Sends email using SMTP if configured, or falls back to file logging
 */
async function sendEmail({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || 'APEX Support <support@apex.com>'

  const isSmtpConfigured = host && user && pass

  if (!nodemailer || !isSmtpConfigured) {
    // Falls back gracefully
    logEmailFallback(to, subject, text, html)
    return { success: true, method: 'fallback_logger' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    })

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    })

    console.log(`✉️ Email sent successfully via SMTP: ${info.messageId}`)
    return { success: true, method: 'smtp', messageId: info.messageId }
  } catch (err) {
    console.error('❌ SMTP send failed. Falling back to log file. Error:', err.message)
    logEmailFallback(to, subject, text, html)
    return { success: true, method: 'fallback_logger_after_error', error: err.message }
  }
}

/**
 * Sends approval/activation email
 */
async function sendActivationEmail({ ownerName, schoolName, loginUrl, email, tempPassword }) {
  const subject = 'Your APEX School Account Has Been Activated'
  
  const text = `Dear ${ownerName},

Your APEX subscription has been approved and your school account is now active.

School: ${schoolName}
Login URL: ${loginUrl}
Email: ${email}
Temporary Password: ${tempPassword}

Please login and change your password immediately.

If you need any immediate assistance, feel free to contact us via WhatsApp Support.

Regards,
APEX Support Team`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
      <h2 style="color: #0B2C4D; border-bottom: 2px solid #C8991A; padding-bottom: 10px;">APEX Education Gateway</h2>
      <p>Dear <strong>${ownerName}</strong>,</p>
      <p>Your APEX subscription has been approved and your school account is now active.</p>
      <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>School:</strong> ${schoolName}</p>
        <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #C8991A; text-decoration: none; font-weight: bold;">${loginUrl}</a></p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${tempPassword}</code></p>
      </div>
      <p style="color: #475569; font-size: 14px;">Please login and change your temporary password immediately after your first sign in.</p>
      <p style="margin-top: 25px;">Regards,<br><strong>APEX Support Team</strong></p>
    </div>
  `

  return sendEmail({ to: email, subject, text, html })
}

/**
 * Sends rejection email
 */
async function sendRejectionEmail({ ownerName, schoolName, email, reason }) {
  const subject = 'APEX School Subscription Request Status'
  
  const text = `Dear ${ownerName},

Thank you for your interest in APEX Education Gateway.

We have reviewed your onboarding request for ${schoolName} and unfortunately, we cannot approve it at this time.

Reason:
${reason || 'Payment verification failed or incomplete transaction details.'}

If you believe this is an error or wish to submit a new payment screenshot, please contact APEX Support.

Regards,
APEX Support Team`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
      <h2 style="color: #0B2C4D; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">APEX Education Gateway</h2>
      <p>Dear <strong>${ownerName}</strong>,</p>
      <p>Thank you for your interest in APEX Education Gateway.</p>
      <p>We have reviewed your onboarding request for <strong>${schoolName}</strong> and unfortunately, we cannot approve it at this time.</p>
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fca5a5; margin: 20px 0; color: #991b1b;">
        <p style="margin: 5px 0;"><strong>Rejection Reason:</strong></p>
        <p style="margin: 5px 0; font-style: italic;">${reason || 'Payment verification failed or incomplete transaction details.'}</p>
      </div>
      <p style="color: #475569; font-size: 14px;">If you believe this is an error or wish to submit a new payment proof, please contact APEX support.</p>
      <p style="margin-top: 25px;">Regards,<br><strong>APEX Support Team</strong></p>
    </div>
  `

  return sendEmail({ to: email, subject, text, html })
}

module.exports = {
  sendEmail,
  sendActivationEmail,
  sendRejectionEmail
}
