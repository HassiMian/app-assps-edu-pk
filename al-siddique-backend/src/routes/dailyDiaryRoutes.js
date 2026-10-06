const express = require('express')
const router = express.Router()

const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId, tenantClause } = require('../middleware/tenant')

const canManageDiary = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')

let dailyDiarySchemaReady = null
async function ensureDailyDiaryTable() {
  if (dailyDiarySchemaReady) return true
  const result = await pool.query("SELECT to_regclass('public.daily_diaries') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('daily_diaries schema migration is not applied.')
    err.code = 'DAILY_DIARY_SCHEMA_NOT_READY'
    throw err
  }
  dailyDiarySchemaReady = true
  return true
}

function resolveDiarySchoolId(req) {
  const explicit = req.user?.role === 'super_admin' ? Number(req.body?.school_id || req.query?.school_id || 0) : 0
  const candidate = explicit || Number(currentSchoolId(req) || req.user?.school_id || 0)
  return Number.isInteger(candidate) && candidate > 0 ? candidate : null
}

async function resolveDiarySchoolName(schoolId) {
  const result = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(st.school_name), ''), s.name) AS school_name
     FROM schools s
     LEFT JOIN settings st ON st.school_id = s.id
     WHERE s.id = $1
     LIMIT 1`,
    [schoolId],
  )
  return String(result.rows[0]?.school_name || '').trim()
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
    school_name: normalizeText(body.school_name ?? body.schoolName, ''),
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
    const schoolId = resolveDiarySchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'
    if (!isSuperAdmin && !schoolId) return res.status(400).json({ success: false, message: 'School context is required.' })

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
    res.status(err.code === 'DAILY_DIARY_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'DAILY_DIARY_SCHEMA_NOT_READY' ? 'Daily Diary storage is not initialized.' : 'Failed to load daily diaries.' })
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

    const userSchoolId = resolveDiarySchoolId(req)
    if (req.user?.role !== 'super_admin' && diary.school_id !== userSchoolId) {
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
    const schoolId = resolveDiarySchoolId(req)
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context is required.' })
    const payload = normalizePayload(req.body || {})
    const canonicalSchoolName = await resolveDiarySchoolName(schoolId)
    if (!canonicalSchoolName) return res.status(422).json({ success: false, message: 'School identity is not configured for this diary.' })
    payload.school_name = canonicalSchoolName

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
      return res.status(404).json({ success: false, notFound: true, message: 'Daily diary not found.' })
    }

    const userSchoolId = resolveDiarySchoolId(req)
    if (req.user?.role !== 'super_admin' && current.school_id !== userSchoolId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' })
    }

    const payload = normalizePayload({ ...current, ...(req.body || {}) })
    const canonicalSchoolName = await resolveDiarySchoolName(Number(current.school_id))
    if (!canonicalSchoolName) return res.status(422).json({ success: false, message: 'School identity is not configured for this diary.' })
    payload.school_name = canonicalSchoolName
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
    const userSchoolId = resolveDiarySchoolId(req)
    if (req.user?.role !== 'super_admin' && diary.school_id !== userSchoolId) {
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
