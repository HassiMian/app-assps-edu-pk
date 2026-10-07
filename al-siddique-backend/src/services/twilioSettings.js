const twilio = require('twilio')
const { pool } = require('../config/database')

function normalizeWhatsAppFrom(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('whatsapp:')) return raw
  return `whatsapp:${raw}`
}

function normalizeSmsFrom(value) {
  return String(value || '').trim().replace(/^whatsapp:/i, '')
}

function normalizeTwilioConfig(raw = {}, fallback = process.env) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    accountSid: String(source.account_sid ?? source.accountSid ?? fallback.TWILIO_ACCOUNT_SID ?? '').trim(),
    authToken: String(source.auth_token ?? source.authToken ?? fallback.TWILIO_AUTH_TOKEN ?? '').trim(),
    smsFrom: normalizeSmsFrom(source.sms_from ?? source.smsFrom ?? fallback.TWILIO_SMS_FROM ?? ''),
    waFrom: normalizeWhatsAppFrom(source.wa_from ?? source.waFrom ?? fallback.TWILIO_WA_FROM ?? ''),
    consoleEmail: String(source.console_email ?? source.consoleEmail ?? source.account_email ?? source.accountEmail ?? '').trim(),
    enabled: source.enabled !== false,
  }
}

function maskToken(token) {
  const value = String(token || '').trim()
  if (!value) return ''
  if (value.length <= 8) return '********'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function maskTwilioConfig(raw = {}) {
  const cfg = normalizeTwilioConfig(raw)
  return {
    ...cfg,
    authToken: '',
    authTokenMasked: maskToken(cfg.authToken),
    hasAuthToken: Boolean(cfg.authToken),
  }
}

function buildTwilioClient(config = {}) {
  const cfg = normalizeTwilioConfig(config)
  if (!cfg.accountSid || !cfg.authToken) return null
  try {
    return twilio(cfg.accountSid, cfg.authToken)
  } catch {
    return null
  }
}

async function getTwilioConfigForSchool(schoolId = 1) {
  const fallback = normalizeTwilioConfig({}, process.env)
  try {
    const result = await pool.query(
      'SELECT twilio_config FROM settings WHERE school_id = $1 LIMIT 1',
      [schoolId]
    )
    const dbConfig = result.rows[0]?.twilio_config || {}
    return {
      ...fallback,
      ...normalizeTwilioConfig(dbConfig, process.env),
      source: result.rows[0]?.twilio_config ? 'database' : 'env',
    }
  } catch {
    return {
      ...fallback,
      source: 'env',
    }
  }
}

async function probeTwilioConfig(config = {}) {
  const cfg = normalizeTwilioConfig(config)
  if (!cfg.accountSid || !cfg.authToken) {
    return {
      ok: false,
      message: 'Twilio account SID or auth token is missing.',
      config: maskTwilioConfig(cfg),
    }
  }

  const client = buildTwilioClient(cfg)
  if (!client) {
    return {
      ok: false,
      message: 'Twilio client could not be initialized.',
      config: maskTwilioConfig(cfg),
    }
  }

  try {
    const account = await client.api.v2010.accounts(cfg.accountSid).fetch()
    const numbers = await client.incomingPhoneNumbers.list({ limit: 20 })
    return {
      ok: true,
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
      },
      senders: {
        smsFrom: cfg.smsFrom || '',
        waFrom: cfg.waFrom || '',
        ownedNumbers: numbers.map(n => ({
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          smsEnabled: Boolean(n.capabilities?.sms),
          voiceEnabled: Boolean(n.capabilities?.voice),
        })),
      },
      config: maskTwilioConfig(cfg),
    }
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'Unable to verify Twilio account.',
      config: maskTwilioConfig(cfg),
    }
  }
}

module.exports = {
  normalizeTwilioConfig,
  maskTwilioConfig,
  buildTwilioClient,
  getTwilioConfigForSchool,
  probeTwilioConfig,
}
