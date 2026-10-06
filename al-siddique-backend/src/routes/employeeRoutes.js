// src/routes/employeeRoutes.js
const crypto = require('crypto')
// Al Siddique Smart School OS â€” Employee Routes

const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles, adminOrServiceScope } = require('../middleware/auth')
const { tenantClause, currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')
const { provisionPortalUser, resetPortalUserPassword, setPortalUserActive } = require('../services/portalAccountService')

const canManageStaff = requireRoles('super_admin', 'admin', 'principal')
const canReadStaff = adminOrServiceScope('school.staff.read')


async function requireEmployeeWriteContext(req, res) {
  const supportsTenant = await hasColumn('employees', 'school_id')
  if (!supportsTenant) {
    res.status(503).json({ success: false, code: 'EMPLOYEE_TENANT_SCHEMA_REQUIRED', message: 'Employee storage is not tenant-safe for writes.' })
    return null
  }
  const schoolId = currentSchoolId(req)
  if (!schoolId) {
    res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'A school context is required for employee changes.' })
    return null
  }
  return schoolId
}

let employeeAttendanceSchemaReady = null
function ensureEmployeeAttendanceSchema() {
  if (!employeeAttendanceSchemaReady) {
    employeeAttendanceSchemaReady = query(`
      CREATE TABLE IF NOT EXISTS employee_attendance (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('Present','Absent','Leave','Late')),
        note TEXT,
        marked_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, employee_id, attendance_date)
      );
      CREATE INDEX IF NOT EXISTS idx_employee_attendance_school_date ON employee_attendance (school_id, attendance_date, employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_date ON employee_attendance (employee_id, attendance_date DESC);
    `).catch(err => { employeeAttendanceSchemaReady = null; throw err })
  }
  return employeeAttendanceSchemaReady
}

const EMPLOYEE_WRITE_FIELDS = [
  'father_name',
  'gender',
  'dob',
  'blood_group',
  'religion',
  'photo',
  'cnic',
  'marital_status',
  'nationality',
  'alt_phone',
  'address_street',
  'address_city',
  'address_tehsil',
  'address_district',
  'address_province',
  'emergency_name',
  'emergency_relation',
  'emergency_phone',
  'emergency_address',
  'subject',
  'contract_type',
  'probation_end',
  'highest_education',
  'degree_title',
  'institution',
  'graduation_year',
  'experience_years',
  'previous_employer',
  'previous_role',
  'bank_name',
  'account_number',
  'account_title',
  'iban',
  'branch_name',
  'app_access',
  'portal_username',
  'portal_password',
  'portal_role',
  'portal_permissions',
  'portal_active',
]

async function existingEmployeeWriteFields() {
  const supported = []
  for (const field of EMPLOYEE_WRITE_FIELDS) {
    if (await hasColumn('employees', field)) supported.push(field)
  }
  return supported
}

function jsonValue(field, value) {
  if (['app_access', 'portal_permissions'].includes(field)) {
    return JSON.stringify(Array.isArray(value) ? value : [])
  }
  if (['dob', 'probation_end'].includes(field) && value === '') return null
  return value ?? null
}

function nullableDate(value) {
  return value === '' || value === undefined ? null : value
}


// GET /api/employees/attendance?date=YYYY-MM-DD
router.get('/attendance', protect, canReadStaff, async (req, res) => {
  try {
    await ensureEmployeeAttendanceSchema()
    const schoolId = currentSchoolId(req)
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(422).json({ success:false, message:'Valid attendance date is required.' })
    const result = await query(`
      SELECT e.id AS employee_id, e.emp_id, e.name, e.designation, e.department,
             a.id AS attendance_id, a.status, a.note, a.updated_at
      FROM employees e
      LEFT JOIN employee_attendance a
        ON a.employee_id = e.id AND a.school_id = e.school_id AND a.attendance_date = $2
      WHERE e.school_id = $1 AND e.is_active = true
      ORDER BY e.name, e.id
    `, [schoolId, date])
    res.json({ success:true, date, count:result.rowCount, data:result.rows })
  } catch (err) {
    console.error('Employee attendance load error:', err.message)
    res.status(500).json({ success:false, message:'Employee attendance could not be loaded.' })
  }
})

