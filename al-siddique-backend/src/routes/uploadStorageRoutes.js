const express = require('express')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const { pool, query, applyTenantContext } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const router = express.Router()
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const IMAGE_EXTENSION_BY_MIME = Object.freeze({
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
})

const rootUploadDir = fs.existsSync('/var/uploads')
  ? '/var/uploads'
  : path.join(__dirname, '../../uploads')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function uploadFor(folder) {
  const destination = path.join(rootUploadDir, folder)
  ensureDir(destination)

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, destination),
      filename: (req, file, cb) => {
        const ext = IMAGE_EXTENSION_BY_MIME[file.mimetype] || '.bin'
        cb(null, `${crypto.randomUUID()}${ext}`)
      },
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        cb(new Error('Only PNG, JPG, JPEG, WEBP files are allowed'))
        return
      }
      cb(null, true)
    },
  })
}

function cleanupFile(file) {
  if (!file?.path) return Promise.resolve()
  return fs.promises.unlink(file.path).catch(() => {})
}

let tenantBrandingSchemaReady = null
async function ensureTenantBrandingTable() {
  if (tenantBrandingSchemaReady) return true
  const result = await query("SELECT to_regclass('public.tenant_branding') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('tenant_branding schema migration is not applied.')
    err.code = 'BRANDING_SCHEMA_NOT_READY'
    throw err
  }
  tenantBrandingSchemaReady = true
  return true
}

function canManageTenantBranding(req, res, next) {
  const allowed = ['super_admin', 'admin', 'school_admin', 'principal']
  if (!req.user?.role || !allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Administrator privileges required.' })
  }
  next()
}

async function resolveTenantIdForBranding(req) {
  const role = String(req.user?.role || '').toLowerCase()
  if (role === 'super_admin') {
    const requestedTenantId = String(req.body?.tenantId || req.body?.tenant_id || '').trim()
    if (requestedTenantId) return requestedTenantId
  }

  const scopedTenantId = String(
    req.tenant_id ||
    req.user?.tenant_id ||
    req.user?.tenantId ||
    req.school?.tenant_id ||
    req.school?.tenantId ||
    ''
  ).trim()
  if (scopedTenantId) return scopedTenantId

  const schoolId = currentSchoolId(req)
  if (!schoolId) return ''

  const result = await query('SELECT tenant_id FROM schools WHERE id = $1 LIMIT 1', [schoolId])
  return String(result.rows[0]?.tenant_id || '').trim()
}

router.get('/subscription/payment-screenshot/:fileName', protect, requireRoles('super_admin', 'admin'), async (req, res) => {
  const fileName = path.basename(String(req.params.fileName || ''))
  if (!/^(?:[a-f0-9-]+|screenshot_[0-9]+-[a-f0-9]+)\.(?:png|jpe?g|webp|pdf)$/i.test(fileName)) {
    return res.status(400).json({ success: false, message: 'Invalid payment proof file name.' })
  }

  // A school admin must only access a payment proof tied to their own approved school.
  // Unassigned pre-admission requests remain exclusively available to super_admin.
  if (req.user?.role !== 'super_admin') {
    const schoolId = currentSchoolId(req)
    if (!schoolId) return res.status(404).json({ success: false, message: 'Payment proof not found.' })
    try {
      const owned = await query(`
        SELECT 1 FROM subscription_requests
        WHERE created_school_id = $1
          AND payment_screenshot_url = $2
        LIMIT 1
      `, [schoolId, `/api/subscription/payment-screenshot/${fileName}`])
      if (!owned.rows.length) return res.status(404).json({ success: false, message: 'Payment proof not found.' })
    } catch (err) {
      console.error('Payment proof authorization error:', err.message)
      return res.status(503).json({ success: false, message: 'Payment proof access unavailable.' })
    }
  }

  const filePath = path.join(rootUploadDir, 'payment-screenshots', fileName)
  try {
    const stat = await fs.promises.lstat(filePath)
    if (!stat.isFile() || stat.isSymbolicLink()) return res.status(404).json({ success: false, message: 'Payment proof not found.' })
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.sendFile(filePath)
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ success: false, message: 'Payment proof not found.' })
    console.error('Payment proof read error:', err.message)
    return res.status(500).json({ success: false, message: 'Payment proof could not be loaded.' })
  }
})

router.post('/subscription/upload-screenshot', (req, res) => {
  const upload = uploadFor('payment-screenshots').single('screenshot')
  upload(req, res, async (err) => {
    if (err) {
      await cleanupFile(req.file)
      return res.status(400).json({ success: false, message: err.message || 'Screenshot upload failed' })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment screenshot is required' })
    }

    const url = `/api/subscription/payment-screenshot/${req.file.filename}`
    return res.json({
      success: true,
      message: 'Payment screenshot uploaded successfully',
      data: {
        fileName: req.file.filename,
        url,
        size: req.file.size,
        type: req.file.mimetype,
      },
    })
  })
})

router.post('/tenant/branding/upload', protect, canManageTenantBranding, (req, res) => {
  const upload = uploadFor('branding').single('logo')
  upload(req, res, async (err) => {
    if (err) {
      await cleanupFile(req.file)
      return res.status(400).json({ success: false, message: err.message || 'Branding upload failed' })
    }

    const tenantId = await resolveTenantIdForBranding(req)
    if (!tenantId) {
      await cleanupFile(req.file)
      return res.status(403).json({ success: false, message: 'Tenant context is required' })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Logo file is required' })
    }

    try {
      const logoUrl = `/uploads/branding/${req.file.filename}`
      await ensureTenantBrandingTable()

      const client = await pool.connect()
      let result
      try {
        await client.query('BEGIN')
        await applyTenantContext(client)
        result = await client.query(
          `INSERT INTO tenant_branding (id, tenant_id, logo_url, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (tenant_id)
           DO UPDATE SET logo_url = EXCLUDED.logo_url, updated_at = NOW()
           RETURNING
             id,
             tenant_id AS "tenantId",
             logo_url AS "logoUrl",
             primary_color AS "primaryColor",
             secondary_color AS "secondaryColor",
             created_at AS "createdAt",
             updated_at AS "updatedAt"`,
          [crypto.randomUUID(), tenantId, logoUrl]
        )
        const schoolUpdate = await client.query(
          'UPDATE schools SET logo_url = $1, updated_at = NOW() WHERE tenant_id = $2 RETURNING id',
          [logoUrl, tenantId]
        )
        if (!schoolUpdate.rowCount) throw new Error('Tenant school record was not found for branding upload.')
        await client.query('COMMIT')
      } catch (transactionError) {
        await client.query('ROLLBACK').catch(() => {})
        throw transactionError
      } finally {
        client.release()
      }

      return res.json({
        success: true,
        message: 'Branding logo uploaded successfully',
        data: result.rows[0],
        upload: {
          fileName: req.file.filename,
          url: logoUrl,
          size: req.file.size,
          type: req.file.mimetype,
        },
      })
    } catch (error) {
      console.error('Branding upload error:', error)
      await cleanupFile(req.file)
      return res.status(500).json({ success: false, message: 'Branding upload failed.' })
    }
  })
})

module.exports = router
