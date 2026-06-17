// src/routes/noticesRoutes.js
// Al Siddique Smart School OS — School Notices API

const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const ALLOW_MOCK_FALLBACK = process.env.NODE_ENV !== 'production'
const canManageNotices = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')

async function ensureNoticesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      school_id INTEGER,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      issued_by VARCHAR(255),
      recipient_type JSONB DEFAULT '[]',
      teacher_ids JSONB DEFAULT '[]',
      mentioned_teacher_ids JSONB DEFAULT '[]',
      template_key VARCHAR(100) DEFAULT 'custom',
      language VARCHAR(20) DEFAULT 'bilingual',
      content_english TEXT,
      content_urdu TEXT,
      priority VARCHAR(30) DEFAULT 'normal',
      is_pinned BOOLEAN DEFAULT FALSE,
      expires_at DATE,
      read_count INTEGER DEFAULT 0,
      total_recipients INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS school_id INTEGER;')
  await pool.query('ALTER TABLE notices ALTER COLUMN school_id DROP DEFAULT;').catch(() => {})
  await pool.query("ALTER TABLE notices ADD COLUMN IF NOT EXISTS mentioned_teacher_ids JSONB DEFAULT '[]';")
  await pool.query("ALTER TABLE notices ADD COLUMN IF NOT EXISTS template_key VARCHAR(100) DEFAULT 'custom';")
  await pool.query("ALTER TABLE notices ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'bilingual';")
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS content_english TEXT;')
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS content_urdu TEXT;')
  await pool.query("ALTER TABLE notices ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'normal';")
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;')
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS expires_at DATE;')
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;')
  await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;')
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
    issuedBy: body.issued_by || body.issuedBy || body.author || 'Administration',
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
router.get('/', protect, async (req, res) => {
  try {
    try {
      await ensureNoticesTable()
    } catch (e) {
      console.warn('Skipping notices table creation due to offline db');
    }
    const result = await pool.query(
      'SELECT * FROM notices WHERE school_id = $1 ORDER BY created_at DESC LIMIT 50',
      [currentSchoolId(req)]
    )
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Notices GET error:', error.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning high-fidelity mock notices.');
    const mockNotices = [
      {
        id: 1,
        school_id: 1,
        title: 'Summer Vacation Announcement 2026',
        content: 'Dear parents, teachers, and students, the school will remain closed for summer vacation from June 1st to August 14th, 2026. Online homework assignments have been uploaded to the student portal.',
        content_english: 'Dear parents, teachers, and students, the school will remain closed for summer vacation from June 1st to August 14th, 2026. Online homework assignments have been uploaded to the student portal.',
        content_urdu: '',
        template_key: 'holiday',
        language: 'english',
        issued_by: 'Principal Malik Ahmed',
        recipient_type: ['parents', 'students', 'teachers'],
        teacher_ids: [],
        mentioned_teacher_ids: [],
        priority: 'normal',
        is_pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        school_id: 1,
        title: 'Urgent: Teacher Training Workshop on AI Tools',
        content: 'There is a mandatory training workshop for all teaching staff on incorporating AI Paper Generator and Lesson Planning tools in the classroom. Date: May 25th, 2026 at 2:00 PM in the Computer Lab.',
        content_english: 'There is a mandatory training workshop for all teaching staff on incorporating AI Paper Generator and Lesson Planning tools in the classroom. Date: May 25th, 2026 at 2:00 PM in the Computer Lab.',
        content_urdu: '',
        template_key: 'teacher_meeting',
        language: 'english',
        issued_by: 'Super Admin',
        recipient_type: ['teachers'],
        teacher_ids: [],
        mentioned_teacher_ids: [],
        priority: 'high',
        is_pinned: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 3,
        school_id: 1,
        title: 'Monthly Tuition Fee Submission Deadline',
        content: 'This is a gentle reminder that the deadline for monthly tuition fee challan submission for May 2026 is May 15th. Late fee surcharge will be applicable post the due date.',
        content_english: 'This is a gentle reminder that the deadline for monthly tuition fee challan submission for May 2026 is May 15th. Late fee surcharge will be applicable post the due date.',
        content_urdu: '',
        template_key: 'fee_reminder',
        language: 'english',
        issued_by: 'Accounts Department',
        recipient_type: ['parents'],
        teacher_ids: [],
        mentioned_teacher_ids: [],
        priority: 'high',
        is_pinned: false,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];
    return res.json({ success: true, data: mockNotices });
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
    try {
      await ensureNoticesTable()
    } catch (e) {
      console.warn('Skipping notices table creation due to offline db');
    }
    const result = await pool.query(`
      INSERT INTO notices (
        school_id, title, content, issued_by, recipient_type, teacher_ids,
        mentioned_teacher_ids, template_key, language, content_english, content_urdu,
        priority, is_pinned, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      currentSchoolId(req),
      title,
      content,
      notice.issuedBy,
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Notice could not be created.' })
    }
    console.warn('PostgreSQL offline. Simulating successful notice creation (Mock Fallback).');
    const mockCreated = {
      id: Math.floor(Math.random() * 1000) + 10,
      school_id: 1,
      title,
      content,
      issued_by: notice.issuedBy,
      recipient_type: notice.recipientType,
      teacher_ids: notice.teacherIds,
      mentioned_teacher_ids: notice.mentionedTeacherIds,
      template_key: notice.templateKey,
      language: notice.language,
      content_english: notice.contentEnglish,
      content_urdu: notice.contentUrdu,
      priority: notice.priority,
      is_pinned: notice.isPinned,
      expires_at: notice.expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    return res.status(201).json({ success: true, data: mockCreated, message: 'Notice created successfully (Mock Fallback)' })
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
    try {
      await ensureNoticesTable()
    } catch (e) {
      console.warn('Skipping notices table creation due to offline db');
    }
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
      notice.issuedBy,
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
      currentSchoolId(req),
    ])

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notice not found' })
    }

    res.json({ success: true, data: result.rows[0], message: 'Notice updated successfully' })
  } catch (error) {
    console.error('Notice update error:', error.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Notice could not be updated.' })
    }
    console.warn('PostgreSQL offline. Simulating successful notice update (Mock Fallback).');
    return res.json({
      success: true,
      data: {
        id: req.params.id,
        school_id: 1,
        title,
        content,
        issued_by: notice.issuedBy,
        recipient_type: notice.recipientType,
        teacher_ids: notice.teacherIds,
        mentioned_teacher_ids: notice.mentionedTeacherIds,
        template_key: notice.templateKey,
        language: notice.language,
        content_english: notice.contentEnglish,
        content_urdu: notice.contentUrdu,
        priority: notice.priority,
        is_pinned: notice.isPinned,
        expires_at: notice.expiresAt,
        updated_at: new Date().toISOString()
      },
      message: 'Notice updated successfully (Mock Fallback)'
    })
  }
})

// DELETE a notice
router.delete('/:id', protect, canManageNotices, async (req, res) => {
  try {
    try {
      await ensureNoticesTable()
    } catch (e) {
      console.warn('Skipping notices table creation due to offline db');
    }
    const result = await pool.query(
      'DELETE FROM notices WHERE id = $1 AND school_id = $2',
      [req.params.id, currentSchoolId(req)]
    )
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notice not found' })
    }
    res.json({ success: true, message: 'Notice deleted' })
  } catch (error) {
    console.error('Notice delete error:', error.message)
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Notice could not be deleted.' })
    }
    console.warn('PostgreSQL offline. Simulating notice deletion (Mock Fallback).');
    return res.json({ success: true, message: 'Notice deleted (Mock Fallback)' })
  }
})

module.exports = router
