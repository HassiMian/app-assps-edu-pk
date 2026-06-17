const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { sendActivationEmail } = require('./emailService')

function createTenantId(schoolName) {
  const slug = String(schoolName || 'school')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const random = crypto.randomBytes(3).toString('hex')

  return `${slug || 'school'}-${random}`
}

function generateTemporaryPassword() {
  const part1 = crypto.randomBytes(3).toString('hex').toUpperCase()
  const part2 = crypto.randomBytes(3).toString('hex').toUpperCase()

  return `APX-${part1}-${part2}`
}

async function generateSchoolAdminCredentials({
  client,
  request,
  tenantId,
  schoolId,
  loginUrl,
}) {
  if (!client) throw new Error('Database client is required')
  if (!request?.email) throw new Error('Request email is required')

  let adminEmail = String(request.email).toLowerCase().trim()
  const existingUser = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [adminEmail])
  if (existingUser.rows.length > 0) {
    const domain = adminEmail.split('@')[1] || 'apex.com'
    adminEmail = `admin+${tenantId}@${domain}`
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)
  const username = adminEmail.split('@')[0]

  const userResult = await client.query(`
    INSERT INTO users (
      school_id, tenant_id, name, email, password, role, designation, is_active, username, permissions, must_change_password
    ) VALUES ($1, $2, $3, $4, $5, 'school_admin', 'Principal', true, $6, '[]'::jsonb, true)
    RETURNING id, tenant_id, school_id, name, email, role, must_change_password
  `, [
    schoolId,
    tenantId,
    request.owner_name || request.ownerName,
    adminEmail,
    passwordHash,
    username,
  ])

  await sendCredentialsEmail({
    ownerName: request.owner_name || request.ownerName,
    schoolName: request.school_name || request.schoolName,
    loginUrl,
    email: adminEmail,
    temporaryPassword,
  })

  return {
    user: userResult.rows[0],
    temporaryPassword,
  }
}

async function sendCredentialsEmail({
  ownerName,
  schoolName,
  loginUrl,
  email,
  temporaryPassword,
}) {
  await sendActivationEmail({
    ownerName,
    schoolName,
    loginUrl: loginUrl || process.env.NEXT_PUBLIC_SAAS_LOGIN_URL || 'https://app.assps.edu.pk/login',
    email,
    tempPassword: temporaryPassword,
  })
}

module.exports = {
  createTenantId,
  generateTemporaryPassword,
  generateSchoolAdminCredentials,
  sendCredentialsEmail,
}
