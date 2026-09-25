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
      needsRole: true,
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
      needsRole: true,
      needsUserId: true,
    }
  }

  if (['super_admin', 'admin', 'principal', 'accountant'].includes(normalizedRole)) {
    return {
      clause: '',
      needsRole: false,
      needsUserId: false,
    }
  }

  return {
    clause: `AND (n.recipient_role = $${startIndex} OR n.recipient_role IS NULL)`,
    needsRole: true,
    needsUserId: false,
  }
}

function scopedNotificationParams(schoolId, recipientRole, userId, scope) {
  const params = [schoolId]
  if (scope.needsRole) params.push(recipientRole)
  if (scope.needsUserId) params.push(userId || null)
  return params
}

function formatPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.startsWith('0092')) digits = digits.slice(2)
  if (digits.startsWith('92')) return `+${digits}`
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10 && digits.startsWith('3')) return `+92${digits}`
  if (digits.length === 11 && digits.startsWith('03')) return `+92${digits.slice(1)}`
  return digits ? `+${digits}` : null
}

function safeRecipient(row, extra = {}) {
  const phone = formatPhone(row.parent_whatsapp || row.parent_phone || row.phone)
  return {
    id: row.id,
    student_id: row.student_id || row.id,
    name: row.name || row.student_name,
    class: [row.class, row.section].filter(Boolean).join(' ') || row.class || '',
    section: row.section || null,
    rollNo: row.roll_number || row.gr_number || null,
    phone,
    source: extra.source,
    status: row.status || extra.status || null,
    feeAmount: row.fee_amount || row.amount || row.remaining_balance || null,
    feeMonth: row.fee_month || null,
  }
}

function selectedRecipientRows(rows) {
  return rows.map(row => safeRecipient(row)).filter(row => row.phone)
}

