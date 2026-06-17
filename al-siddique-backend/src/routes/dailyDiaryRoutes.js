const express = require('express')
const router = express.Router()

const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId, tenantClause } = require('../middleware/tenant')

const canManageDiary = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')

async function ensureDailyDiaryTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_diaries (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL DEFAULT 1,
      school_name VARCHAR(255) NOT NULL DEFAULT 'Al Siddique Scholars Public School',
      tagline TEXT,
      logo_url TEXT,
      class_level VARCHAR(100),
      class_name VARCHAR(100),
      diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
      slips_per_page INTEGER NOT NULL DEFAULT 8,
      footer_text TEXT,
      footer_is_urdu BOOLEAN NOT NULL DEFAULT FALSE,
      rows JSONB NOT NULL DEFAULT '[]'::jsonb,
      style_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS school_id INTEGER')
  await pool.query('ALTER TABLE daily_diaries ALTER COLUMN school_id DROP DEFAULT')
  await pool.query('ALTER TABLE daily_diaries ALTER COLUMN school_id SET NOT NULL').catch(() => {})
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS template_id INTEGER NOT NULL DEFAULT 1')
  await pool.query("ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS school_name VARCHAR(255) NOT NULL DEFAULT 'Al Siddique Scholars Public School'")
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS tagline TEXT')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS logo_url TEXT')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS class_level VARCHAR(100)')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS class_name VARCHAR(100)')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS diary_date DATE NOT NULL DEFAULT CURRENT_DATE')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS slips_per_page INTEGER NOT NULL DEFAULT 8')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS footer_text TEXT')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS footer_is_urdu BOOLEAN NOT NULL DEFAULT FALSE')
  await pool.query("ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS rows JSONB NOT NULL DEFAULT '[]'::jsonb")
  await pool.query("ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS style_settings JSONB NOT NULL DEFAULT '{}'::jsonb")
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS created_by INTEGER')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await pool.query('ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await pool.query('CREATE INDEX IF NOT EXISTS daily_diaries_school_id_idx ON daily_diaries (school_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS daily_diaries_school_date_idx ON daily_diaries (school_id, diary_date DESC)')
}

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  const str = String(value).trim()
  return str || fallback
}

function normalizePayload(body = {}) {
  const templateId = Number(body.template_id ?? body.templateId ?? 1) || 1
  const slipsPerPage = Number(body.slips_per_page ?? body.slipsPerPage ?? 8) || 8
  const footerIsUrdu = Boolean(body.footer_is_urdu ?? body.footerIsUrdu ?? false)
  const rows = Array.isArray(body.rows) ? body.rows : []
  const styleSettings = body.style_settings && typeof body.style_settings === 'object' ? body.style_settings : {}

  return {
    template_id: templateId,
    school_name: normalizeText(body.school_name ?? body.schoolName, 'Al Siddique Scholars Public School'),
    tagline: normalizeText(body.tagline, ''),
    logo_url: normalizeText(body.logo_url ?? body.logoUrl, ''),
    class_level: normalizeText(body.class_level ?? body.classLevel, ''),
    class_name: normalizeText(body.class_name ?? body.className, ''),
    diary_date: normalizeText(body.diary_date ?? body.diaryDate, new Date().toISOString().slice(0, 10)),
    slips_per_page: [4, 6, 8, 10, 12, 14].includes(slipsPerPage) ? slipsPerPage : 8,
    footer_text: normalizeText(body.footer_text ?? body.footerText, ''),
    footer_is_urdu: footerIsUrdu,
    rows,
    style_settings: styleSettings,
  }
}

function mapDiaryRow(row) {
  return {
    ...row,
    rows: row.rows || [],
    style_settings: row.style_settings || {},
  }
}

router.use(protect, canManageDiary)

