const express = require('express')
const crypto = require('crypto')
const { query, tenantContext } = require('../config/database')
const jarvisCore = require('../services/whatsapp/jarvisCognitiveCore')
const { WhatsAppRouter } = require('../services/whatsapp/whatsappRouter')
const { requireConfiguredSchoolId } = require('../services/whatsapp/schoolChannelGuard.cjs')
const { missionManager } = require('../services/whatsapp/missionManager')

const router = express.Router()

const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
const VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0'
const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

// Initialize legacy fallback router
const whatsappRouter = new WhatsAppRouter(query, GEMINI_KEY)

/**
 * Instant Blue Tick / Mark Message as Read (<100ms)
 */
async function markMessageAsRead(messageId) {
  if (!TOKEN || !PHONE_ID || !messageId) return
  try {
    fetch(`https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    }).catch(() => {})
  } catch {}
}

/**
 * Instant Outbound Dispatch via Meta Graph API
 */
async function sendWhatsAppMessage(to, text) {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[WhatsApp Outbound] Missing Token or Phone ID')
    return null
  }

  let cleanTo = String(to).replace(/\D/g, '')
  if (cleanTo.startsWith('03') && cleanTo.length === 11) {
    cleanTo = '92' + cleanTo.slice(1)
  }

  // Prevent duplicate outbound messages
  if (missionManager.isDuplicateResponse(cleanTo, text)) {
    console.log(`[WhatsApp Outbound] Duplicate reply suppressed for +${cleanTo}`)
    return null
  }

  const url = `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'text',
        text: {
          preview_url: false,
          body: String(text || '').slice(0, 4096)
        }
      })
    })
    const data = await res.json()
    if (!res.ok) {
      console.error(`[WhatsApp Outbound Error] Status ${res.status}: ${JSON.stringify(data.error || data)}`)
    } else {
      console.log(`[WhatsApp Outbound Success] Sent to +${cleanTo} (wamid: ${data.messages?.[0]?.id})`)
    }
    return data
  } catch (err) {
    console.error('[WhatsApp Outbound Network Error]', err.message)
    return null
  }
}


/**
 * Durable PostgreSQL Idempotency Layer
 */
async function recordIdempotentEvent(eventId, eventType, senderId, recipientId, payload) {
  if (!eventId) return false
  const schoolId = requireConfiguredSchoolId()
  try {
    const res = await tenantContext.run(
      { rlsEnabled: true, isSuperAdmin: false, tenantId: schoolId },
      () => query(
        `INSERT INTO whatsapp_inbound_events
           (school_id, event_id, event_type, sender_id, recipient_id, payload, signature_valid, status)
         VALUES ($1, $2, $3, $4, $5, $6, true, 'processed')
         ON CONFLICT (event_id) DO NOTHING
         RETURNING id;`,
        [schoolId, eventId, eventType, senderId || null, recipientId || null, JSON.stringify(payload || {})]
      )
    )
    return (res.rowCount || 0) > 0
  } catch (err) {
    console.error('[WhatsApp Webhook Idempotency Error]', err.message)
    throw err
  }
}

/**
 * Validate Meta Webhook Signature (HMAC SHA-256)
 */
function validateSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) {
    return { ok: false, reason: 'APP_SECRET_NOT_CONFIGURED' }
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return { ok: false, reason: 'MISSING_OR_MALFORMED_SIGNATURE_HEADER' }
  }
  try {
    const expectedSig = signatureHeader.slice(7)
    const hmac = crypto.createHmac('sha256', appSecret)
    const calculatedSig = hmac.update(rawBody).digest('hex')

    const expectedBuf = Buffer.from(expectedSig, 'hex')
    const calculatedBuf = Buffer.from(calculatedSig, 'hex')

    if (expectedBuf.length !== calculatedBuf.length) {
      return { ok: false, reason: 'SIGNATURE_LENGTH_MISMATCH' }
    }
    const match = crypto.timingSafeEqual(expectedBuf, calculatedBuf)
    return { ok: match, reason: match ? 'VALID' : 'SIGNATURE_MISMATCH' }
  } catch (err) {
    return { ok: false, reason: `CRYPTO_ERROR: ${err.message}` }
  }
}