async function loadSourceBackedRecipients(req) {
  const schoolId = currentSchoolId(req)
  const type = String(req.query.type || 'attendance').toLowerCase()
  const today = req.query.date || new Date().toISOString().slice(0, 10)
  const limit = Math.min(Number(req.query.limit || 250) || 250, 500)

  if (type === 'attendance') {
    const result = await pool.query(`
      SELECT s.id, s.id AS student_id, s.name, s.gr_number, s.roll_number, s.class, s.section,
             s.parent_phone, s.parent_whatsapp, a.status
      FROM attendance a
      JOIN students s ON s.id = a.student_id AND s.school_id = a.school_id
      WHERE a.school_id = $1
        AND a.date::date = $2::date
        AND LOWER(a.status) IN ('absent', 'late')
        AND s.is_active = true
      ORDER BY s.class, s.section, s.roll_number, s.name
      LIMIT $3
    `, [schoolId, today, limit])
    return {
      type,
      source: 'attendance',
      filters: { date: today },
      recipients: selectedRecipientRows(result.rows).map(row => ({ ...row, source: 'attendance' })),
    }
  }

  if (type === 'fee') {
    const month = req.query.month || null
    const year = req.query.year ? Number(req.query.year) : null
    const params = [schoolId]
    let sql = `
      SELECT f.id, f.student_id, s.name, s.gr_number, s.roll_number, s.class, s.section,
             s.parent_phone, s.parent_whatsapp, f.status,
             COALESCE(f.remaining_balance, f.gross_total, f.amount, 0) AS remaining_balance,
             CONCAT(f.month, ' ', f.year) AS fee_month
      FROM fee_challans f
      JOIN students s ON s.id = f.student_id AND s.school_id = f.school_id
      WHERE f.school_id = $1
        AND s.is_active = true
        AND LOWER(COALESCE(f.status, 'unpaid')) IN ('unpaid', 'partial', 'overdue')
        AND COALESCE(f.remaining_balance, f.gross_total, f.amount, 0)::numeric > 0
    `
    let i = 2
    if (month) {
      sql += ` AND LOWER(f.month) = LOWER($${i++})`
      params.push(month)
    }
    if (year) {
      sql += ` AND f.year = $${i++}`
      params.push(year)
    }
    sql += ` ORDER BY f.year DESC, f.id DESC, s.class, s.section, s.roll_number, s.name LIMIT $${i}`
    params.push(limit)

    const result = await pool.query(sql, params)
    return {
      type,
      source: 'fee_challans',
      filters: { month, year },
      recipients: selectedRecipientRows(result.rows).map(row => ({ ...row, source: 'fee_challans' })),
    }
  }

  if (type === 'results') {
    const result = await pool.query(`
      SELECT DISTINCT ON (s.id) s.id, s.id AS student_id, s.name, s.gr_number, s.roll_number,
             s.class, s.section, s.parent_phone, s.parent_whatsapp, er.grade
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      JOIN students s ON s.id = er.student_id AND s.school_id = e.school_id
      WHERE s.school_id = $1
        AND s.is_active = true
      ORDER BY s.id, e.created_at DESC
      LIMIT $2
    `, [schoolId, limit])
    return {
      type,
      source: 'exam_results',
      filters: {},
      recipients: selectedRecipientRows(result.rows).map(row => ({ ...row, source: 'exam_results', status: row.status || row.grade })),
    }
  }

  if (type === 'custom') {
    const result = await pool.query(`
      SELECT s.id, s.id AS student_id, s.name, s.gr_number, s.roll_number, s.class, s.section,
             s.parent_phone, s.parent_whatsapp
      FROM students s
      WHERE s.school_id = $1
        AND s.is_active = true
        AND COALESCE(NULLIF(s.parent_whatsapp, ''), NULLIF(s.parent_phone, '')) IS NOT NULL
      ORDER BY s.class, s.section, s.roll_number, s.name
      LIMIT $2
    `, [schoolId, limit])
    return {
      type,
      source: 'students',
      filters: {},
      recipients: selectedRecipientRows(result.rows).map(row => ({ ...row, source: 'students' })),
    }
  }

  return {
    type,
    source: 'unsupported',
    filters: {},
    recipients: [],
    message: 'Unsupported recipient source.',
  }
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
  if (!base) throw new Error('Invalid phone number')
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

// GET /api/notify/recipients
router.get('/recipients', protect, canSendNotifications, async (req, res) => {
  try {
    const payload = await loadSourceBackedRecipients(req)
    res.json({
      success: true,
      ...payload,
      count: payload.recipients.length,
      message: payload.recipients.length
        ? 'Source-backed recipients loaded.'
        : 'No source-backed recipients found for these filters.',
    })
  } catch (err) {
    console.error('Notification recipients error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to load source-backed recipients.' })
  }
})

// POST /api/notify/bulk
router.post('/bulk', protect, canSendNotifications, async (req, res) => {
  try {
    const { phones, message, recipients, channel = 'auto' } = req.body
    let jobs = []
    if (Array.isArray(recipients) && recipients.length) {
      jobs = recipients
        .map(item => ({ phone: item?.phone, message: item?.message || message }))
        .filter(item => item.phone && item.message)
    } else if (Array.isArray(phones) && message) {
      jobs = phones.map(phone => ({ phone, message }))
    }

    if (!jobs.length) {
      return res.status(400).json({ success: false, message: 'phones/message ya recipients array zaroori hai' })
    }

    const schoolId = currentSchoolId(req)
    const twilioConfig = await getTwilioConfigForSchool(schoolId)
    const twilioClient = buildTwilioClient(twilioConfig)

    const results = []
    for (const job of jobs) {
      try {
        const result = await sendOne(job.phone, job.message, channel, twilioConfig, twilioClient)
        results.push({ phone: formatPhone(job.phone), status: 'sent', ...result })
      } catch (e) {
        results.push({ phone: formatPhone(job.phone), status: 'failed', error: e.message })
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
    const params = scopedNotificationParams(schoolId, recipientRole, req.user?.id, scope)
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
    const params = scopedNotificationParams(schoolId, recipientRole, req.user?.id, scope)
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
