const crypto = require('crypto')
const bcrypt = require('bcryptjs')

function clean(value) {
  return String(value || '').trim()
}

function normalizePhone(value) {
  return clean(value).replace(/\D/g, '')
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'user'
}

function tempPassword(prefix = 'APX') {
  return `${prefix}-${crypto.randomBytes(9).toString('base64url')}`
}

async function schoolContext(db, schoolId) {
  const result = await db.query(
    `SELECT id, code, tenant_id, COALESCE(name, school_name) AS school_name
     FROM schools WHERE id = $1 LIMIT 1`,
    [schoolId],
  )
  const school = result.rows[0]
  if (!school) throw new Error('School context not found for portal identity provisioning.')
  return {
    schoolId: Number(school.id),
    schoolCode: clean(school.code).toLowerCase() || `school${school.id}`,
    tenantId: clean(school.tenant_id) || clean(school.code).toLowerCase() || String(school.id),
    schoolName: school.school_name || null,
  }
}

function schoolDomain(ctx) {
  return ctx.schoolCode === 'assps' ? 'assps.edu.pk' : `${ctx.schoolCode}.apex.com`
}

async function rotateTemporaryPassword(db, userId, prefix = 'APX') {
  const plain = tempPassword(prefix)
  const hash = await bcrypt.hash(plain, 12)
  const result = await db.query(
    `UPDATE users
     SET password = $1, must_change_password = true, updated_at = NOW()
     WHERE id = $2 AND is_active = true
     RETURNING id, email, username, role`,
    [hash, userId],
  )
  if (!result.rows[0]) throw new Error('Portal user not found for credential issuance.')
  return { user: result.rows[0], temporaryPassword: plain }
}

async function ensureStudentIdentity(db, { schoolId, student }) {
  const ctx = await schoolContext(db, schoolId)
  const gr = clean(student.gr_number)
  if (!gr) throw new Error('Student GR number is required for portal identity.')
  const domain = schoolDomain(ctx)
  const email = `student_${gr.toLowerCase()}@${domain}`
  const username = gr

  let result = await db.query(
    `SELECT id, email, username, role
     FROM users
     WHERE school_id = $1 AND is_active = true AND role = 'student'
       AND (LOWER(COALESCE(username,'')) = LOWER($2) OR LOWER(email) = LOWER($3))
     ORDER BY id LIMIT 1`,
    [ctx.schoolId, username, email],
  )

  if (result.rows[0]) {
    const user = result.rows[0]
    await db.query(
      `UPDATE users SET tenant_id = $1, username = COALESCE(NULLIF(username,''), $2), updated_at = NOW()
       WHERE id = $3`,
      [ctx.tenantId, username, user.id],
    )
    return { userId: user.id, email: user.email, loginId: user.username || username, created: false, temporaryPassword: null }
  }

  const temporaryPassword = tempPassword('STU')
  const hash = await bcrypt.hash(temporaryPassword, 12)
  result = await db.query(
    `INSERT INTO users (
       school_id, tenant_id, name, email, username, password, role, designation,
       phone, is_active, must_change_password, entity_type, entity_id
     ) VALUES ($1,$2,$3,$4,$5,$6,'student','Student',$7,true,true,'student',$8)
     RETURNING id, email, username`,
    [ctx.schoolId, ctx.tenantId, student.name || 'Student', email, username, hash,
      student.parent_phone || student.parent_whatsapp || null, student.id],
  )
  return { userId: result.rows[0].id, email: result.rows[0].email, loginId: result.rows[0].username, created: true, temporaryPassword }
}

async function ensureParentIdentity(db, { schoolId, student }) {
  const ctx = await schoolContext(db, schoolId)
  const domain = schoolDomain(ctx)
  const phone = normalizePhone(student.parent_phone || student.parent_whatsapp)
  const familyCode = clean(student.family_code)
  const identityPart = phone
    ? phone
    : familyCode
      ? `family_${slug(familyCode)}`
      : `student_${student.id}`
  const email = `parent_${identityPart.toLowerCase()}@${domain}`
  const loginId = phone || familyCode || email

  let result
  if (phone) {
    result = await db.query(
      `SELECT id, email, username, role
       FROM users
       WHERE school_id = $1 AND is_active = true AND role = 'parent'
         AND (
           LOWER(email) = LOWER($2)
           OR (COALESCE(entity_type,'') <> 'parent_distinct'
               AND regexp_replace(COALESCE(phone,''),'[^0-9]','','g') = $3)
         )
       ORDER BY id LIMIT 1`,
      [ctx.schoolId, email, phone],
    )
  } else {
    result = await db.query(
      `SELECT id, email, username, role
       FROM users
       WHERE school_id = $1 AND is_active = true AND role = 'parent' AND LOWER(email) = LOWER($2)
       ORDER BY id LIMIT 1`,
      [ctx.schoolId, email],
    )
  }

  if (result.rows[0]) {
    const user = result.rows[0]
    await db.query(`UPDATE users SET tenant_id = $1, updated_at = NOW() WHERE id = $2`, [ctx.tenantId, user.id])
    return { userId: user.id, email: user.email, loginId, created: false, temporaryPassword: null }
  }

  const temporaryPassword = tempPassword('PAR')
  const hash = await bcrypt.hash(temporaryPassword, 12)
  result = await db.query(
    `INSERT INTO users (
       school_id, tenant_id, name, email, username, password, role, designation,
       phone, is_active, must_change_password, entity_type, entity_id
     ) VALUES ($1,$2,$3,$4,$5,$6,'parent','Parent',$7,true,true,'parent',$8)
     RETURNING id, email, username`,
    [ctx.schoolId, ctx.tenantId, student.father_name || 'Parent', email, phone || familyCode || null,
      hash, phone || null, student.id],
  )
  return { userId: result.rows[0].id, email: result.rows[0].email, loginId, created: true, temporaryPassword }
}

