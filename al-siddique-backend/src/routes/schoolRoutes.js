const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')

const canManageSchools = requireRoles('super_admin')

function normalizeSchoolCode(value) {
  if (!value || typeof value !== 'string') return null
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}

async function ensureSchoolSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id                SERIAL PRIMARY KEY,
      name              VARCHAR(150) NOT NULL,
      code              VARCHAR(50) UNIQUE,
      status            VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','trial','suspended','closed')),
      subscription_plan VARCHAR(50) DEFAULT 'basic',
      feature_flags     JSONB DEFAULT '[]'::jsonb,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    );
  `)
  await pool.query('ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT \'basic\';')
  await pool.query('ALTER TABLE schools ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT \'[]\'::jsonb;')
}

router.get('/', protect, canManageSchools, async (req, res) => {
  try {
    await ensureSchoolSchema()
    const result = await pool.query(
      `SELECT id, name, code, status, subscription_plan, feature_flags, created_at, updated_at
       FROM schools
       ORDER BY id ASC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('School list error:', err.message)
    res.status(500).json({ success: false, message: 'Unable to load schools.' })
  }
})

router.get('/:id', protect, canManageSchools, async (req, res) => {
  try {
    await ensureSchoolSchema()
    const result = await pool.query(
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

    const adminEmail = String(req.body.adminEmail || `admin@${code || 'school'}.apex.com`).trim().toLowerCase()
    const adminPassword = String(req.body.adminPassword || crypto.randomBytes(6).toString('hex') + 'Pass!').trim()
    const adminName = String(req.body.adminName || `Admin - ${name}`).trim()
    const username = adminEmail.split('@')[0]

    await client.query('BEGIN')

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
      [schoolId, name, req.body.address || 'School Address', req.body.phone || '', req.body.email || '', req.body.principalName || 'Principal']
    )

    // 3. Create admin user
    const hashed = await bcrypt.hash(adminPassword, 10)
    await client.query(
      `INSERT INTO users (school_id, name, email, password, role, designation, is_active, username, permissions)
       VALUES ($1, $2, $3, $4, 'admin', 'Principal', true, $5, '[]'::jsonb)`,
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
      message: 'School created and default settings/admin credentials provisioned successfully.'
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
    const result = await pool.query(
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

    const result = await pool.query('DELETE FROM schools WHERE id = $1 RETURNING id, name', [schoolId])
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
