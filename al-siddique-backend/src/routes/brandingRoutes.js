const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { pool } = require('../config/database')
const { protect } = require('../middleware/auth')

const canManageBranding = (req, res, next) => {
  const allowed = ['super_admin', 'admin', 'principal', 'school_admin']
  if (!req.user?.role || !allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' })
  }
  next()
}

// Ensure same production uploads directory is used.
const uploadDir = fs.existsSync('/var/uploads')
  ? '/var/uploads'
  : path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const tenantId = req.user?.tenant_id || 'logo'
    const unique = `${tenantId}-logo-${Date.now()}`
    cb(null, unique + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.(jpe?g|png|webp|svg)$/i
    const allowedMime = /^image\/(jpeg|jpg|png|webp|svg\+xml)$/i
    const ext = allowedExt.test(path.extname(file.originalname || '').toLowerCase())
    const mime = allowedMime.test(file.mimetype || '')
    if (ext && mime) cb(null, true)
    else cb(new Error('Invalid logo file type. Only jpg, png, webp, and svg are allowed.'))
  }
})

function cleanupFile(filePath) {
  if (!filePath) return Promise.resolve()
  return fs.promises.unlink(filePath).catch(() => {})
}

function publicAssetUrl(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  if (/^(data:image\/|https?:\/\/|blob:)/i.test(trimmed)) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

async function loadCurrentSchoolSettings(schoolId) {
  const result = await pool.query(
    `SELECT
       s.id AS school_id,
       s.tenant_id,
       s.name,
       s.school_name,
       s.address,
       s.logo_url,
       s.primary_color,
       s.secondary_color,
       st.school_name AS settings_school_name,
       st.school_address,
       st.school_logo,
       st.academic_year,
       st.branding_config
     FROM schools s
     LEFT JOIN settings st ON st.school_id = s.id
     WHERE s.id = $1
     LIMIT 1`,
    [schoolId]
  )

  const row = result.rows[0] || {}
  const brandingConfig = row.branding_config && typeof row.branding_config === 'object' ? row.branding_config : {}

  return {
    schoolId: row.school_id || schoolId,
    tenantId: row.tenant_id || null,
    schoolName: row.settings_school_name || row.school_name || row.name || 'APEX',
    logoUrl: publicAssetUrl(row.school_logo || row.logo_url || null),
    address: row.school_address || row.address || '',
    primaryColor: row.primary_color || brandingConfig.primaryColor || '#071e34',
    secondaryColor: row.secondary_color || brandingConfig.secondaryColor || '#06b6d4',
    academicYear: row.academic_year || String(new Date().getFullYear()),
  }
}

function safeDefaultSettings(schoolId) {
  return {
    schoolId: schoolId || null,
    tenantId: null,
    schoolName: 'APEX',
    logoUrl: null,
    address: '',
    primaryColor: '#071e34',
    secondaryColor: '#06b6d4',
    academicYear: String(new Date().getFullYear()),
  }
}

// GET /api/school/settings/current
router.get('/settings/current', protect, async (req, res) => {
  const schoolId = req.school_id
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'School context is missing.' })
  }

  try {
    const settings = await loadCurrentSchoolSettings(schoolId)
    return res.json({ success: true, data: settings })
  } catch (error) {
    console.error('Fetch current school settings error:', error)
    return res.json({ success: true, data: safeDefaultSettings(schoolId) })
  }
})

// GET /api/school/branding
router.get('/branding', protect, async (req, res) => {
  try {
    const schoolId = req.school_id
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School context is missing.' })
    }

    const settings = await loadCurrentSchoolSettings(schoolId)
    return res.json({
      success: true,
      branding: settings,
      data: settings,
    })
  } catch (error) {
    console.error('Fetch branding error:', error)
    return res.json({ success: true, branding: safeDefaultSettings(req.school_id), data: safeDefaultSettings(req.school_id) })
  }
})

// PUT /api/school/branding
router.put('/branding', protect, canManageBranding, async (req, res) => {
  try {
    const schoolId = req.school_id
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School context is missing.' })
    }

    const { schoolName, primaryColor, secondaryColor } = req.body

    const result = await pool.query(
      `UPDATE schools 
       SET school_name = COALESCE($1, school_name), 
           primary_color = COALESCE($2, primary_color), 
           secondary_color = COALESCE($3, secondary_color),
           updated_at = NOW() 
       WHERE id = $4 
       RETURNING id, school_name, primary_color, secondary_color`,
      [schoolName || null, primaryColor || null, secondaryColor || null, schoolId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'School not found.' })
    }

    const updatedSchool = result.rows[0]

    return res.json({
      success: true,
      school: {
        schoolName: updatedSchool.school_name,
        primaryColor: updatedSchool.primary_color,
        secondaryColor: updatedSchool.secondary_color
      }
    })
  } catch (error) {
    console.error('Update branding error:', error)
    return res.status(500).json({ success: false, message: 'Server error updating branding.' })
  }
})

// POST /api/school/branding/logo
router.post('/branding/logo', protect, canManageBranding, (req, res) => {
  upload.single('logo')(req, res, async (err) => {
    if (err) {
      await cleanupFile(req.file?.path)
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' })
    }

    if (!req.file) return res.status(400).json({ success: false, message: 'Logo file required.' })

    try {
      const schoolId = req.school_id
      if (!schoolId) {
        await cleanupFile(req.file.path)
        return res.status(400).json({ success: false, message: 'School context is missing.' })
      }

      const logoUrl = `/uploads/${req.file.filename}`

      const result = await pool.query(
        'UPDATE schools SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, logo_url',
        [logoUrl, schoolId]
      )

      if (result.rows.length === 0) {
        await cleanupFile(req.file.path)
        return res.status(404).json({ success: false, message: 'School not found.' })
      }

      return res.json({
        success: true,
        logoUrl
      })
    } catch (dbErr) {
      console.error('DB Update branding logo error:', dbErr)
      await cleanupFile(req.file.path)
      return res.status(500).json({ success: false, message: 'Database error updating logo.' })
    }
  })
})

module.exports = router
