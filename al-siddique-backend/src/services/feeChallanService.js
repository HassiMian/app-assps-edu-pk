const { query } = require('../config/database')
const { hasColumn } = require('../middleware/tenant')

let studentFeeProfileReady = false

async function ensureStudentFeeProfileSchema() {
  if (studentFeeProfileReady) return
  await query(`
    CREATE TABLE IF NOT EXISTS student_fee_profiles (
      student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id),
      monthly_fee DECIMAL(10,2) DEFAULT 0,
      admission_fee DECIMAL(10,2) DEFAULT 0,
      registration_fee DECIMAL(10,2) DEFAULT 0,
      library_fee DECIMAL(10,2) DEFAULT 0,
      transport_fee DECIMAL(10,2) DEFAULT 0,
      exam_fee DECIMAL(10,2) DEFAULT 0,
      other_charges DECIMAL(10,2) DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_student_fee_profiles_school ON student_fee_profiles(school_id);
  `)
  await query('ALTER TABLE student_fee_profiles ALTER COLUMN school_id DROP DEFAULT').catch(() => {})
  studentFeeProfileReady = true
}

function asMoney(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

async function upsertStudentFeeProfile(studentId, schoolId, profile = {}) {
  await ensureStudentFeeProfileSchema()
  await query(`
    INSERT INTO student_fee_profiles (
      student_id, school_id, monthly_fee, admission_fee, registration_fee,
      library_fee, transport_fee, exam_fee, other_charges, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT (student_id) DO UPDATE SET
      school_id = EXCLUDED.school_id,
      monthly_fee = EXCLUDED.monthly_fee,
      admission_fee = EXCLUDED.admission_fee,
      registration_fee = EXCLUDED.registration_fee,
      library_fee = EXCLUDED.library_fee,
      transport_fee = EXCLUDED.transport_fee,
      exam_fee = EXCLUDED.exam_fee,
      other_charges = EXCLUDED.other_charges,
      updated_at = NOW()
  `, [
    studentId,
    schoolId,
    asMoney(profile.monthly_fee),
    asMoney(profile.admission_fee),
    asMoney(profile.registration_fee),
    asMoney(profile.library_fee),
    asMoney(profile.transport_fee),
    asMoney(profile.exam_fee),
    asMoney(profile.other_charges),
  ])
}

async function getStudentFeeProfile(studentId) {
  await ensureStudentFeeProfileSchema()
  const result = await query(
    'SELECT * FROM student_fee_profiles WHERE student_id = $1 LIMIT 1',
    [studentId]
  )
  return result.rows[0] || null
}

async function findExistingChallan({ studentId, month, year, schoolId }) {
  const supportsTenant = await hasColumn('fee_challans', 'school_id').catch(() => false)
  const sql = supportsTenant
    ? `SELECT f.*, s.name, s.gr_number, s.class, s.section, s.father_name, s.parent_phone
       FROM fee_challans f
       JOIN students s ON f.student_id = s.id
       WHERE f.student_id = $1 AND f.month = $2 AND f.year = $3 AND f.school_id = $4 AND s.school_id = $4
       LIMIT 1`
    : `SELECT f.*, s.name, s.gr_number, s.class, s.section, s.father_name, s.parent_phone
       FROM fee_challans f
       JOIN students s ON f.student_id = s.id
       WHERE f.student_id = $1 AND f.month = $2 AND f.year = $3
       LIMIT 1`
  const params = supportsTenant ? [studentId, month, year, schoolId] : [studentId, month, year]
  const result = await query(sql, params)
  return result.rows[0] || null
}

module.exports = {
  ensureStudentFeeProfileSchema,
  upsertStudentFeeProfile,
  getStudentFeeProfile,
  findExistingChallan,
  asMoney,
}