async function provisionStudentIdentities(db, { schoolId, student }) {
  // Preserve already-linked identities. Never silently remap a child to a
  // different parent because two contacts share a phone number.
  async function linkedIdentity(userId, expectedRole) {
    if (!userId) return null
    const result = await db.query(
      `SELECT id, email, username FROM users
       WHERE id=$1 AND school_id=$2 AND role=$3 AND is_active=true LIMIT 1`,
      [userId, schoolId, expectedRole],
    )
    if (!result.rows[0]) throw new Error(`Existing ${expectedRole} identity link is invalid.`)
    const u = result.rows[0]
    return { userId: u.id, email: u.email, loginId: u.username || u.email,
      created: false, temporaryPassword: null }
  }

  const studentIdentity = await linkedIdentity(student.student_user_id, 'student')
    || await ensureStudentIdentity(db, { schoolId, student })
  const parentIdentity = await linkedIdentity(student.parent_user_id, 'parent')
    || await ensureParentIdentity(db, { schoolId, student })
  const ctx = await schoolContext(db, schoolId)
  await db.query(
    `UPDATE students
     SET student_user_id = $1, parent_user_id = $2, tenant_id = $3, updated_at = NOW()
     WHERE id = $4 AND school_id = $5`,
    [studentIdentity.userId, parentIdentity.userId, ctx.tenantId, student.id, ctx.schoolId],
  )
  return { student: studentIdentity, parent: parentIdentity, tenantId: ctx.tenantId }
}

async function ensureTeacherIdentity(db, { schoolId, employee }) {
  const ctx = await schoolContext(db, schoolId)
  const empId = clean(employee.emp_id) || `EMP-${employee.id}`
  const domain = schoolDomain(ctx)
  const fallbackEmail = `teacher_${slug(empId)}@${domain}`
  const requestedEmail = clean(employee.email).toLowerCase()
  let email = requestedEmail || fallbackEmail

  let result = await db.query(
    `SELECT id, email, username
     FROM users
     WHERE school_id = $1 AND is_active = true AND role = 'teacher'
       AND (LOWER(COALESCE(username,'')) = LOWER($2) OR LOWER(email) = LOWER($3))
     ORDER BY id LIMIT 1`,
    [ctx.schoolId, empId, email],
  )
  if (!result.rows[0] && requestedEmail) {
    const emailTaken = await db.query(`SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [requestedEmail])
    if (emailTaken.rows[0]) email = fallbackEmail
  }

  if (result.rows[0]) {
    const user = result.rows[0]
    await db.query(
      `UPDATE users SET tenant_id=$1, username=COALESCE(NULLIF(username,''),$2), updated_at=NOW() WHERE id=$3`,
      [ctx.tenantId, empId, user.id],
    )
    await db.query(
      `UPDATE employees SET user_id=$1, tenant_id=$2, portal_username=$3, portal_role='teacher', portal_active=true, portal_password=NULL, updated_at=NOW()
       WHERE id=$4 AND school_id=$5`,
      [user.id, ctx.tenantId, empId, employee.id, ctx.schoolId],
    )
    return { userId: user.id, email: user.email, loginId: user.username || empId, created: false, temporaryPassword: null }
  }

  const temporaryPassword = tempPassword('TCH')
  const hash = await bcrypt.hash(temporaryPassword, 12)
  result = await db.query(
    `INSERT INTO users (
       school_id, tenant_id, name, email, username, password, role, designation,
       phone, is_active, must_change_password, entity_type, entity_id
     ) VALUES ($1,$2,$3,$4,$5,$6,'teacher',$7,$8,true,true,'employee',$9)
     RETURNING id, email, username`,
    [ctx.schoolId, ctx.tenantId, employee.name || 'Teacher', email, empId, hash,
      employee.designation || 'Teacher', employee.phone || null, employee.id],
  )
  await db.query(
    `UPDATE employees SET user_id=$1, tenant_id=$2, portal_username=$3, portal_role='teacher', portal_active=true, portal_password=NULL, updated_at=NOW()
     WHERE id=$4 AND school_id=$5`,
    [result.rows[0].id, ctx.tenantId, empId, employee.id, ctx.schoolId],
  )
  return { userId: result.rows[0].id, email: result.rows[0].email, loginId: result.rows[0].username, created: true, temporaryPassword }
}

module.exports = {
  tempPassword,
  schoolContext,
  ensureStudentIdentity,
  ensureParentIdentity,
  provisionStudentIdentities,
  ensureTeacherIdentity,
  rotateTemporaryPassword,
}
