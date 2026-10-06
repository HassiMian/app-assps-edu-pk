const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { pool, query, applyTenantContext } = require('../config/database')
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
const BRANDING_EXTENSION_BY_MIME = Object.freeze({
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
})

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const tenantId = req.user?.tenant_id || 'logo'
    const unique = `${tenantId}-logo-${Date.now()}`
    cb(null, unique + (BRANDING_EXTENSION_BY_MIME[file.mimetype] || '.bin'))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const expectedExt = BRANDING_EXTENSION_BY_MIME[file.mimetype]
    const compatibleExt = expectedExt === '.jpg' ? ['.jpg', '.jpeg'].includes(ext) : ext === expectedExt
    if (expectedExt && compatibleExt) cb(null, true)
    else cb(new Error('Invalid logo file type. Only JPG, PNG, and WEBP are allowed.'))
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
  const result = await query(
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
    schoolName: row.settings_school_name || row.school_name || row.name || '',
    logoUrl: publicAssetUrl(row.school_logo || row.logo_url || null),
    address: row.school_address || row.address || '',
    primaryColor: row.primary_color || brandingConfig.primaryColor || '#256FE8',
    secondaryColor: row.secondary_color || brandingConfig.secondaryColor || '#20A99F',
    academicYear: row.academic_year || '',
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
    return res.status(503).json({ success: false, message: 'School settings are temporarily unavailable.' })
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
    return res.status(503).json({ success: false, message: 'School branding is temporarily unavailable.' })
  }
})

// PUT /api/school/branding — keep schools + tenant_branding synchronized atomically
router.put('/branding', protect, canManageBranding, async (req, res) => {
  const schoolId = Number(req.school_id || 0)
  if (!schoolId) return res.status(400).json({ success: false, message: 'School context is missing.' })

  const schoolName = String(req.body?.schoolName || '').trim() || null
  const primaryColor = String(req.body?.primaryColor || '').trim() || null
  const secondaryColor = String(req.body?.secondaryColor || '').trim() || null
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
        await applyTenantContext(client)
    const school = await client.query(
      `UPDATE schools
       SET school_name = COALESCE($1, school_name),
           primary_color = COALESCE($2, primary_color),
           secondary_color = COALESCE($3, secondary_color),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, tenant_id, school_name, primary_color, secondary_color`,
      [schoolName, primaryColor, secondaryColor, schoolId]
    )
    if (!school.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'School not found.' })
    }

    const updatedSchool = school.rows[0]
    if (updatedSchool.tenant_id) {
      await client.query(
        `INSERT INTO tenant_branding (id, tenant_id, primary_color, secondary_color, updated_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET
           primary_color = COALESCE(EXCLUDED.primary_color, tenant_branding.primary_color),
           secondary_color = COALESCE(EXCLUDED.secondary_color, tenant_branding.secondary_color),
           updated_at = NOW()`,
        [crypto.randomUUID(), updatedSchool.tenant_id, primaryColor, secondaryColor]
      )
    }

    await client.query('COMMIT')
    return res.json({
      success: true,
      school: {
        schoolName: updatedSchool.school_name,
        primaryColor: updatedSchool.primary_color,
        secondaryColor: updatedSchool.secondary_color,
      },
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Update branding error:', error)
    return res.status(500).json({ success: false, message: 'Server error updating branding.' })
  } finally {
    client.release()
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

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await applyTenantContext(client)
        const result = await client.query(
          'UPDATE schools SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, tenant_id, logo_url',
          [logoUrl, schoolId]
        )
        if (!result.rowCount) {
          await client.query('ROLLBACK')
          await cleanupFile(req.file.path)
          return res.status(404).json({ success: false, message: 'School not found.' })
        }
        const tenantId = result.rows[0].tenant_id
        if (tenantId) {
          await client.query(
            `INSERT INTO tenant_branding (id, tenant_id, logo_url, updated_at)
             VALUES ($1,$2,$3,NOW())
             ON CONFLICT (tenant_id)
             DO UPDATE SET logo_url = EXCLUDED.logo_url, updated_at = NOW()`,
            [crypto.randomUUID(), tenantId, logoUrl]
          )
        }
        await client.query('COMMIT')
        return res.json({ success: true, logoUrl })
      } catch (transactionError) {
        await client.query('ROLLBACK').catch(() => {})
        throw transactionError
      } finally {
        client.release()
      }
    } catch (dbErr) {
      console.error('DB Update branding logo error:', dbErr)
      await cleanupFile(req.file.path)
      return res.status(500).json({ success: false, message: 'Database error updating logo.' })
    }
  })
})

module.exports = router
