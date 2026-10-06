const express = require('express')
const { randomUUID } = require('crypto')
const router = express.Router()
const { pool, query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canReadFamilies = requireRoles('super_admin', 'admin', 'principal', 'school_admin', 'teacher', 'accountant')
const canManageFamilies = requireRoles('super_admin', 'admin', 'principal', 'school_admin')

let schemaReady = null
async function ensureFamilySchema() {
  if (schemaReady) return true
  const result = await query("SELECT to_regclass('public.family_groups') AS table_name")
  if (!result.rows[0]?.table_name) {
    const err = new Error('family_groups schema migration is not applied.')
    err.code = 'FAMILY_SCHEMA_NOT_READY'
    throw err
  }
  schemaReady = true
  return true
}

function normalizeFamilyCode(value) {
  return String(value || '').trim().slice(0, 64)
}

function familyCodeForSchool(schoolId) {
  return `FAM-${schoolId}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

async function loadFamiliesForSchool(schoolId) {
  await ensureFamilySchema()
  const [groupResult, studentResult] = await Promise.all([
    query(`
      SELECT id, code, father_name, phone, created_at
      FROM family_groups
      WHERE school_id = $1
      ORDER BY created_at DESC, id DESC
    `, [schoolId]),
    query(`
      SELECT id, name, gr_number, class, section, father_name, parent_phone, parent_whatsapp, family_code
      FROM students
      WHERE school_id = $1 AND is_active = true
      ORDER BY class, section, roll_number, name
    `, [schoolId]),
  ])

  const families = new Map()
  groupResult.rows.forEach(row => {
    families.set(row.code, {
      id: row.id,
      code: row.code,
      fatherName: row.father_name || '',
      phone: row.phone || '',
      createdAt: row.created_at,
      students: [],
      registered: true,
    })
  })

  studentResult.rows.forEach(student => {
    const code = normalizeFamilyCode(student.family_code)
    if (!code) return
    if (!families.has(code)) {
      families.set(code, {
        id: null,
        code,
        fatherName: student.father_name || '',
        phone: student.parent_whatsapp || student.parent_phone || '',
        createdAt: null,
        students: [],
        registered: false,
      })
    }
    families.get(code).students.push({
      id: student.id,
      name: student.name,
      gr: student.gr_number || '',
      class: student.class || '',
      section: student.section || '',
    })
  })

  return Array.from(families.values()).sort((a, b) => String(a.code).localeCompare(String(b.code)))
}

router.get('/', protect, canReadFamilies, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const families = await loadFamiliesForSchool(schoolId)
    res.json({ success: true, count: families.length, data: families })
  } catch (err) {
    console.error('Family list error:', err.message)
    res.status(err.code === 'FAMILY_SCHEMA_NOT_READY' ? 503 : 500).json({ success: false, message: err.code === 'FAMILY_SCHEMA_NOT_READY' ? 'Family storage is not initialized.' : 'Families could not be loaded.' })
  }
})

router.post('/', protect, canManageFamilies, async (req, res) => {
  const fatherName = String(req.body?.father_name || req.body?.fatherName || '').trim().slice(0, 180)
  const phone = String(req.body?.phone || '').trim().slice(0, 40)
  if (!fatherName) return res.status(422).json({ success: false, message: 'Father/guardian name is required.' })

  try {
    await ensureFamilySchema()
    const schoolId = currentSchoolId(req)
    let created = null
    for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
      const code = familyCodeForSchool(schoolId)
      try {
        const result = await query(`
          INSERT INTO family_groups (school_id, code, father_name, phone, created_by)
          VALUES ($1,$2,$3,$4,$5)
          RETURNING id, code, father_name, phone, created_at
        `, [schoolId, code, fatherName, phone || null, req.user?.id || null])
        created = result.rows[0]
      } catch (err) {
        if (err.code !== '23505') throw err
      }
    }
    if (!created) return res.status(409).json({ success: false, message: 'Could not allocate a unique family code.' })
    res.status(201).json({
      success: true,
      data: {
        id: created.id,
        code: created.code,
        fatherName: created.father_name || '',
        phone: created.phone || '',
        createdAt: created.created_at,
        students: [],
        registered: true,
      },
    })
  } catch (err) {
    console.error('Family create error:', err.message)
    res.status(500).json({ success: false, message: 'Family could not be created.' })
  }
})

router.post('/:code/students/:studentId', protect, canManageFamilies, async (req, res) => {
  const client = await pool.connect()
  try {
    await ensureFamilySchema()
    const schoolId = currentSchoolId(req)
    const code = normalizeFamilyCode(req.params.code)
    const studentId = Number(req.params.studentId)
    if (!code || !Number.isInteger(studentId)) return res.status(400).json({ success: false, message: 'Valid family code and student are required.' })

    await client.query('BEGIN')
    const familyResult = await client.query(`
      SELECT id, code FROM family_groups WHERE school_id = $1 AND code = $2 LIMIT 1
    `, [schoolId, code])

    if (!familyResult.rowCount) {
      const legacy = await client.query(`
        SELECT father_name, COALESCE(NULLIF(parent_whatsapp,''), NULLIF(parent_phone,'')) AS phone
        FROM students
        WHERE school_id = $1 AND family_code = $2
        LIMIT 1
      `, [schoolId, code])
      if (!legacy.rowCount) {
        await client.query('ROLLBACK')
        return res.status(404).json({ success: false, message: 'Family not found.' })
      }
      await client.query(`
        INSERT INTO family_groups (school_id, code, father_name, phone, created_by)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (school_id, code) DO NOTHING
      `, [schoolId, code, legacy.rows[0].father_name || '', legacy.rows[0].phone || null, req.user?.id || null])
    }

    const studentResult = await client.query(`
      UPDATE students
      SET family_code = $1, updated_at = NOW()
      WHERE id = $2 AND school_id = $3
      RETURNING id, name, gr_number, class, section, family_code
    `, [code, studentId, schoolId])
    if (!studentResult.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Student not found.' })
    }
    await client.query('COMMIT')
    res.json({ success: true, data: studentResult.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Family member add error:', err.message)
    res.status(500).json({ success: false, message: 'Student could not be linked to family.' })
  } finally {
    client.release()
  }
})

router.delete('/:code/students/:studentId', protect, canManageFamilies, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const code = normalizeFamilyCode(req.params.code)
    const studentId = Number(req.params.studentId)
    const result = await query(`
      UPDATE students
      SET family_code = NULL, updated_at = NOW()
      WHERE id = $1 AND school_id = $2 AND family_code = $3
      RETURNING id
    `, [studentId, schoolId, code])
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Family membership not found.' })
    res.json({ success: true })
  } catch (err) {
    console.error('Family member remove error:', err.message)
    res.status(500).json({ success: false, message: 'Student could not be removed from family.' })
  }
})

module.exports = router