// GET /api/employees/attendance/summary?month=YYYY-MM
router.get('/attendance/summary', protect, canReadStaff, async (req, res) => {
  try {
    await ensureEmployeeAttendanceSchema()
    const schoolId = currentSchoolId(req)
    const month = String(req.query.month || '').trim()
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(422).json({ success:false, message:'Valid month is required.' })
    const result = await query(`
      SELECT employee_id,
             COUNT(*) FILTER (WHERE status = 'Present')::int AS present,
             COUNT(*) FILTER (WHERE status = 'Absent')::int AS absent,
             COUNT(*) FILTER (WHERE status = 'Leave')::int AS leave,
             COUNT(*) FILTER (WHERE status = 'Late')::int AS late,
             COUNT(*)::int AS marked_days
      FROM employee_attendance
      WHERE school_id = $1 AND to_char(attendance_date, 'YYYY-MM') = $2
      GROUP BY employee_id
    `, [schoolId, month])
    res.json({ success:true, month, data:result.rows })
  } catch (err) {
    console.error('Employee attendance summary error:', err.message)
    res.status(500).json({ success:false, message:'Employee attendance summary could not be loaded.' })
  }
})

// PUT /api/employees/attendance/bulk
router.put('/attendance/bulk', protect, canManageStaff, async (req, res) => {
  const date = String(req.body?.date || '').trim()
  const records = Array.isArray(req.body?.records) ? req.body.records : []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(422).json({ success:false, message:'Valid attendance date is required.' })
  if (!records.length) return res.status(422).json({ success:false, message:'At least one attendance record is required.' })
  const allowed = new Set(['Present','Absent','Leave','Late'])
  const normalized = []
  for (const record of records) {
    const employeeId = Number(record?.employee_id)
    const status = String(record?.status || '').trim()
    const note = String(record?.note || '').trim().slice(0, 1000)
    if (!Number.isInteger(employeeId) || employeeId <= 0 || !allowed.has(status)) {
      return res.status(422).json({ success:false, message:'Each attendance record requires a valid employee and status.' })
    }
    normalized.push({ employeeId, status, note })
  }

  const { pool } = require('../config/database')
  const client = await pool.connect()
  try {
    await ensureEmployeeAttendanceSchema()
    const schoolId = currentSchoolId(req)
    await client.query('BEGIN')
    const employeeIds = [...new Set(normalized.map(item => item.employeeId))]
    const owned = await client.query('SELECT id FROM employees WHERE school_id=$1 AND is_active=true AND id = ANY($2::int[])', [schoolId, employeeIds])
    if (owned.rowCount !== employeeIds.length) {
      await client.query('ROLLBACK')
      return res.status(422).json({ success:false, message:'One or more employees do not belong to this school or are inactive.' })
    }
    for (const item of normalized) {
      await client.query(`
        INSERT INTO employee_attendance (school_id, employee_id, attendance_date, status, note, marked_by)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (school_id, employee_id, attendance_date)
        DO UPDATE SET status=EXCLUDED.status, note=EXCLUDED.note, marked_by=EXCLUDED.marked_by, updated_at=NOW()
      `, [schoolId, item.employeeId, date, item.status, item.note || null, req.user?.id || null])
    }
    await client.query('COMMIT')
    res.json({ success:true, count:normalized.length, message:'Employee attendance saved.' })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Employee attendance save error:', err.message)
    res.status(500).json({ success:false, message:'Employee attendance could not be saved.' })
  } finally {
    client.release()
  }
})

// GET /api/employees â€” list with search/filter
router.get('/', protect, canReadStaff, async (req, res) => {
  try {
    const { search, active = true } = req.query
    let sql    = 'SELECT * FROM employees WHERE is_active = $1'
    let params = [active]
    let i = 2
    const tenant = await tenantClause(req, { table: 'employees', paramIndex: i })
    sql += tenant.clause
    params.push(...tenant.params)
    i = tenant.nextIndex

    if (search)  {
      sql += ` AND (name ILIKE $${i} OR emp_id ILIKE $${i} OR designation ILIKE $${i})`
      params.push(`%${search}%`); i++
    }
    sql += ' ORDER BY name'

    const result = await query(sql, params)
    res.json({ success: true, count: result.rowCount, data: result.rows })
  } catch (err) {
    console.error('Employee list error:', err.message)
    return res.status(503).json({ success: false, message: 'Employee directory is temporarily unavailable.' })
  }
})

