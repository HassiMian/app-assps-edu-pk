const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const { sendEmail } = require('../services/emailService')

test('email fallback logging never claims provider delivery', async () => {
  const previous = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS
  }

  delete process.env.SMTP_HOST
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS

  try {
    const secretMarker = `SENSITIVE-BODY-${Date.now()}-${Math.random()}`
    const result = await sendEmail({
      to: 'delivery-truth@example.test',
      subject: 'Delivery truth test',
      text: `Diagnostic fallback only ${secretMarker}`,
      html: `<p>Diagnostic fallback only ${secretMarker}</p>`
    })

    assert.equal(result.success, false)
    assert.equal(result.delivered, false)
    assert.equal(result.method, 'fallback_logger')
    assert.match(result.error, /SMTP_NOT_CONFIGURED|EMAIL_PROVIDER_UNAVAILABLE/)

    const fallbackLogPath = path.join(__dirname, '../../logs/email_fallbacks.log')
    const logText = fs.readFileSync(fallbackLogPath, 'utf8')
    assert.equal(logText.includes(secretMarker), false, 'fallback logs must never persist email bodies or credentials')
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
