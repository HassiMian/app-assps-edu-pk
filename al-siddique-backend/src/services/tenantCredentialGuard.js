const { query } = require('../config/database')

async function hasColumn(tableName, columnName) {
  const result = await query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  )

  return result.rowCount > 0
}

async function validateSameTenantOrThrow({
  tenantId,
  studentId,
  parentId,
  parentUserId,
}) {
  if (!tenantId) {
    throw new Error('Tenant ID is required')
  }

  if (studentId && await hasColumn('students', 'tenant_id')) {
    const student = await query(
      `SELECT id
       FROM students
       WHERE id = $1
         AND tenant_id = $2
       LIMIT 1`,
      [studentId, tenantId]
    )

    if (student.rowCount === 0) {
      throw new Error('Student does not belong to this tenant')
    }
  }

  const userId = parentUserId || parentId
  if (userId && await hasColumn('users', 'tenant_id')) {
    const parent = await query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND tenant_id = $2
         AND LOWER(role) = 'parent'
       LIMIT 1`,
      [userId, tenantId]
    )

    if (parent.rowCount === 0) {
      throw new Error('Parent does not belong to this tenant')
    }
  }

  return true
}

async function resolveTenantIdForSchool(schoolId) {
  const result = await query(
    `SELECT tenant_id
     FROM schools
     WHERE id = $1
     LIMIT 1`,
    [schoolId]
  )

  return result.rows[0]?.tenant_id || null
}

module.exports = {
  validateSameTenantOrThrow,
  resolveTenantIdForSchool,
}