// GET /api/employees/:id
router.get('/:id', protect, canReadStaff, async (req, res) => {
  try {
    let sql = 'SELECT * FROM employees WHERE id = $1'
    const params = [req.params.id]
    const tenant = await tenantClause(req, { table: 'employees', paramIndex: 2 })
    sql += tenant.clause
    params.push(...tenant.params)
    const result = await query(sql, params)
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Employee nahi mila' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Employee detail error:', err.message)
    return res.status(503).json({ success: false, message: 'Employee record is temporarily unavailable.' })
  }
})

// POST /api/employees â€” add employee
router.post('/', protect, canManageStaff, async (req, res) => {
  try {
    const {
      emp_id, name, designation, department, phone, email, salary, join_date
    } = req.body

    if (!name || !designation)
      return res.status(400).json({ success: false, message: 'Name aur Designation zaroori hai' })

    const emp = emp_id || `EMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const schoolId = await requireEmployeeWriteContext(req, res)
    if (!schoolId) return
    const optionalFields = await existingEmployeeWriteFields()
    const requestFields = optionalFields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field))
    const columns = [
      'school_id',
      'emp_id',
      'name',
      'designation',
      'department',
      'phone',
      'email',
      'salary',
      'join_date',
      ...requestFields,
    ]
    const values = [
      schoolId,
      emp,
      name,
      designation,
      department,
      phone,
      email,
      salary,
      nullableDate(join_date),
      ...requestFields.map(field => jsonValue(field, req.body[field])),
    ]
    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(',')
    const result = await query(`
      INSERT INTO employees (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `, values)

    res.status(201).json({ success: true, message: 'Employee add ho gaya', data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ success: false, message: 'EMP ID already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/employees/:id/portal-account
router.get('/:id/portal-account', protect, canManageStaff, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const employee = await query(`
      SELECT id, name, designation, phone, email, user_id, portal_role, portal_permissions, portal_active
      FROM employees
      WHERE id = $1 AND school_id = $2
      LIMIT 1
    `, [Number(req.params.id), schoolId])
    if (!employee.rowCount) return res.status(404).json({ success: false, message: 'Employee not found.' })
    const row = employee.rows[0]
    if (!row.user_id) return res.json({ success: true, data: null })
    const supportsUsername = await hasColumn('users', 'username').catch(() => false)
    const supportsPermissions = await hasColumn('users', 'permissions').catch(() => false)
    const supportsLastLogin = await hasColumn('users', 'last_login').catch(() => false)
    const user = await query(`
      SELECT id, name, email, role, designation, is_active
        ${supportsUsername ? ', username' : ''}
        ${supportsPermissions ? ', permissions' : ''}
        ${supportsLastLogin ? ', last_login' : ''}
      FROM users
      WHERE id = $1 AND school_id = $2
      LIMIT 1
    `, [row.user_id, schoolId])
    res.json({ success: true, data: user.rows[0] || null })
  } catch (err) {
    console.error('Employee portal read error:', err.message)
    res.status(500).json({ success: false, message: 'Employee portal account could not be loaded.' })
  }
})

router.post('/:id/portal-account', protect, canManageStaff, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const employee = await query(`
      SELECT id, emp_id, name, designation, phone, email, user_id, portal_role, portal_permissions, portal_active
      FROM employees
      WHERE id = $1 AND school_id = $2
      LIMIT 1
    `, [Number(req.params.id), schoolId])
    if (!employee.rowCount) return res.status(404).json({ success: false, message: 'Employee not found.' })
    const row = employee.rows[0]
    const role = String(req.body?.role || row.portal_role || 'teacher').trim().toLowerCase()
    const username = String(req.body?.username || row.emp_id || `EMP-${row.id}`).trim()
    const email = String(row.email || `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@staff.assps.edu.pk`).trim().toLowerCase()
    const permissions = Array.isArray(req.body?.permissions)
      ? req.body.permissions
      : (Array.isArray(row.portal_permissions) ? row.portal_permissions : [])
    const account = await provisionPortalUser({
      schoolId,
      tenantId: currentTenantId(req) || null,
      userId: row.user_id || null,
      name: row.name,
      email,
      username,
      role,
      designation: row.designation || 'Staff',
      phone: row.phone || null,
      permissions,
      active: row.portal_active !== false,
    })

    const updates = []
    const params = []
    let i = 1
    if (await hasColumn('employees', 'user_id').catch(() => false)) { updates.push(`user_id = $${i++}`); params.push(account.user.id) }
    if (await hasColumn('employees', 'portal_username').catch(() => false)) { updates.push(`portal_username = $${i++}`); params.push(account.user.username || username) }
    if (await hasColumn('employees', 'portal_role').catch(() => false)) { updates.push(`portal_role = $${i++}`); params.push(role) }
    if (await hasColumn('employees', 'portal_active').catch(() => false)) { updates.push(`portal_active = $${i++}`); params.push(true) }
    if (await hasColumn('employees', 'portal_password').catch(() => false)) { updates.push(`portal_password = NULL`) }
    if (updates.length) {
      params.push(row.id, schoolId)
      await query(`UPDATE employees SET ${updates.join(', ')} WHERE id = $${i++} AND school_id = $${i}`, params)
    }

    res.status(account.created ? 201 : 200).json({
      success: true,
      data: account.user,
      credentials: {
        username: account.user?.username || username,
        email: account.user?.email || email,
        password: account.temporaryPassword,
        created: account.created,
      },
    })
  } catch (err) {
    console.error('Employee portal provision error:', err.message)
    res.status(500).json({ success: false, message: err.message || 'Employee portal account could not be created.' })
  }
})

router.post('/:id/portal-account/reset', protect, canManageStaff, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const employee = await query('SELECT user_id FROM employees WHERE id = $1 AND school_id = $2 LIMIT 1', [Number(req.params.id), schoolId])
    const userId = employee.rows[0]?.user_id
    if (!userId) return res.status(404).json({ success: false, message: 'Employee portal account is not linked yet.' })
    const reset = await resetPortalUserPassword({ schoolId, userId })
    res.json({ success: true, data: reset.user, credentials: { username: reset.user?.username || reset.user?.email || '', email: reset.user?.email || '', password: reset.temporaryPassword, created: false } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Password reset failed.' })
  }
})

router.put('/:id/portal-account/active', protect, canManageStaff, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const employee = await query('SELECT user_id FROM employees WHERE id = $1 AND school_id = $2 LIMIT 1', [Number(req.params.id), schoolId])
    const userId = employee.rows[0]?.user_id
    if (!userId) return res.status(404).json({ success: false, message: 'Employee portal account is not linked yet.' })
    const user = await setPortalUserActive({ schoolId, userId, active: req.body?.active !== false })
    if (await hasColumn('employees', 'portal_active').catch(() => false)) {
      await query('UPDATE employees SET portal_active = $1 WHERE id = $2 AND school_id = $3', [Boolean(req.body?.active !== false), Number(req.params.id), schoolId])
    }
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Employee portal state could not be updated.' })
  }
})

router.put('/:id/portal-account/permissions', protect, canManageStaff, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : []
    const employee = await query('SELECT user_id FROM employees WHERE id = $1 AND school_id = $2 LIMIT 1', [Number(req.params.id), schoolId])
    const userId = employee.rows[0]?.user_id
    if (!userId) return res.status(404).json({ success: false, message: 'Employee portal account is not linked yet.' })
    if (await hasColumn('users', 'permissions').catch(() => false)) {
      await query('UPDATE users SET permissions = $1::jsonb, updated_at = NOW() WHERE id = $2 AND school_id = $3', [JSON.stringify(permissions), userId, schoolId])
    }
    if (await hasColumn('employees', 'portal_permissions').catch(() => false)) {
      await query('UPDATE employees SET portal_permissions = $1::jsonb WHERE id = $2 AND school_id = $3', [JSON.stringify(permissions), Number(req.params.id), schoolId])
    }
    res.json({ success: true, data: { permissions } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Employee permissions could not be updated.' })
  }
})

router.delete('/:id/portal-account', protect, canManageStaff, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const employeeId = Number(req.params.id)
    const employee = await query('SELECT user_id FROM employees WHERE id = $1 AND school_id = $2 LIMIT 1', [employeeId, schoolId])
    const userId = employee.rows[0]?.user_id
    if (!userId) return res.status(404).json({ success: false, message: 'Employee portal account is not linked yet.' })
    await setPortalUserActive({ schoolId, userId, active: false })
    const assignments = ['user_id = NULL']
    if (await hasColumn('employees', 'portal_active').catch(() => false)) assignments.push('portal_active = false')
    if (await hasColumn('employees', 'portal_password').catch(() => false)) assignments.push('portal_password = NULL')
    await query(`UPDATE employees SET ${assignments.join(', ')} WHERE id = $1 AND school_id = $2`, [employeeId, schoolId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Employee portal access could not be revoked.' })
  }
})

// PUT /api/employees/:id â€” update
router.put('/:id', protect, canManageStaff, async (req, res) => {
  try {
    const {
      name, designation, department, phone, email, salary, join_date, is_active
    } = req.body

    const schoolId = await requireEmployeeWriteContext(req, res)
    if (!schoolId) return
    const optionalFields = await existingEmployeeWriteFields()
    const updateFields = [
      ...(Object.prototype.hasOwnProperty.call(req.body, 'name') ? [['name', name]] : []),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'designation') ? [['designation', designation]] : []),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'department') ? [['department', department]] : []),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'phone') ? [['phone', phone]] : []),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'email') ? [['email', email]] : []),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'salary') ? [['salary', salary]] : []),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'join_date') ? [['join_date', nullableDate(join_date)]] : []),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'is_active') ? [['is_active', is_active]] : []),
      ...optionalFields
        .filter(field => Object.prototype.hasOwnProperty.call(req.body, field))
        .map(field => [field, jsonValue(field, req.body[field])]),
    ]
    if (!updateFields.length) {
      return res.status(400).json({ success: false, message: 'No employee fields supplied for update.' })
    }
    const params = updateFields.map(([, value]) => value)
    const setClause = updateFields.map(([field], idx) => `${field}=$${idx + 1}`).join(', ')
    params.push(req.params.id)
    const idParam = params.length
    const sql = `
      UPDATE employees SET ${setClause}
      WHERE id=$${idParam} AND school_id = $${idParam + 1}
      RETURNING *
    `
    params.push(schoolId)
    const result = await query(sql, params)

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Employee nahi mila' })

    const updated = result.rows[0]
    if (updated.user_id && Object.prototype.hasOwnProperty.call(req.body, 'portal_permissions')) {
      const userParams = [JSON.stringify(Array.isArray(req.body.portal_permissions) ? req.body.portal_permissions : []), updated.user_id]
      userParams.push(schoolId)
      await query('UPDATE users SET permissions = $1::jsonb, updated_at = NOW() WHERE id = $2 AND school_id = $3', userParams)
    }
    if (updated.user_id && Object.prototype.hasOwnProperty.call(req.body, 'portal_active')) {
      const userParams = [Boolean(req.body.portal_active), updated.user_id]
      userParams.push(schoolId)
      await query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', userParams)
    }

    res.json({ success: true, message: 'Employee update ho gaya', data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/employees/:id â€” soft delete
router.delete('/:id', protect, canManageStaff, async (req, res) => {
  try {
    const schoolId = await requireEmployeeWriteContext(req, res)
    if (!schoolId) return
    const result = await query(
      'UPDATE employees SET is_active = false WHERE id = $1 AND school_id = $2 RETURNING id, user_id',
      [req.params.id, schoolId]
    )
    const deleted = result.rows?.[0]
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Employee nahi mila' })
    }

    if (deleted.user_id) {
      await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2', [deleted.user_id, schoolId])
    }

    res.json({ success: true, message: 'Employee delete ho gaya', data: deleted })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router

