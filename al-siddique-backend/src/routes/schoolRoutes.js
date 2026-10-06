const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool, query, applyTenantContext } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')

const canManageSchools = requireRoles('super_admin')

function normalizeSchoolCode(value) {
  if (!value || typeof value !== 'string') return null
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}

let schoolSchemaReady = null
async function ensureSchoolSchema() {
  if (schoolSchemaReady) return true
  const result = await query(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schools'
      AND column_name IN ('id','name','code','status','subscription_plan','feature_flags')
  `)
  if (Number(result.rows[0]?.count || 0) !== 6) {
    const err = new Error('schools schema migration is not applied.')
    err.code = 'SCHOOL_SCHEMA_NOT_READY'
    throw err
  }
  schoolSchemaReady = true
  return true
}

router.get('/', protect, canManageSchools, async (req, res) => {
  try {
    await ensureSchoolSchema()
    const result = await query(
      `SELECT id, name, code, status, subscription_plan, feature_flags, created_at, updated_at
       FROM schools
       ORDER BY id ASC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('School list error:', err.message)
    res.status(err.code === 'SCHOOL_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'SCHOOL_SCHEMA_NOT_READY' ? 'School storage is not initialized.' : 'Unable to load schools.' })
  }
})

router.get('/:id', protect, canManageSchools, async (req, res) => {
  try {
    await ensureSchoolSchema()
    const result = await query(
      `SELECT id, name, code, status, subscription_plan, feature_flags, created_at, updated_at
       FROM schools WHERE id = $1 LIMIT 1`,
      [Number(req.params.id)]
    )
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'School not found.' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('School fetch error:', err.message)
    res.status(500).json({ success: false, message: 'Unable to load school.' })
  }
})

router.post('/', protect, canManageSchools, async (req, res) => {
  const client = await pool.connect()
  try {
    await ensureSchoolSchema()

    const name = String(req.body.name || '').trim()
    const code = normalizeSchoolCode(req.body.code || name)
    const status = String(req.body.status || 'trial').trim().toLowerCase()
    const subscription_plan = String(req.body.subscription_plan || 'basic').trim().toLowerCase()
    const feature_flags = Array.isArray(req.body.feature_flags) ? req.body.feature_flags : []

    if (!name) {
      return res.status(400).json({ success: false, message: 'School name is required.' })
    }

    const adminEmail = String(req.body.adminEmail || '').trim().toLowerCase()
    const adminPassword = String(req.body.adminPassword || crypto.randomBytes(12).toString('base64url') + '!9Aa').trim()
    const adminName = String(req.body.adminName || '').trim()
    if (!adminName) {
      return res.status(422).json({ success: false, message: 'School administrator name is required.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return res.status(422).json({ success: false, message: 'A valid school administrator email is required.' })
    }
    if (adminPassword.length < 10) {
      return res.status(422).json({ success: false, message: 'Administrator password must be at least 10 characters.' })
    }
    const username = adminEmail.split('@')[0]

    await client.query('BEGIN')
    await applyTenantContext(client)

    // 1. Create school
    const schoolRes = await client.query(
      `INSERT INTO schools (name, code, status, subscription_plan, feature_flags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, code, status, subscription_plan, feature_flags, created_at, updated_at`,
      [name, code, status, subscription_plan, JSON.stringify(feature_flags)]
    )
    const newSchool = schoolRes.rows[0]
    const schoolId = newSchool.id

    // 2. Create settings
    await client.query(
      `INSERT INTO settings (school_id, school_name, school_address, school_phone, school_email, principal_name, twilio_config, module_access, school_access, superapp_modules, branding_config)
       VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (school_id) DO NOTHING`,
      [
        schoolId,
        name,
        String(req.body.address || '').trim(),
        String(req.body.phone || '').trim(),
        String(req.body.email || '').trim(),
        String(req.body.principalName || '').trim(),
      ]
    )

    // 3. Create admin user
    const hashed = await bcrypt.hash(adminPassword, 10)
    await client.query(
      `INSERT INTO users (school_id, name, email, password, role, designation, is_active, username, permissions)
       VALUES ($1, $2, $3, $4, 'admin', 'School Administrator', true, $5, '[]'::jsonb)`,
      [schoolId, adminName, adminEmail, hashed, username]
    )

    await client.query('COMMIT')

    res.status(201).json({
      success: true,
      data: newSchool,
      admin_credentials: {
        email: adminEmail,
        password: adminPassword,
        name: adminName
      },
      message: 'School created and administrator credentials provisioned successfully.'
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('School create transaction error:', err.message)
    res.status(500).json({ success: false, message: 'Unable to create school: ' + err.message })
  } finally {
    client.release()
  }
})

router.put('/:id', protect, canManageSchools, async (req, res) => {
  try {
    await ensureSchoolSchema()

    const schoolId = Number(req.params.id)
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined
    const status = typeof req.body.status === 'string' ? req.body.status.trim().toLowerCase() : undefined
    const subscription_plan = typeof req.body.subscription_plan === 'string' ? req.body.subscription_plan.trim().toLowerCase() : undefined
    const code = req.body.code ? normalizeSchoolCode(req.body.code) : undefined
    const feature_flags = Array.isArray(req.body.feature_flags) ? req.body.feature_flags : undefined

    const updates = []
    const params = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    if (code !== undefined) {
      updates.push(`code = $${paramIndex++}`)
      params.push(code)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (subscription_plan !== undefined) {
      updates.push(`subscription_plan = $${paramIndex++}`)
      params.push(subscription_plan)
    }
    if (feature_flags !== undefined) {
      updates.push(`feature_flags = $${paramIndex++}`)
      params.push(JSON.stringify(feature_flags))
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No valid school fields provided to update.' })
    }

    params.push(schoolId)
    const result = await query(
      `UPDATE schools SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, name, code, status, subscription_plan, feature_flags, created_at, updated_at`,
      params
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'School not found.' })
    }

    res.json({ success: true, data: result.rows[0], message: 'School updated successfully.' })
  } catch (err) {
    console.error('School update error:', err.message)
    res.status(500).json({ success: false, message: 'Unable to update school.' })
  }
})

router.delete('/:id', protect, canManageSchools, async (req, res) => {
  try {
    const schoolId = Number(req.params.id)
    if (schoolId === 1) {
      return res.status(403).json({ success: false, message: 'Default school cannot be removed.' })
    }

    const result = await query('DELETE FROM schools WHERE id = $1 RETURNING id, name', [schoolId])
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'School not found.' })
    }

    res.json({ success: true, data: result.rows[0], message: 'School removed successfully.' })
  } catch (err) {
    console.error('School delete error:', err.message)
    res.status(500).json({ success: false, message: 'Unable to remove school.' })
  }
})

module.exports = router
