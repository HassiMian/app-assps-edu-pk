const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canRead = requireRoles('super_admin', 'admin', 'principal', 'school_admin', 'teacher', 'accountant')
const canManage = requireRoles('super_admin', 'admin', 'principal', 'school_admin')
const STATUSES = new Set(['Active', 'Paused', 'Maintenance'])

let schemaReady = null
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS transport_routes (
          id BIGSERIAL PRIMARY KEY,
          school_id INTEGER NOT NULL REFERENCES schools(id),
          name VARCHAR(160) NOT NULL,
          vehicle VARCHAR(160) NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
          status VARCHAR(32) NOT NULL DEFAULT 'Active',
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await query('CREATE INDEX IF NOT EXISTS idx_transport_routes_school ON transport_routes (school_id, name)')
    })().catch(err => { schemaReady = null; throw err })
  }
  return schemaReady
}

function normalize(body = {}) {
  const name = String(body.name || '').trim().slice(0, 160)
  const vehicle = String(body.vehicle || '').trim().slice(0, 160)
  const capacity = Number(body.capacity)
  const status = String(body.status || 'Active').trim()
  const errors = []
  if (!name) errors.push('Route name is required.')
  if (!vehicle) errors.push('Vehicle is required.')
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 500) errors.push('Capacity must be an integer between 0 and 500.')
  if (!STATUSES.has(status)) errors.push('Invalid route status.')
  return { errors, value: { name, vehicle, capacity, status } }
}

router.get('/', protect, canRead, async (req, res) => {
  try {
    await ensureSchema()
    const schoolId = currentSchoolId(req)
    const result = await query(`SELECT id, name, vehicle, capacity, status, created_at, updated_at FROM transport_routes WHERE school_id = $1 ORDER BY name, id`, [schoolId])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Transport list error:', err.message)
    res.status(500).json({ success: false, message: 'Transport routes could not be loaded.' })
  }
})

router.post('/', protect, canManage, async (req, res) => {
  const parsed = normalize(req.body)
  if (parsed.errors.length) return res.status(422).json({ success: false, message: 'Transport validation failed.', fieldErrors: parsed.errors })
  try {
    await ensureSchema()
    const schoolId = currentSchoolId(req)
    const { name, vehicle, capacity, status } = parsed.value
    const result = await query(`INSERT INTO transport_routes (school_id, name, vehicle, capacity, status, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, vehicle, capacity, status, created_at, updated_at`, [schoolId, name, vehicle, capacity, status, req.user?.id || null])
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Transport create error:', err.message)
    res.status(500).json({ success: false, message: 'Transport route could not be saved.' })
  }
})

router.put('/:id', protect, canManage, async (req, res) => {
  const parsed = normalize(req.body)
  if (parsed.errors.length) return res.status(422).json({ success: false, message: 'Transport validation failed.', fieldErrors: parsed.errors })
  try {
    await ensureSchema()
    const schoolId = currentSchoolId(req)
    const { name, vehicle, capacity, status } = parsed.value
    const result = await query(`UPDATE transport_routes SET name=$1, vehicle=$2, capacity=$3, status=$4, updated_at=NOW() WHERE id=$5 AND school_id=$6 RETURNING id, name, vehicle, capacity, status, created_at, updated_at`, [name, vehicle, capacity, status, Number(req.params.id), schoolId])
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Transport route not found.' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Transport update error:', err.message)
    res.status(500).json({ success: false, message: 'Transport route could not be updated.' })
  }
})

module.exports = router
