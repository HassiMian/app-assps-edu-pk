const express = require('express')
const crypto = require('crypto')
const { query } = require('../config/database')
const jarvisCore = require('../services/whatsapp/jarvisCognitiveCore')
const { WhatsAppRouter } = require('../services/whatsapp/whatsappRouter')
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
  if (!eventId) return true
  try {
    const res = await query(
      `INSERT INTO whatsapp_inbound_events
         (event_id, event_type, sender_id, recipient_id, payload, signature_valid, status)
       VALUES ($1, $2, $3, $4, $5, true, 'processed')
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id;`,
      [eventId, eventType, senderId || null, recipientId || null, JSON.stringify(payload || {})]
    )
    return (res.rowCount || 0) > 0
  } catch (err) {
    console.error('[WhatsApp Webhook Idempotency Error]', err.message)
    return true
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
  const configuredVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || 'jarvis_assps_meta_webhook_verify_2026'

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
  const isInternalTest = req.headers['x-internal-test'] === 'apexos_internal'

  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8')

  // Enforce Signature Verification unless explicitly flagged internal canary
  if (!isInternalTest) {
    const sigResult = validateSignature(rawBody, signature, appSecret)
    if (!sigResult.ok) {
      console.warn(`[WhatsApp Webhook Security] Rejected: ${sigResult.reason}`)
      return res.status(403).json({ success: false, error: sigResult.reason })
    }
  }

  const payload = req.body
  if (!payload || payload.object !== 'whatsapp_business_account') {
    return res.status(200).json({ success: true, message: 'Ignored' })
  }

  // Immediately respond HTTP 200 to Meta so webhook connection is instantaneous
  res.status(200).json({ success: true, received: true })

  const entries = Array.isArray(payload.entry) ? payload.entry : []
  for (const entry of entries) {
    const changes = entry.changes?.[0]?.value
    if (!changes) continue

    // Handle Inbound Messages
    if (Array.isArray(changes.messages)) {
      for (const msg of changes.messages) {
        const msgId = msg.id
        const from = msg.from

        const isNew = await recordIdempotentEvent(msgId, 'message', from, null, msg)
        if (!isNew) {
          console.log(`[WhatsApp Webhook] Duplicate ${msgId} dropped.`)
          continue
        }

        const text = msg.text?.body || msg.interactive?.button_reply?.title || msg.image?.caption || msg.document?.caption || ''
        console.log(`[WhatsApp Webhook Inbound] ${msgId} from +${from}: "${text.slice(0, 80)}"`)

        // 1. Instant Blue Tick (<100ms)
        markMessageAsRead(msgId)

        // 2. Authoritative JARVIS 5.0 Cognitive LLM Execution & Outbound Dispatch
        if (text) {
          jarvisCore.processMessage(from, text)
            .then(res => {
              const replyText = typeof res === 'object' && res?.reply ? res.reply : (typeof res === 'string' ? res : '')
              if (replyText) {
                return sendWhatsAppMessage(from, replyText)
              }
            })
            .catch(err => {
              console.error('[JARVIS Core Execution Error]', err.message)
              // Graceful fallback to legacy router
              return whatsappRouter.processMessage(from, text)
                .then(result => {
                  if (result && result.reply) {
                    return sendWhatsAppMessage(from, result.reply)
                  }
                })
            })
            .catch(fallbackErr => {
              console.error('[WhatsApp Router Fallback Error]', fallbackErr.message)
            })
        }
      }
    }

    // Handle Delivery Status Updates
    if (Array.isArray(changes.statuses)) {
      for (const st of changes.statuses) {
        const statusEventId = `status:${st.id}:${st.status}`
        await recordIdempotentEvent(statusEventId, 'status', null, st.recipient_id, st)
      }
    }
  }
})

// ─── 3. POST /api/whatsapp/chat (Direct Cognitive API) ──────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { from, text } = req.body
    if (!from || !text) {
      return res.status(400).json({ success: false, error: 'Missing from or text' })
    }
    const result = await jarvisCore.processMessage(from, text)
    const reply = typeof result === 'object' && result?.reply ? result.reply : result
    return res.status(200).json({ success: true, from, text, reply, details: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ─── 4. GET /api/whatsapp/status ───────────────────────────────────────────
router.get('/status', (req, res) => {
  const telemetry = missionManager.getTelemetry()
  return res.status(200).json({
    success: true,
    service: 'Al Siddique Scholars Smart AI Gateway — JARVIS 5.0',
    version: '5.0.0',
    intelligence: 'AUTONOMOUS_COGNITIVE_LLM_AGENT',
    engines: {
      primary: 'Gemini 2.5 Flash (Function Calling)',
      secondary: 'DeepSeek V4 Pro (OpenAI Tools)',
      tertiary: 'Deterministic SQL Fallback'
    },
    mode: 'DIRECT_DATABASE_AUTHORITATIVE',
    status: 'ONLINE',
    blueTickInstant: true,
    telemetry,
    time: new Date().toISOString()
  })
})

// ─── 5. GET /api/whatsapp/events ───────────────────────────────────────────
router.get('/events', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const result = await query(
      `SELECT id, event_id, event_type, sender_id, status, created_at
       FROM whatsapp_inbound_events
       ORDER BY id DESC
       LIMIT $1;`,
      [limit]
    )
    return res.status(200).json({ success: true, count: result.rowCount, events: result.rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