router.get('/', async (req, res) => {
  try {
    await tenantClause(req)
    await ensureDailyDiaryTable()
    const limit = Math.max(1, Math.min(Number(req.query.limit || 20), 100))
    const schoolId = currentSchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'

    const result = isSuperAdmin
      ? await pool.query(
        `SELECT * FROM daily_diaries
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      )
      : await pool.query(
        `SELECT * FROM daily_diaries
         WHERE school_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [schoolId, limit]
      )

    res.json({
      success: true,
      data: result.rows.map(mapDiaryRow),
    })
  } catch (error) {
    console.error('Daily diary list error:', error)
    res.status(500).json({ success: false, message: 'Failed to load daily diaries.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    await tenantClause(req)
    await ensureDailyDiaryTable()
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid diary id.' })
    }

    const result = await pool.query('SELECT * FROM daily_diaries WHERE id = $1 LIMIT 1', [id])
    const diary = result.rows[0]
    if (!diary) {
      return res.status(404).json({ success: false, message: 'Daily diary not found.' })
    }

    if (req.user?.role !== 'super_admin' && diary.school_id !== currentSchoolId(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' })
    }

    res.json({
      success: true,
      data: mapDiaryRow(diary),
    })
  } catch (error) {
    console.error('Daily diary fetch error:', error)
    res.status(500).json({ success: false, message: 'Failed to load the diary.' })
  }
})

router.post('/', async (req, res) => {
  try {
    await tenantClause(req)
    await ensureDailyDiaryTable()
    const schoolId = currentSchoolId(req)
    const payload = normalizePayload(req.body || {})

    const result = await pool.query(
      `INSERT INTO daily_diaries (
        school_id, template_id, school_name, tagline, logo_url,
        class_level, class_name, diary_date, slips_per_page,
        footer_text, footer_is_urdu, rows, style_settings, created_by, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8::date, $9,
        $10, $11, $12::jsonb, $13::jsonb, $14, CURRENT_TIMESTAMP
      )
      RETURNING *`,
      [
        schoolId,
        payload.template_id,
        payload.school_name,
        payload.tagline,
        payload.logo_url || null,
        payload.class_level || null,
        payload.class_name || null,
        payload.diary_date,
        payload.slips_per_page,
        payload.footer_text,
        payload.footer_is_urdu,
        JSON.stringify(payload.rows),
        JSON.stringify(payload.style_settings),
        req.user?.id || null,
      ]
    )

    res.json({
      success: true,
      data: mapDiaryRow(result.rows[0]),
      message: 'Daily diary saved successfully.',
    })
  } catch (error) {
    console.error('Daily diary create error:', error)
    res.status(500).json({ success: false, message: 'Failed to save the daily diary.' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    await tenantClause(req)
    await ensureDailyDiaryTable()
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid diary id.' })
    }

    const existing = await pool.query('SELECT * FROM daily_diaries WHERE id = $1 LIMIT 1', [id])
    const current = existing.rows[0]
    if (!current) {
      return res.status(404).json({ success: false, message: 'Daily diary not found.' })
    }

    if (req.user?.role !== 'super_admin' && current.school_id !== currentSchoolId(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' })
    }

    const payload = normalizePayload({ ...current, ...(req.body || {}) })
    const result = await pool.query(
      `UPDATE daily_diaries SET
        template_id = $1,
        school_name = $2,
        tagline = $3,
        logo_url = $4,
        class_level = $5,
        class_name = $6,
        diary_date = $7::date,
        slips_per_page = $8,
        footer_text = $9,
        footer_is_urdu = $10,
        rows = $11::jsonb,
        style_settings = $12::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *`,
      [
        payload.template_id,
        payload.school_name,
        payload.tagline,
        payload.logo_url || null,
        payload.class_level || null,
        payload.class_name || null,
        payload.diary_date,
        payload.slips_per_page,
        payload.footer_text,
        payload.footer_is_urdu,
        JSON.stringify(payload.rows),
        JSON.stringify(payload.style_settings),
        id,
      ]
    )

    res.json({
      success: true,
      data: mapDiaryRow(result.rows[0]),
      message: 'Daily diary updated successfully.',
    })
  } catch (error) {
    console.error('Daily diary update error:', error)
    res.status(500).json({ success: false, message: 'Failed to update the daily diary.' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await tenantClause(req)
    await ensureDailyDiaryTable()
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid diary id.' })
    }

    const existing = await pool.query('SELECT id, school_id FROM daily_diaries WHERE id = $1 LIMIT 1', [id])
    const diary = existing.rows[0]
    if (!diary) {
      return res.status(404).json({ success: false, message: 'Daily diary not found.' })
    }
    if (req.user?.role !== 'super_admin' && diary.school_id !== currentSchoolId(req)) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' })
    }

    await pool.query('DELETE FROM daily_diaries WHERE id = $1', [id])
    res.json({ success: true, message: 'Daily diary deleted successfully.' })
  } catch (error) {
    console.error('Daily diary delete error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete the daily diary.' })
  }
})

module.exports = router
