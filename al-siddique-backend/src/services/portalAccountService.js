const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { query } = require('../config/database')
const { hasColumn } = require('../middleware/tenant')

function generateTemporaryPassword() {
  const a = crypto.randomBytes(4).toString('hex').toUpperCase()
  const b = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `APX-${a}-${b}`
}

function clean(value, max = 255) {
  return String(value || '').trim().slice(0, max)
}

async function findExistingUser({ schoolId, userId, email, username, role }) {
  if (userId) {
    const byId = await query('SELECT * FROM users WHERE id = $1 AND school_id = $2 LIMIT 1', [userId, schoolId])
    if (byId.rows[0]) return byId.rows[0]
  }

  const identifiers = [clean(email).toLowerCase(), clean(username).toLowerCase()].filter(Boolean)
  if (!identifiers.length) return null
  const result = await query(`
    SELECT * FROM users
    WHERE school_id = $1
      AND role = $2
      AND (
        LOWER(COALESCE(email,'')) = ANY($3::text[])
        OR LOWER(COALESCE(username,'')) = ANY($3::text[])
      )
    ORDER BY id
    LIMIT 1
  `, [schoolId, role, identifiers])
  return result.rows[0] || null
}

async function provisionPortalUser({
  schoolId,
  tenantId = null,
  userId = null,
  name,
  email,
  username,
  role,
  designation = null,
  phone = null,
  permissions = [],
  active = true,
}) {
  const normalizedRole = clean(role, 40).toLowerCase()
  const normalizedEmail = clean(email).toLowerCase()
  const normalizedUsername = clean(username, 120)
  if (!schoolId || !name || !normalizedRole || (!normalizedEmail && !normalizedUsername)) {
    throw new Error('Portal user requires school, name, role and a login identifier.')
  }

  const existing = await findExistingUser({
    schoolId,
    userId,
    email: normalizedEmail,
    username: normalizedUsername,
    role: normalizedRole,
  })

  if (existing) {
    const supportsUsername = await hasColumn('users', 'username').catch(() => false)
    const supportsPhone = await hasColumn('users', 'phone').catch(() => false)
    const supportsPermissions = await hasColumn('users', 'permissions').catch(() => false)
    const supportsTenant = await hasColumn('users', 'tenant_id').catch(() => false)
    const updates = ['name = $1', 'designation = $2', 'is_active = $3']
    const params = [clean(name, 180), designation || null, Boolean(active)]
    let i = params.length + 1
    if (normalizedEmail) { updates.push(`email = $${i++}`); params.push(normalizedEmail) }
    if (supportsUsername && normalizedUsername) { updates.push(`username = $${i++}`); params.push(normalizedUsername) }
    if (supportsPhone && phone) { updates.push(`phone = $${i++}`); params.push(clean(phone, 40)) }
    if (supportsPermissions) { updates.push(`permissions = $${i++}::jsonb`); params.push(JSON.stringify(Array.isArray(permissions) ? permissions : [])) }
    if (supportsTenant && tenantId) { updates.push(`tenant_id = $${i++}`); params.push(tenantId) }
    updates.push('updated_at = NOW()')
    params.push(existing.id, schoolId)
    const updated = await query(`
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${i++} AND school_id = $${i}
      RETURNING id, school_id, name, email, role, designation, is_active${supportsUsername ? ', username' : ''}${supportsPermissions ? ', permissions' : ''}
    `, params)
    return { user: updated.rows[0] || existing, created: false, temporaryPassword: null }
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)
  const supportsUsername = await hasColumn('users', 'username').catch(() => false)
  const supportsPhone = await hasColumn('users', 'phone').catch(() => false)
  const supportsPermissions = await hasColumn('users', 'permissions').catch(() => false)
  const supportsTenant = await hasColumn('users', 'tenant_id').catch(() => false)
  const supportsMustChange = await hasColumn('users', 'must_change_password').catch(() => false)

  const columns = ['school_id', 'name', 'email', 'password', 'role', 'designation', 'is_active']
  const values = [schoolId, clean(name, 180), normalizedEmail || null, passwordHash, normalizedRole, designation || null, Boolean(active)]
  if (supportsTenant) { columns.push('tenant_id'); values.push(tenantId || null) }
  if (supportsUsername) { columns.push('username'); values.push(normalizedUsername || normalizedEmail) }
  if (supportsPhone) { columns.push('phone'); values.push(phone ? clean(phone, 40) : null) }
  if (supportsPermissions) { columns.push('permissions'); values.push(JSON.stringify(Array.isArray(permissions) ? permissions : [])) }
  if (supportsMustChange) { columns.push('must_change_password'); values.push(true) }

  const placeholders = values.map((_, idx) => {
    const col = columns[idx]
    return col === 'permissions' ? `$${idx + 1}::jsonb` : `$${idx + 1}`
  })
  const result = await query(`
    INSERT INTO users (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING id, school_id, name, email, role, designation, is_active${supportsUsername ? ', username' : ''}${supportsPermissions ? ', permissions' : ''}
  `, values)

  return { user: result.rows[0], created: true, temporaryPassword }
}


async function resetPortalUserPassword({ schoolId, userId }) {
  if (!schoolId || !userId) throw new Error('School and user are required.')
  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)
  const supportsMustChange = await hasColumn('users', 'must_change_password').catch(() => false)
  const result = await query(`
    UPDATE users
    SET password = $1${supportsMustChange ? ', must_change_password = true' : ''}, updated_at = NOW()
    WHERE id = $2 AND school_id = $3
    RETURNING id, school_id, name, email, role, designation, is_active${await hasColumn('users', 'username').catch(() => false) ? ', username' : ''}
  `, [passwordHash, userId, schoolId])
  if (!result.rowCount) throw new Error('Portal account not found.')
  return { user: result.rows[0], temporaryPassword }
}

async function setPortalUserActive({ schoolId, userId, active }) {
  const result = await query(`
    UPDATE users
    SET is_active = $1, updated_at = NOW()
    WHERE id = $2 AND school_id = $3
    RETURNING id, school_id, name, email, role, designation, is_active
  `, [Boolean(active), userId, schoolId])
  if (!result.rowCount) throw new Error('Portal account not found.')
  return result.rows[0]
}

module.exports = {
  generateTemporaryPassword,
  provisionPortalUser,
  resetPortalUserPassword,
  setPortalUserActive,
}
