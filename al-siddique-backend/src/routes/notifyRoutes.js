require('dotenv').config()
const express = require('express')
const router = express.Router()
const { protect, requireRoles } = require('../middleware/auth')
const { pool } = require('../config/database')
const { currentSchoolId } = require('../middleware/tenant')
const {
  getTwilioConfigForSchool,
  buildTwilioClient,
} = require('../services/twilioSettings')

const canSendNotifications = requireRoles('super_admin', 'admin', 'principal', 'accountant')

function isScopedPortalRole(role) {
  return ['parent', 'student'].includes(String(role || '').toLowerCase())
}

function scopedNotificationPredicate(role, startIndex = 1) {
  const normalizedRole = String(role || '').toLowerCase()
  if (String(role || '').toLowerCase() === 'parent') {
    return {
      clause: `AND n.recipient_role = $${startIndex}
        AND EXISTS (
          SELECT 1
          FROM students s
          WHERE s.school_id = n.school_id
            AND s.id = n.student_id
            AND s.parent_user_id = $${startIndex + 1}
        )`,
      needsUserId: true,
    }
  }

  if (String(role || '').toLowerCase() === 'student') {
    return {
      clause: `AND n.recipient_role = $${startIndex}
        AND EXISTS (
          SELECT 1
          FROM students s
          WHERE s.school_id = n.school_id
            AND s.id = n.student_id
            AND s.student_user_id = $${startIndex + 1}
        )`,
      needsUserId: true,
    }
  }

  if (['super_admin', 'admin', 'principal', 'accountant'].includes(normalizedRole)) {
    return {
      clause: '',
      needsUserId: false,
    }
  }

  return {
    clause: `AND (n.recipient_role = $${startIndex} OR n.recipient_role IS NULL)`,
    needsUserId: false,
  }
}

function formatPhone(phone) {
  return `+92${String(phone).replace(/^0/, '').replace(/\D/g, '')}`
}

async function ensureNotificationColumns() {
  await pool.query(`
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(20);
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
    CREATE INDEX IF NOT EXISTS idx_notification_log_school_role_sent ON notification_log(school_id, recipient_role, sent_at DESC);
  `).catch(() => {})
}

async function sendOne(phone, message, channel, twilioConfig, twilioClient) {
  if (!twilioClient) throw new Error('Twilio not configured')
  const base = formatPhone(phone)
  const smsFrom = twilioConfig.smsFrom
  const waFrom = twilioConfig.waFrom

  if (channel === 'auto') {
    if (waFrom) {
      try {
        const msg = await twilioClient.messages.create({
          to: `whatsapp:${base}`,
          from: waFrom,
          body: message,
        })
        return { channel: 'whatsapp', sid: msg.sid }
      } catch (_) {
        // fall through to SMS
      }
    }

    if (!smsFrom) throw new Error('TWILIO_SMS_FROM not set')
    const msg = await twilioClient.messages.create({ to: base, from: smsFrom, body: message })
    return { channel: 'sms', sid: msg.sid }
  }

  if (channel === 'whatsapp') {
    if (!waFrom) throw new Error('TWILIO_WA_FROM not set')
    const msg = await twilioClient.messages.create({
      to: `whatsapp:${base}`,
      from: waFrom,
      body: message,
    })
    return { channel: 'whatsapp', sid: msg.sid }
  }

  if (!smsFrom) throw new Error('TWILIO_SMS_FROM not set')
  const msg = await twilioClient.messages.create({ to: base, from: smsFrom, body: message })
  return { channel: 'sms', sid: msg.sid }
}

// POST /api/notify/single
router.post('/single', protect, canSendNotifications, async (req, res) => {
  try {
    const { phone, message, channel = 'auto' } = req.body
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Phone aur message zaroori hai' })
    }

    const schoolId = currentSchoolId(req)
    const twilioConfig = await getTwilioConfigForSchool(schoolId)
    const twilioClient = buildTwilioClient(twilioConfig)
    const result = await sendOne(phone, message, channel, twilioConfig, twilioClient)
    res.json({ success: true, message: 'Message send ho gaya', ...result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/notify/bulk
router.post('/bulk', protect, canSendNotifications, async (req, res) => {
  try {
    const { phones, message, channel = 'auto' } = req.body
    if (!Array.isArray(phones) || !message) {
      return res.status(400).json({ success: false, message: 'phones (array) aur message zaroori hain' })
    }

    const schoolId = currentSchoolId(req)
    const twilioConfig = await getTwilioConfigForSchool(schoolId)
    const twilioClient = buildTwilioClient(twilioConfig)

    const results = []
    for (const phone of phones) {
      try {
        const result = await sendOne(phone, message, channel, twilioConfig, twilioClient)
        results.push({ phone, status: 'sent', ...result })
      } catch (e) {
        results.push({ phone, status: 'failed', error: e.message })
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status === 'failed').length
    res.json({ success: true, sent, failed, results })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/notify/inbox
router.get('/inbox', protect, async (req, res) => {
  try {
    await ensureNotificationColumns()
    const schoolId = currentSchoolId(req)
    const recipientRole = req.user?.role || null
    const scope = scopedNotificationPredicate(recipientRole, 2)
    const params = [schoolId, recipientRole]
    if (scope.needsUserId) params.push(req.user?.id || null)
    const result = await pool.query(`
      SELECT id, school_id, student_id, recipient_role, title, type, message, metadata, read_at, status, sent_at
      FROM notification_log n
      WHERE n.school_id = $1
        ${scope.clause}
      ORDER BY COALESCE(read_at, sent_at) DESC
      LIMIT 50
    `, params)

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        unread: !row.read_at,
        time: row.sent_at ? new Date(row.sent_at).toLocaleString('en-PK') : '',
      })),
    })
  } catch (err) {
    console.error('Notification inbox error:', err)
    res.status(500).json({ success: false, message: 'Failed to load notifications.' })
  }
})

// PUT /api/notify/read-all
router.put('/read-all', protect, async (req, res) => {
  try {
    await ensureNotificationColumns()
    const schoolId = currentSchoolId(req)
    const recipientRole = req.user?.role || null
    const scope = scopedNotificationPredicate(recipientRole, 2)
    const params = [schoolId, recipientRole]
    if (scope.needsUserId) params.push(req.user?.id || null)
    await pool.query(`
      UPDATE notification_log n
      SET read_at = NOW()
      WHERE n.school_id = $1
        ${scope.clause}
        AND n.read_at IS NULL
    `, params)

    res.json({ success: true, message: 'Notifications marked as read.' })
  } catch (err) {
    console.error('Notification read-all error:', err)
    res.status(500).json({ success: false, message: 'Failed to update notifications.' })
  }
})

module.exports = router
