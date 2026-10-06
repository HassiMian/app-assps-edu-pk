const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles, requireScopeForServiceOnly } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const { DEFAULT_ACADEMIC_SETUP, validateAcademicSetup } = require('../services/academicSetupService')

const canEditAcademic = requireRoles('super_admin', 'admin', 'principal', 'school_admin')

let academicStorageReady = null
async function ensureAcademicStorage() {
  if (academicStorageReady) return true
  const result = await query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'academic_setup'
    ) AS ready
  `)
  if (!result.rows[0]?.ready) {
    const err = new Error('academic_setup schema migration is not applied.')
    err.code = 'ACADEMIC_SETUP_SCHEMA_NOT_READY'
    throw err
  }
  academicStorageReady = true
  return true
}

router.get('/setup', protect, requireScopeForServiceOnly('school.classes.read'), async (req, res) => {
  try {
    await ensureAcademicStorage()
    const schoolId = currentSchoolId(req)
    const result = await query(
      `SELECT academic_setup
       FROM settings
       WHERE school_id = $1
       LIMIT 1`,
      [schoolId],
    )

    const stored = result.rows[0]?.academic_setup
    const configured = stored && typeof stored === 'object' && Array.isArray(stored.classes) && stored.classes.length > 0

    return res.json({
      success: true,
      configured: Boolean(configured),
      data: configured ? stored : null,
      defaults: configured ? undefined : DEFAULT_ACADEMIC_SETUP,
    })
  } catch (err) {
    if (err.code === 'ACADEMIC_SETUP_SCHEMA_NOT_READY') {
      return res.status(503).json({
        success: false,
        code: 'ACADEMIC_SETUP_SCHEMA_NOT_READY',
        message: 'Academic setup storage is not initialized yet.',
      })
    }
    return res.status(500).json({ success: false, code: 'ACADEMIC_SETUP_READ_FAILED', message: 'Academic setup could not be loaded.' })
  }
})

router.put('/setup', protect, canEditAcademic, async (req, res) => {
  const validation = validateAcademicSetup(req.body || {})
  if (!validation.ok) {
    return res.status(422).json({
      success: false,
      code: 'INVALID_ACADEMIC_SETUP',
      message: 'Academic setup validation failed.',
      fieldErrors: validation.errors,
    })
  }

  try {
    await ensureAcademicStorage()
    const schoolId = currentSchoolId(req)
    const payload = validation.value
    const result = await query(
      `INSERT INTO settings (school_id, school_name, academic_setup, updated_at)
       SELECT s.id, s.name, $2::jsonb, NOW()
       FROM schools s
       WHERE s.id = $1
       ON CONFLICT (school_id)
       DO UPDATE SET academic_setup = EXCLUDED.academic_setup, updated_at = NOW()
       RETURNING academic_setup`,
      [schoolId, JSON.stringify(payload)],
    )

    if (!result.rowCount) {
      return res.status(404).json({ success: false, code: 'SCHOOL_NOT_FOUND', message: 'School context not found.' })
    }

    return res.json({ success: true, configured: true, data: result.rows[0].academic_setup })
  } catch (err) {
    if (err.code === 'ACADEMIC_SETUP_SCHEMA_NOT_READY') {
      return res.status(503).json({ success: false, code: 'ACADEMIC_SETUP_SCHEMA_NOT_READY', message: 'Academic setup storage is not initialized yet.' })
    }
    return res.status(500).json({ success: false, code: 'ACADEMIC_SETUP_WRITE_FAILED', message: 'Academic setup could not be saved.' })
  }
})

module.exports = router
