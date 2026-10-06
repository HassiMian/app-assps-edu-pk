const express = require('express')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const { pool, query, applyTenantContext } = require('../config/database')
const { protect } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const router = express.Router()
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

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
        const ext = path.extname(file.originalname || '.png').toLowerCase() || '.png'
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

    const url = `/uploads/payment-screenshots/${req.file.filename}`
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
