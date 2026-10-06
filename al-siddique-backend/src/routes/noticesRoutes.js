// src/routes/noticesRoutes.js
// Al Siddique Smart School OS — School Notices API

const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')
const { protect, requireRoles, requireScopeForServiceOnly } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const canManageNotices = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')

function requireNoticeSchoolContext(req, res) {
  const schoolId = currentSchoolId(req)
  if (!schoolId) {
    res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required for notices.' })
    return null
  }
  return schoolId
}

let noticesSchemaReady = null
async function ensureNoticesTable() {
  if (noticesSchemaReady) return true
  const result = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notices'
      AND column_name IN ('school_id','title','content','recipient_type','teacher_ids','mentioned_teacher_ids','template_key','language','content_english','content_urdu','priority','is_pinned','expires_at','read_count','total_recipients')
  `)
  if (Number(result.rows[0]?.count || 0) !== 15) {
    const err = new Error('notices schema migration is not applied.')
    err.code = 'NOTICES_SCHEMA_NOT_READY'
    throw err
  }
  noticesSchemaReady = true
  return true
}

function listValue(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch {
      return [value]
    }
  }
  return []
}

function normalizeNoticePayload(body) {
  const language = body.language || 'bilingual'
  const contentEnglish = body.content_english ?? body.contentEnglish ?? ''
  const contentUrdu = body.content_urdu ?? body.contentUrdu ?? ''
  const content = body.content || [contentEnglish, contentUrdu].filter(Boolean).join('\n\n')

  return {
    title: body.title,
    content,
    issuedBy: body.issued_by || body.issuedBy || body.author || '',
    recipientType: listValue(body.recipient_type ?? body.recipientType),
    teacherIds: listValue(body.teacher_ids ?? body.teacherIds),
    mentionedTeacherIds: listValue(body.mentioned_teacher_ids ?? body.mentionedTeacherIds),
    templateKey: body.template_key || body.templateKey || 'custom',
    language,
    contentEnglish,
    contentUrdu,
    priority: body.priority || 'normal',
    isPinned: Boolean(body.is_pinned ?? body.isPinned),
    expiresAt: body.expires_at || body.expiresAt || null,
  }
}

// GET all notices for this school
router.get('/', protect, requireScopeForServiceOnly('school.notices.read'), async (req, res) => {
  try {
    await ensureNoticesTable()
    const schoolId = requireNoticeSchoolContext(req, res)
    if (!schoolId) return
    const result = await pool.query(
      'SELECT * FROM notices WHERE school_id = $1 ORDER BY created_at DESC LIMIT 50',
      [schoolId]
    )
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Notices GET error:', error.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Notices could not be loaded.' })
  }
})

// POST create a new notice
router.post('/', protect, canManageNotices, async (req, res) => {
  const notice = normalizeNoticePayload(req.body)
  const { title, content } = notice
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required' })
  }
  try {
    await ensureNoticesTable()
    const schoolId = requireNoticeSchoolContext(req, res)
    if (!schoolId) return
    const issuedBy = notice.issuedBy || String(req.user?.name || req.user?.email || '').trim()
    if (!issuedBy) return res.status(422).json({ success: false, message: 'Notice issuer identity is required.' })
    const result = await pool.query(`
      INSERT INTO notices (
        school_id, title, content, issued_by, recipient_type, teacher_ids,
        mentioned_teacher_ids, template_key, language, content_english, content_urdu,
        priority, is_pinned, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      schoolId,
      title,
      content,
      issuedBy,
      JSON.stringify(notice.recipientType),
      JSON.stringify(notice.teacherIds),
      JSON.stringify(notice.mentionedTeacherIds),
      notice.templateKey,
      notice.language,
      notice.contentEnglish,
      notice.contentUrdu,
      notice.priority,
      notice.isPinned,
      notice.expiresAt,
    ])
    res.status(201).json({ success: true, data: result.rows[0], message: 'Notice created successfully' })
  } catch (error) {
    console.error('Notice create error:', error.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Notice could not be created.' })
  }
})

// PUT update a notice
router.put('/:id', protect, canManageNotices, async (req, res) => {
  const notice = normalizeNoticePayload(req.body)
  const { title, content } = notice
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required' })
  }
  try {
    await ensureNoticesTable()
    const schoolId = requireNoticeSchoolContext(req, res)
    if (!schoolId) return
    const issuedBy = notice.issuedBy || String(req.user?.name || req.user?.email || '').trim()
    if (!issuedBy) return res.status(422).json({ success: false, message: 'Notice issuer identity is required.' })
    const result = await pool.query(`
      UPDATE notices
      SET title = $1,
          content = $2,
          issued_by = $3,
          recipient_type = $4,
          teacher_ids = $5,
          mentioned_teacher_ids = $6,
          template_key = $7,
          language = $8,
          content_english = $9,
          content_urdu = $10,
          priority = $11,
          is_pinned = $12,
          expires_at = $13,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14 AND school_id = $15
      RETURNING *
    `, [
      title,
      content,
      issuedBy,
      JSON.stringify(notice.recipientType),
      JSON.stringify(notice.teacherIds),
      JSON.stringify(notice.mentionedTeacherIds),
      notice.templateKey,
      notice.language,
      notice.contentEnglish,
      notice.contentUrdu,
      notice.priority,
      notice.isPinned,
      notice.expiresAt,
      req.params.id,
      schoolId,
    ])

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notice not found' })
    }

    res.json({ success: true, data: result.rows[0], message: 'Notice updated successfully' })
  } catch (error) {
    console.error('Notice update error:', error.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Notice could not be updated.' })
  }
})

// DELETE a notice
router.delete('/:id', protect, canManageNotices, async (req, res) => {
  try {
    await ensureNoticesTable()
    const schoolId = requireNoticeSchoolContext(req, res)
    if (!schoolId) return
    const result = await pool.query(
      'DELETE FROM notices WHERE id = $1 AND school_id = $2',
      [req.params.id, schoolId]
    )
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notice not found' })
    }
    res.json({ success: true, message: 'Notice deleted' })
  } catch (error) {
    console.error('Notice delete error:', error.message)
    return res.status(503).json({ success: false, message: 'Database unavailable. Notice could not be deleted.' })
  }
})

module.exports = router
