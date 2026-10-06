const { query } = require('../config/database')
const { hasColumn } = require('../middleware/tenant')

function runQuery(db, sql, params = []) {
  return db?.query ? db.query(sql, params) : query(sql, params)
}

let studentFeeProfileReady = false

async function ensureStudentFeeProfileSchema() {
  if (studentFeeProfileReady) return true
  const result = await query(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_fee_profiles'
      AND column_name IN (
        'student_id','school_id','monthly_fee','tuition_fee','computer_fee','lab_fee',
        'admission_fee','registration_fee','library_fee','transport_fee','exam_fee','other_charges','updated_at'
      )
  `)
  if (Number(result.rows[0]?.count || 0) !== 13) {
    const error = new Error('student fee profile schema migration 007 is not applied.')
    error.code = 'STUDENT_FEE_PROFILE_SCHEMA_REQUIRED'
    throw error
  }
  studentFeeProfileReady = true
  return true
}

function asMoney(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

async function upsertStudentFeeProfile(studentId, schoolId, profile = {}, db = null) {
  if (!Number.isInteger(Number(studentId)) || Number(studentId) <= 0 || !Number.isInteger(Number(schoolId)) || Number(schoolId) <= 0) {
    throw new Error('Valid student and school context are required for the fee profile.')
  }
  await ensureStudentFeeProfileSchema()
  const result = await runQuery(db, `
    INSERT INTO student_fee_profiles (
      student_id, school_id, monthly_fee, tuition_fee, computer_fee, lab_fee,
      admission_fee, registration_fee, library_fee, transport_fee, exam_fee, other_charges, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
    ON CONFLICT (student_id) DO UPDATE SET
      school_id = EXCLUDED.school_id,
      monthly_fee = EXCLUDED.monthly_fee,
      tuition_fee = EXCLUDED.tuition_fee,
      computer_fee = EXCLUDED.computer_fee,
      lab_fee = EXCLUDED.lab_fee,
      admission_fee = EXCLUDED.admission_fee,
      registration_fee = EXCLUDED.registration_fee,
      library_fee = EXCLUDED.library_fee,
      transport_fee = EXCLUDED.transport_fee,
      exam_fee = EXCLUDED.exam_fee,
      other_charges = EXCLUDED.other_charges,
      updated_at = NOW()
    RETURNING *
  `, [
    studentId,
    schoolId,
    asMoney(profile.monthly_fee),
    asMoney(profile.tuition_fee),
    asMoney(profile.computer_fee),
    asMoney(profile.lab_fee),
    asMoney(profile.admission_fee),
    asMoney(profile.registration_fee),
    asMoney(profile.library_fee),
    asMoney(profile.transport_fee),
    asMoney(profile.exam_fee),
    asMoney(profile.other_charges),
  ])
  return result.rows[0] || null
}

async function getStudentFeeProfile(studentId, schoolId, db = null) {
  if (!Number.isInteger(Number(studentId)) || Number(studentId) <= 0 || !Number.isInteger(Number(schoolId)) || Number(schoolId) <= 0) {
    throw new Error('Valid student and school context are required for the fee profile.')
  }
  await ensureStudentFeeProfileSchema()
  const result = await runQuery(db,
    'SELECT * FROM student_fee_profiles WHERE student_id = $1 AND school_id = $2 LIMIT 1',
    [studentId, schoolId]
  )
  return result.rows[0] || null
}

async function findExistingChallan({ studentId, month, year, schoolId, db = null }) {
  if (!Number.isInteger(Number(studentId)) || Number(studentId) <= 0 || !Number.isInteger(Number(schoolId)) || Number(schoolId) <= 0) {
    throw new Error('Valid student and school context are required to find a challan.')
  }
  const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
  if (!supportsTenant) {
    const error = new Error('Fee challan storage is not tenant-safe yet.')
    error.code = 'FEE_SCHEMA_NOT_TENANT_SAFE'
    throw error
  }
  const result = await runQuery(db,
    `SELECT f.*, s.name, s.gr_number, s.class, s.section, s.father_name, s.parent_phone
     FROM fee_challans f
     JOIN students s ON f.student_id = s.id AND s.school_id = f.school_id
     WHERE f.student_id = $1 AND LOWER(TRIM(f.month)) = LOWER(TRIM($2)) AND f.year = $3 AND f.school_id = $4
     LIMIT 1`,
    [studentId, month, year, schoolId]
  )
  return result.rows[0] || null
}

module.exports = {
  ensureStudentFeeProfileSchema,
  upsertStudentFeeProfile,
  getStudentFeeProfile,
  findExistingChallan,
  asMoney,
}