// ─── 1. GET /api/whatsapp/webhook (Meta Verification Challenge) ─────────────
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'] || req.query['mode']
  const token = req.query['hub.verify_token'] || req.query['verify_token']
  const challenge = req.query['hub.challenge'] || req.query['challenge']
  const configuredVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || ''

  if (!configuredVerifyToken) {
    return res.status(503).json({ success: false, error: 'Webhook verification is not configured.' })
  }

  if (mode === 'subscribe' && token === configuredVerifyToken) {
    return res.status(200).send(String(challenge || ''))
  }

  return res.status(403).json({
    success: false,
    error: 'Webhook verification token mismatch or invalid mode'
  })
})

// ─── 2. POST /api/whatsapp/webhook (Meta Inbound Event Stream) ──────────────
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256']
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_CLOUD_APP_SECRET || ''

  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8')
  const sigResult = validateSignature(rawBody, signature, appSecret)
  if (!sigResult.ok) {
    console.warn(`[WhatsApp Webhook Security] Rejected: ${sigResult.reason}`)
    const status = sigResult.reason === 'APP_SECRET_NOT_CONFIGURED' ? 503 : 403
    return res.status(status).json({ success: false, error: sigResult.reason })
  }

  const payload = req.body
  if (!payload || payload.object !== 'whatsapp_business_account') {
    return res.status(200).json({ success: true, message: 'Ignored' })
  }

  const pendingMessages = []
  try {
    const entries = Array.isArray(payload.entry) ? payload.entry : []
    for (const entry of entries) {
      const changes = entry.changes?.[0]?.value
      if (!changes) continue

      if (Array.isArray(changes.messages)) {
        for (const msg of changes.messages) {
          const msgId = msg.id
          const from = msg.from
          const isNew = await recordIdempotentEvent(msgId, 'message', from, null, msg)
          if (!isNew) {
            console.log(`[WhatsApp Webhook] Duplicate ${msgId} dropped.`)
            continue
          }
          pendingMessages.push({ msgId, from, msg })
        }
      }

      if (Array.isArray(changes.statuses)) {
        for (const st of changes.statuses) {
          const statusEventId = `status:${st.id}:${st.status}`
          await recordIdempotentEvent(statusEventId, 'status', null, st.recipient_id, st)
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Webhook Persistence Error]', err.message)
    return res.status(503).json({ success: false, error: 'Inbound event persistence unavailable.' })
  }

  res.status(200).json({ success: true, received: true })

  for (const { msgId, from, msg } of pendingMessages) {
    const text = msg.text?.body || msg.interactive?.button_reply?.title || msg.image?.caption || msg.document?.caption || ''
    console.log(`[WhatsApp Webhook Inbound] ${msgId} from +${from}: "${text.slice(0, 80)}"`)
    void markMessageAsRead(msgId)

    if (text) {
      jarvisCore.processMessage(from, text)
        .then(result => {
          const replyText = typeof result === 'object' && result?.reply ? result.reply : (typeof result === 'string' ? result : '')
          if (replyText) return sendWhatsAppMessage(from, replyText)
          return null
        })
        .catch(err => {
          console.error('[JARVIS Core Execution Error]', err.message)
          return whatsappRouter.processMessage(from, text)
            .then(result => result?.reply ? sendWhatsAppMessage(from, result.reply) : null)
        })
        .catch(fallbackErr => {
          console.error('[WhatsApp Router Fallback Error]', fallbackErr.message)
        })
    }
  }
})

// ─── 3. Direct cognitive API is disabled in production school runtime ────────
router.post('/chat', (req, res) => {
  return res.status(404).json({ success: false, error: 'Direct WhatsApp chat API is disabled.' })
})

// ─── 4. Minimal public liveness only ────────────────────────────────────────
router.get('/status', (req, res) => {
  return res.status(200).json({
    success: true,
    service: 'ASSPS WhatsApp Gateway',
    status: 'ONLINE',
    time: new Date().toISOString()
  })
})

// ─── 5. Event history is never exposed over public HTTP ─────────────────────
router.get('/events', (req, res) => {
  return res.status(404).json({ success: false, error: 'WhatsApp event history is not exposed over HTTP.' })
})

module.exports = router
