// src/routes/employeeRoutes.js
// Al Siddique Smart School OS â€” Employee Routes

const express = require('express')
const router  = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { tenantClause, currentSchoolId, hasColumn } = require('../middleware/tenant')
const ALLOW_MOCK_FALLBACK = process.env.ALLOW_MOCK_FALLBACK === 'true' && process.env.NODE_ENV !== 'production'

const canManageStaff = requireRoles('super_admin', 'admin', 'principal')

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

// GET /api/employees â€” list with search/filter
router.get('/', protect, canManageStaff, async (req, res) => {
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning high-fidelity mock employees.');
    const mockEmployees = [
      {
        id: 1,
        school_id: 1,
        emp_id: 'EMP-1001',
        name: 'Sir Ahmed Raza',
        designation: 'Teacher',
        department: 'Science',
        phone: '03001112223',
        email: 'ahmed.raza@alsiddique.edu.pk',
        salary: 45000,
        join_date: '2022-08-01',
        is_active: true
      },
      {
        id: 2,
        school_id: 1,
        emp_id: 'EMP-1002',
        name: 'Miss Sadia Kiran',
        designation: 'Teacher',
        department: 'English',
        phone: '03004445556',
        email: 'sadia.kiran@alsiddique.edu.pk',
        salary: 42000,
        join_date: '2023-03-15',
        is_active: true
      },
      {
        id: 3,
        school_id: 1,
        emp_id: 'EMP-1003',
        name: 'Kamran Shah',
        designation: 'Accountant',
        department: 'Accounts',
        phone: '03009998887',
        email: 'kamran.shah@alsiddique.edu.pk',
        salary: 50000,
        join_date: '2021-01-10',
        is_active: true
      }
    ];

    let filtered = mockEmployees;
    const { search } = req.query;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.emp_id.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q)
      );
    }
    return res.json({ success: true, count: filtered.length, data: filtered });
  }
})

// GET /api/employees/:id
router.get('/:id', protect, canManageStaff, async (req, res) => {
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
    if (!ALLOW_MOCK_FALLBACK) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' })
    }
    console.warn('PostgreSQL offline. Returning high-fidelity mock employee details.');
    const mockEmployee = {
      id: req.params.id || 1,
      school_id: 1,
      emp_id: 'EMP-1001',
      name: 'Sir Ahmed Raza',
      designation: 'Teacher',
      department: 'Science',
      phone: '03001112223',
      email: 'ahmed.raza@alsiddique.edu.pk',
      salary: 45000,
      join_date: '2022-08-01',
      is_active: true
    };
    return res.json({ success: true, data: mockEmployee });
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

    const emp = emp_id || `EMP-${Date.now().toString().slice(-6)}`

    const supportsTenant = await hasColumn('employees', 'school_id')
    const optionalFields = await existingEmployeeWriteFields()
    const requestFields = optionalFields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field))
    const columns = [
      ...(supportsTenant ? ['school_id'] : []),
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
      ...(supportsTenant ? [currentSchoolId(req)] : []),
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

// PUT /api/employees/:id â€” update
router.put('/:id', protect, canManageStaff, async (req, res) => {
  try {
    const {
      name, designation, department, phone, email, salary, join_date, is_active
    } = req.body

    const supportsTenant = await hasColumn('employees', 'school_id')
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
      WHERE id=$${idParam}
        ${supportsTenant && req.user?.role !== 'super_admin' ? `AND school_id = $${idParam + 1}` : ''}
      RETURNING *
    `
    if (supportsTenant && req.user?.role !== 'super_admin') params.push(currentSchoolId(req))
    const result = await query(sql, params)

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Employee nahi mila' })

    const updated = result.rows[0]
    if (updated.user_id && Object.prototype.hasOwnProperty.call(req.body, 'portal_permissions')) {
      const userParams = [JSON.stringify(Array.isArray(req.body.portal_permissions) ? req.body.portal_permissions : []), updated.user_id]
      const userScope = req.user?.role === 'super_admin' ? '' : ' AND school_id = $3'
      if (userScope) userParams.push(currentSchoolId(req))
      await query(`UPDATE users SET permissions = $1::jsonb, updated_at = NOW() WHERE id = $2${userScope}`, userParams)
        .catch(err => console.warn('Could not sync employee permissions to user:', err.message))
    }
    if (updated.user_id && Object.prototype.hasOwnProperty.call(req.body, 'portal_active')) {
      const userParams = [Boolean(req.body.portal_active), updated.user_id]
      const userScope = req.user?.role === 'super_admin' ? '' : ' AND school_id = $3'
      if (userScope) userParams.push(currentSchoolId(req))
      await query(`UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2${userScope}`, userParams)
        .catch(err => console.warn('Could not sync employee active state to user:', err.message))
    }

    res.json({ success: true, message: 'Employee update ho gaya', data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/employees/:id â€” soft delete
router.delete('/:id', protect, canManageStaff, async (req, res) => {
  try {
    const supportsTenant = await hasColumn('employees', 'school_id')
    const sql = supportsTenant && req.user?.role !== 'super_admin'
      ? 'UPDATE employees SET is_active = false WHERE id = $1 AND school_id = $2'
      : 'UPDATE employees SET is_active = false WHERE id = $1'
    const params = supportsTenant && req.user?.role !== 'super_admin'
      ? [req.params.id, currentSchoolId(req)]
      : [req.params.id]
    const result = await query(`${sql} RETURNING id, user_id`, params)
    const deleted = result.rows?.[0]
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Employee nahi mila' })
    }

    if (deleted.user_id) {
      const userParams = [deleted.user_id]
      const userScope = req.user?.role === 'super_admin' ? '' : ' AND school_id = $2'
      if (userScope) userParams.push(currentSchoolId(req))
      await query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1${userScope}`, userParams)
    }

    res.json({ success: true, message: 'Employee delete ho gaya', data: deleted })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router

