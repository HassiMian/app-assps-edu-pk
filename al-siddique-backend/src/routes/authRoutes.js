// src/routes/authRoutes.js
// Al Siddique Smart School OS — Authentication Routes

const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const { query } = require('../config/database')
const { protect } = require('../middleware/auth')
const { currentTenantId, hasColumn } = require('../middleware/tenant')
const { getTwilioConfigForSchool, buildTwilioClient } = require('../services/twilioSettings')

function resolveSecret(name, fallback) {
  const value = process.env[name]
  if (value && value.trim()) return value.trim()
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production.`)
  }
  return fallback
}

const JWT_SECRET = resolveSecret('JWT_SECRET', 'dev-jwt-secret')
const JWT_REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret')
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'
const DEMO_LOGIN_ENABLED = process.env.DEMO_LOGIN_ENABLED !== 'false'

if (process.env.NODE_ENV !== 'production' && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  console.warn('WARNING: JWT secrets are using development fallback values. Set JWT_SECRET and JWT_REFRESH_SECRET before deploying to production.')
}

const loginAttempts = new Map()
const passwordResetOtps = new Map()
const MAX_LOGIN_ATTEMPTS = 5
const BLOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const RESET_OTP_TTL_MS = 10 * 60 * 1000

const demoAccounts = {
  'demo@assps.edu.pk': { role: 'admin', name: 'System Admin', designation: 'Principal', school_id: 2, password: 'Demo@12345' },
}

function isMissingUsersTableError(err) {
  const message = String(err?.message || '').toLowerCase()
  return err?.code === '42P01' && message.includes('users')
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

function normalizeLoginId(value) {
  return String(value || '').trim()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8
}

function loginAliases(loginId, schoolCode = null) {
  const raw = normalizeLoginId(loginId)
  const lower = raw.toLowerCase()
  const aliases = new Set([raw, lower])
  
  let domainSuffix = 'assps.edu.pk'
  if (schoolCode && schoolCode !== 'default' && schoolCode !== 'demo') {
    domainSuffix = `${schoolCode}.apex.com`
  } else if (schoolCode === 'demo') {
    domainSuffix = 'demo.apex.com'
  }

  if (!raw.includes('@')) {
    aliases.add(`${lower}@${domainSuffix}`)
    aliases.add(`student_${lower}@${domainSuffix}`)
    const digits = raw.replace(/\D/g, '')
    if (digits) {
      aliases.add(`parent_${digits}@${domainSuffix}`)
      aliases.add(`parent_0${digits}@${domainSuffix}`)
    }
  }
  return [...aliases].filter(Boolean)
}

async function findUserByLoginId(loginId, role = null, schoolId = null, schoolCode = null) {
  const aliases = loginAliases(loginId, schoolCode)
  let sql = `
    SELECT *
    FROM users
    WHERE is_active = true
      AND (
        LOWER(email) = ANY($1::text[])
        OR LOWER(COALESCE(username, '')) = ANY($1::text[])
        OR LOWER(regexp_replace(COALESCE(email, ''), '^student_|^parent_0|^parent_', '', 'g')) = ANY($1::text[])
      )
  `
  const exactLogin = normalizeLoginId(loginId).toLowerCase()
  const params = [aliases.map(a => a.toLowerCase()), exactLogin]
  let paramIdx = 3

  if (role) {
    if (role === 'admin') {
      sql += ` AND role IN ('admin', 'super_admin', 'saas_admin')`
    } else {
      sql += ` AND role = $${paramIdx++}`
      params.push(role)
    }
  }
  if (schoolId) {
    sql += ` AND school_id = $${paramIdx++}`
    params.push(Number(schoolId))
  }

  sql += ` ORDER BY CASE WHEN LOWER(COALESCE(username, '')) = $2 THEN 0 WHEN LOWER(email) = $2 THEN 1 ELSE 2 END, id LIMIT 1`
  const result = await query(sql, params)
  if (result.rows[0]) return result.rows[0]

  const digits = normalizeLoginId(loginId).replace(/\D/g, '')
  if (!loginId.includes('@') && digits) {
    let sqlLinked = `
        SELECT u.*
        FROM students s
        JOIN users u ON u.id = CASE
          WHEN LOWER($2::text) = 'parent' THEN s.parent_user_id
          ELSE s.student_user_id
        END
        WHERE s.school_id = u.school_id
          AND (
            regexp_replace(COALESCE(s.gr_number, ''), '[^0-9]', '', 'g') = $1
            OR regexp_replace(COALESCE(s.gr_number, ''), '[^0-9]', '', 'g') = ('26' || LPAD($1, 3, '0'))
            OR COALESCE(s.gr_number, '') ILIKE ('%' || LPAD($1, 3, '0'))
          )
          AND u.is_active = true
          AND ($2::text = '' OR u.role = $2::text)
    `
    const paramsLinked = [digits, role || '']
    let nextIdx = 3
    if (schoolId) {
      sqlLinked += ` AND s.school_id = $${nextIdx++}`
      paramsLinked.push(Number(schoolId))
    }
    sqlLinked += ' ORDER BY s.id LIMIT 1'
    const linked = await query(sqlLinked, paramsLinked)
    if (linked.rows[0]) return linked.rows[0]
  }
  return null
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 4) return 'registered number'
  return `***${digits.slice(-4)}`
}

function normalizePakPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('92')) return `+${digits}`
  if (digits.startsWith('0')) return `+92${digits.slice(1)}`
  if (digits.length === 10) return `+92${digits}`
  return `+${digits}`
}

async function sendPasswordOtp(user, otp) {
  const phone = user.phone || user.parent_phone || user.parent_whatsapp
  const message = `Al Siddique password reset OTP: ${otp}. It expires in 10 minutes.`
  try {
    await query(
      `INSERT INTO notification_log (school_id, recipient_role, title, message, type, channel, phone, sent_at, metadata)
       VALUES ($1, $2, 'Password Reset OTP', $3, 'security', 'sms', $4, NOW(), $5::jsonb)`,
      [normalizeSchoolId(user.school_id), user.role || 'user', message, phone || null, JSON.stringify({ user_id: user.id, reset: true })],
    )
  } catch (err) {
    console.error('Password reset notification log error:', err.message)
  }
  if (!phone) return { sent: false, message: 'No phone number is attached to this account.' }
  try {
    const config = await getTwilioConfigForSchool(normalizeSchoolId(user.school_id))
    if (!config.accountSid || !config.authToken || !config.smsFrom) {
      return { sent: false, message: 'OTP generated, but SMS gateway is not configured.' }
    }
    const client = buildTwilioClient(config)
    await client.messages.create({ from: config.smsFrom, to: normalizePakPhone(phone), body: message })
    return { sent: true, message: `OTP sent to ${maskPhone(phone)}.` }
  } catch (err) {
    console.error('Password reset SMS error:', err.message)
    return { sent: false, message: 'OTP generated, but SMS delivery failed. Please contact admin if it does not arrive.' }
  }
}

function normalizeSchoolId(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function fetchSchoolById(schoolId) {
  try {
    const result = await query(
      `SELECT id, name, code, tenant_id, school_name, logo_url, primary_color, secondary_color, branding, status
       FROM schools
       WHERE id = $1
       LIMIT 1`,
      [schoolId]
    )
    return result.rows[0] || null
  } catch (err) {
    console.error('Database connection failed in fetchSchoolById, returning mock school:', err.message)
    return {
      id: schoolId || 1,
      name: 'Al Siddique Scholars Public School',
      code: 'assps',
      tenant_id: 'assps',
      school_name: 'Al Siddique Scholars Public School',
      logo_url: null,
      primary_color: null,
      secondary_color: null,
      status: 'active',
      feature_flags: ['paper_generator', 'ai_analytics', 'attendance_qr', 'fees_view', 'employees']
    }
  }
}

async function fetchSchoolByCode(code) {
  if (!code) return null
  try {
    const result = await query(
      `SELECT id, name, code, tenant_id, school_name, logo_url, primary_color, secondary_color, branding, status
       FROM schools
       WHERE LOWER(code) = LOWER($1) OR LOWER(tenant_id) = LOWER($1)
       LIMIT 1`,
      [code]
    )
    return result.rows[0] || null
  } catch (err) {
    console.error('Database connection failed in fetchSchoolByCode, returning mock school:', err.message)
    return {
      id: 1,
      name: 'Al Siddique Scholars Public School',
      code: code || 'assps',
      tenant_id: code || 'assps',
      school_name: 'Al Siddique Scholars Public School',
      logo_url: null,
      primary_color: null,
      secondary_color: null,
      status: 'active',
      feature_flags: ['paper_generator', 'ai_analytics', 'attendance_qr', 'fees_view', 'employees']
    }
  }
}

function normalizeBrandingPayload(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function buildSchoolBranding(school) {
  if (!school) return null
  const branding = normalizeBrandingPayload(school.branding)
  return {
    tenantId: school.tenant_id || school.tenantId || null,
    name: school.school_name || school.schoolName || school.name || 'APEX School',
    logo: school.logo_url || school.logoUrl || branding.logo || null,
    primaryColor: school.primary_color || school.primaryColor || branding.primaryColor || null,
    secondaryColor: school.secondary_color || school.secondaryColor || branding.secondaryColor || null,
  }
}

async function resolveRequestedSchool(req) {
  const requestedSchoolId = normalizeSchoolId(req.body?.school_id || req.query?.school_id || req.body?.schoolId || req.query?.schoolId, null)
  const requestedSchoolCode = String(req.body?.school_code || req.query?.school_code || req.body?.schoolCode || req.query?.schoolCode || '').trim()
  if (requestedSchoolId) {
    const school = await fetchSchoolById(requestedSchoolId)
    if (school) return school
  }
  if (requestedSchoolCode) {
    const school = await fetchSchoolByCode(requestedSchoolCode)
    if (school) return school

    try {
      const allSettings = await query('SELECT school_id, school_access FROM settings WHERE school_access IS NOT NULL')
      for (const row of allSettings.rows) {
        if (!Array.isArray(row.school_access)) continue
        const branch = row.school_access.find(b => b.schoolCode && b.schoolCode.toLowerCase() === requestedSchoolCode.toLowerCase() && b.active)
        if (branch) {
          return {
            id: row.school_id,
            name: branch.schoolName,
            code: branch.schoolCode,
            status: 'active',
            feature_flags: ['paper_generator', 'ai_analytics', 'attendance_qr', 'fees_view', 'employees'],
            isVirtualBranch: true,
            branchDetails: branch
          }
        }
      }
    } catch (err) {
      console.error('Error resolving virtual branch school:', err.message)
    }
  }
  return null
}

function isSchoolActive(school) {
  return school && ['active', 'trial'].includes(String(school.status || '').toLowerCase())
}

function getClientKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
}

function getLoginAttempt(key) {
  const entry = loginAttempts.get(key)
  if (!entry) return { count: 0, blockedUntil: 0 }
  return entry
}

function recordLoginFailure(key) {
  const current = getLoginAttempt(key)
  const next = {
    count: current.count + 1,
    blockedUntil: current.count + 1 >= MAX_LOGIN_ATTEMPTS ? Date.now() + BLOCK_DURATION_MS : current.blockedUntil,
  }
  loginAttempts.set(key, next)
}

function resetLoginAttempts(key) {
  loginAttempts.delete(key)
}

function isBlocked(key) {
  const entry = getLoginAttempt(key)
  return entry.blockedUntil && Date.now() < entry.blockedUntil
}

function buildUserPayload(user) {
  return {
    id: user.id,
    school_id: normalizeSchoolId(user.school_id ?? user.schoolId),
    tenant_id: user.tenant_id ?? user.tenantId ?? user.school?.tenant_id ?? user.school?.tenantId ?? null,
    school_code: user.school_code ?? user.schoolCode ?? user.code ?? user.branchDetails?.schoolCode ?? null,
    name: user.name,
    username: user.username || null,
    email: user.email,
    role: user.role,
    designation: user.designation,
    mustChangePassword: !!(user.must_change_password ?? user.mustChangePassword),
    ...(user.permissions ? { permissions: user.permissions } : {}),
    ...(user.module_access ? { module_access: user.module_access } : {})
  }
}

function roleRoutesForResponse(role) {
  const routes = {
    super_admin: '/super-admin/subscription-requests',
    admin: '/admin',
    school_admin: '/admin',
    principal: '/admin',
    teacher: '/teacher',
    parent: '/parent',
    student: '/student',
  }
  return routes[String(role || '').toLowerCase()] || null
}

function roleCookieValue(role) {
  const normalized = String(role || '').toLowerCase()
  return normalized === 'super_admin' || normalized === 'saas_admin'
    ? 'SAAS_ADMIN'
    : String(role || '')
}

function setLoginCookies(res, userPayload, token = null) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
  res.cookie('userId', String(userPayload.id), options)
  res.cookie('tenantId', userPayload.tenant_id || userPayload.tenantId || '', options)
  res.cookie('role', roleCookieValue(userPayload.role), options)
  if (token) {
    res.cookie('authToken', token, options)
  }
}

async function findVirtualBranchUser(email, password = null) {
  try {
    const allSettings = await query('SELECT school_id, school_access FROM settings WHERE school_access IS NOT NULL')
    for (const row of allSettings.rows) {
      if (!Array.isArray(row.school_access)) continue
      const branch = row.school_access.find(b => b.adminEmail && b.adminEmail.toLowerCase() === email.toLowerCase() && b.active)
      if (branch) {
        if (password !== null && branch.adminPassword !== password) continue
        return {
          id: 9000000 + row.school_id, // Virtual high ID
          school_id: row.school_id,
          name: branch.schoolName + ' Admin',
          email: branch.adminEmail,
          role: 'admin',
          designation: 'Branch Admin',
          module_access: branch.moduleAccess,
          branchDetails: branch
        }
      }
    }
  } catch (err) {
    console.error('Virtual branch user check failed:', err.message)
  }
  return null
}

function createAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: normalizeSchoolId(user.school_id ?? user.schoolId),
      tenant_id: user.tenant_id ?? user.tenantId ?? null,
      school_code: user.school_code ?? user.schoolCode ?? user.code ?? user.branchDetails?.schoolCode ?? null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  )
}

function createRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: normalizeSchoolId(user.school_id ?? user.schoolId),
      tenant_id: user.tenant_id ?? user.tenantId ?? null,
      school_code: user.school_code ?? user.schoolCode ?? user.code ?? user.branchDetails?.schoolCode ?? null,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN, algorithm: 'HS256' }
  )
}

function sendJson(res, status, payload) {
  return res.status(status).json({ success: status >= 200 && status < 300, ...payload })
}

async function createDemoSession(email) {
  const account = demoAccounts[email]
  if (!account) return null
  const school = await fetchSchoolById(account.school_id)
  return {
    token: jwt.sign({
      id: 999,
      email,
      role: account.role,
      school_id: normalizeSchoolId(account.school_id),
      tenant_id: school?.tenant_id || null,
      school_code: 'demo',
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
    refreshToken: jwt.sign({
      id: 999,
      email,
      role: account.role,
      school_id: normalizeSchoolId(account.school_id),
      tenant_id: school?.tenant_id || null,
      school_code: 'demo',
    }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN }),
    user: {
      id: 999,
      school_id: normalizeSchoolId(account.school_id),
      tenant_id: school?.tenant_id || null,
      school_code: 'demo',
      name: account.name,
      email,
      role: account.role,
      designation: account.designation,
    },
    schoolBranding: buildSchoolBranding(school),
  }
}

router.post('/login', async (req, res) => {
  try {
    const ipKey = getClientKey(req)
    if (isBlocked(ipKey)) {
      return sendJson(res, 429, { message: 'Too many failed login attempts. Please wait 15 minutes and try again.' })
    }

    const loginId = normalizeLoginId(req.body?.email || req.body?.username || req.body?.loginId)
    const email = normalizeEmail(loginId)
    const password = req.body?.password
    const requestedRole = String(req.body?.role || '').trim().toLowerCase() || null

    if (!loginId || !password) {
      return sendJson(res, 400, { message: 'Login ID and password are required.' })
    }
    if (loginId.includes('@') && !isValidEmail(email)) {
      return sendJson(res, 400, { message: 'Please provide a valid email address.' })
    }
    if (!isValidPassword(password)) {
      return sendJson(res, 400, { message: 'Password must be at least 8 characters long.' })
    }

    let requestedSchool = await resolveRequestedSchool(req)
    const requestedIdentifier = req.body?.school_id || req.query?.school_id || req.body?.school_code || req.query?.school_code || req.body?.schoolId || req.query?.schoolId || req.body?.schoolCode || req.query?.schoolCode || null
    if (requestedIdentifier && !requestedSchool) {
      console.warn('Login school lookup did not resolve. Falling back to default portal context.')
      requestedSchool = null
    }
    if (requestedSchool && !isSchoolActive(requestedSchool)) {
      return sendJson(res, 403, {
        message: `School access disabled. Subscription status: ${requestedSchool.status}. Contact your administrator.`,
      })
    }

    let result
    try {
      const user = await findUserByLoginId(loginId, requestedRole, requestedSchool?.id, requestedSchool?.code)
      result = { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
    } catch (err) {
      if (err?.code === '42703') {
        result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true', [loginId])
      } else {
      const canUseDemoFallback = DEMO_LOGIN_ENABLED || isMissingUsersTableError(err)
      if (canUseDemoFallback && demoAccounts[email] && demoAccounts[email].password === password) {
        if (requestedSchool && requestedSchool.id !== 1) {
          return sendJson(res, 403, { message: 'Demo login is only available for the default school.' })
        }
        if (requestedRole && demoAccounts[email].role !== requestedRole) {
          return sendJson(res, 403, { message: 'Selected portal role does not match the demo account.' })
        }
        const session = await createDemoSession(email)
        setLoginCookies(res, session.user, session.token)
        return sendJson(res, 200, { message: 'Login successful (Demo)', ...session })
      }
      throw err
      }
    }

    if (result.rows.length === 0) {
      if (DEMO_LOGIN_ENABLED && demoAccounts[email] && demoAccounts[email].password === password) {
        if (requestedSchool && requestedSchool.id !== 1 && !requestedSchool.isVirtualBranch) {
          return sendJson(res, 403, { message: 'Demo login is only available for the default school.' })
        }
        if (requestedRole && demoAccounts[email].role !== requestedRole) {
          return sendJson(res, 403, { message: 'Selected portal role does not match the demo account.' })
        }
        const session = await createDemoSession(email)
        setLoginCookies(res, session.user, session.token)
        return sendJson(res, 200, { message: 'Login successful (Demo)', ...session })
      }

      const virtualUser = loginId.includes('@') ? await findVirtualBranchUser(email, password) : null
      if (virtualUser) {
        if (requestedSchool && requestedSchool.code !== virtualUser.branchDetails.schoolCode) {
          return sendJson(res, 403, { message: 'School code does not match branch admin credentials.' })
        }
        if (requestedRole && requestedRole !== 'admin') {
          return sendJson(res, 403, { message: 'Branch admins must login as admin role.' })
        }
        resetLoginAttempts(ipKey)
        const token = createAccessToken(virtualUser)
        const refreshToken = createRefreshToken(virtualUser)
        const virtualPayload = buildUserPayload(virtualUser)
        setLoginCookies(res, virtualPayload, token)
        return sendJson(res, 200, {
          message: 'Login successful (Branch Admin)',
          token,
          refreshToken,
          user: virtualPayload,
          schoolBranding: buildSchoolBranding(requestedSchool || virtualUser.branchDetails),
        })
      }

      recordLoginFailure(ipKey)
      return sendJson(res, 401, { message: 'Email or password is incorrect.' })
    }

    const user = result.rows[0]
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      if (DEMO_LOGIN_ENABLED && demoAccounts[email] && demoAccounts[email].password === password) {
        if (requestedSchool && requestedSchool.id !== 1) {
          return sendJson(res, 403, { message: 'Demo login is only available for the default school.' })
        }
        if (requestedRole && demoAccounts[email].role !== requestedRole) {
          return sendJson(res, 403, { message: 'Selected portal role does not match the demo account.' })
        }
        const session = await createDemoSession(email)
        setLoginCookies(res, session.user, session.token)
        return sendJson(res, 200, { message: 'Login successful (Demo Fallback)', ...session })
      }
      recordLoginFailure(ipKey)
      return sendJson(res, 401, { message: 'Email or password is incorrect.' })
    }

    if (requestedRole && user.role !== requestedRole) {
      if (requestedRole === 'admin' && ['super_admin', 'saas_admin'].includes(user.role)) {
        // Allow super_admin/saas_admin to log in through the admin portal
      } else {
        return sendJson(res, 403, { message: 'Selected portal role does not match your account.' })
      }
    }

    if (requestedSchool && user.role !== 'super_admin' && Number(user.school_id) !== Number(requestedSchool.id)) {
      return sendJson(res, 403, { message: 'Selected school does not match your user account.' })
    }

    const loginSchool = requestedSchool || (user.school_id ? await fetchSchoolById(user.school_id) : null)
    if (user.role !== 'super_admin' && loginSchool && !isSchoolActive(loginSchool)) {
      return sendJson(res, 403, {
        message: `School access disabled. Subscription status: ${loginSchool.status}. Contact your administrator.`,
      })
    }

    if (!user.is_active) {
      return sendJson(res, 403, { message: 'Your account is disabled. Contact your administrator.' })
    }

    resetLoginAttempts(ipKey)

    const token = createAccessToken(user)
    const refreshToken = createRefreshToken(user)
    const userPayload = buildUserPayload({
      ...user,
      tenant_id: user.tenant_id || loginSchool?.tenant_id || null,
      code: loginSchool?.code || null,
    })
    setLoginCookies(res, userPayload, token)

    return sendJson(res, 200, {
      message: 'Login successful',
      token,
      refreshToken,
      mustChangePassword: userPayload.mustChangePassword,
      redirectTo: userPayload.mustChangePassword
        ? `/auth/change-password?userId=${userPayload.id}`
        : (roleRoutesForResponse(userPayload.role) || '/admin'),
      user: userPayload,
      schoolBranding: buildSchoolBranding(loginSchool),
    })
  } catch (err) {
    console.error('Auth login error:', err.message)
    return sendJson(res, 500, { message: 'Authentication failed due to server error.' })
  }
})

router.post('/refresh', async (req, res) => {
  const refreshToken = req.body?.refreshToken
  if (!refreshToken) {
    return sendJson(res, 401, { message: 'Refresh token is required.' })
  }

  if (DEMO_LOGIN_ENABLED && refreshToken === 'mock-refresh-token') {
    const newPayload = {
      id: 999,
      school_id: normalizeSchoolId(1),
      school_code: 'assps',
      name: 'Super Admin',
      email: 'demo@assps.edu.pk',
      role: 'admin',
      designation: 'Admin',
    }
    const newToken = jwt.sign({ id: 999, email: newPayload.email, role: newPayload.role, school_id: newPayload.school_id, school_code: newPayload.school_code }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
    const newRefreshToken = jwt.sign({ id: 999, email: newPayload.email, role: newPayload.role, school_id: newPayload.school_id, school_code: newPayload.school_code }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
    return sendJson(res, 200, {
      message: 'Token refreshed successfully (Demo Mock).',
      token: newToken,
      refreshToken: newRefreshToken,
      user: newPayload,
      schoolBranding: buildSchoolBranding(await fetchSchoolById(newPayload.school_id)),
    })
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    if (decoded?.role !== 'super_admin') {
      const school = await fetchSchoolById(normalizeSchoolId(decoded.school_id, 1))
      if (!school || !isSchoolActive(school)) {
        return sendJson(res, 403, { message: `School access disabled. Subscription status: ${school?.status || 'unknown'}.` })
      }
    }

    let user
    try {
      const result = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.id])
      if (result.rows.length > 0) {
        user = result.rows[0]
      }
    } catch (dbErr) {
      if ((DEMO_LOGIN_ENABLED || isMissingUsersTableError(dbErr)) && (decoded.id === 999 || demoAccounts[decoded.email])) {
        const account = demoAccounts[decoded.email] || demoAccounts['demo@assps.edu.pk']
        const newPayload = {
          id: 999,
          school_id: normalizeSchoolId(account.school_id),
          school_code: 'assps',
          name: account.name,
          email: decoded.email || 'demo@assps.edu.pk',
          role: decoded.role || account.role,
          designation: account.designation,
        }
        const newToken = jwt.sign({ id: 999, email: newPayload.email, role: newPayload.role, school_id: newPayload.school_id, school_code: newPayload.school_code }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
        const newRefreshToken = jwt.sign({ id: 999, email: newPayload.email, role: newPayload.role, school_id: newPayload.school_id, school_code: newPayload.school_code }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
        return sendJson(res, 200, {
          message: 'Token refreshed successfully (Demo).',
          token: newToken,
          refreshToken: newRefreshToken,
          user: newPayload,
          schoolBranding: buildSchoolBranding(await fetchSchoolById(newPayload.school_id)),
        })
      }
      throw dbErr
    }

    if (!user) {
      const virtualUser = await findVirtualBranchUser(decoded.email)
      if (virtualUser) {
        const newToken = createAccessToken(virtualUser)
        const newRefreshToken = createRefreshToken(virtualUser)
        return sendJson(res, 200, {
          message: 'Token refreshed successfully (Branch Admin).',
          token: newToken,
          refreshToken: newRefreshToken,
          user: buildUserPayload(virtualUser),
          schoolBranding: buildSchoolBranding(virtualUser.branchDetails),
        })
      }

      if (DEMO_LOGIN_ENABLED && (decoded.id === 999 || demoAccounts[decoded.email])) {
        const account = demoAccounts[decoded.email] || demoAccounts['demo@assps.edu.pk']
        const newPayload = {
          id: 999,
          school_id: normalizeSchoolId(account.school_id),
          name: account.name,
          email: decoded.email || 'demo@assps.edu.pk',
          role: decoded.role || account.role,
          designation: account.designation,
        }
        const newToken = jwt.sign({ id: 999, email: newPayload.email, role: newPayload.role, school_id: newPayload.school_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
        const newRefreshToken = jwt.sign({ id: 999, email: newPayload.email, role: newPayload.role, school_id: newPayload.school_id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
        return sendJson(res, 200, {
          message: 'Token refreshed successfully (Demo).',
          token: newToken,
          refreshToken: newRefreshToken,
          user: newPayload,
          schoolBranding: buildSchoolBranding(await fetchSchoolById(newPayload.school_id)),
        })
      }
      return sendJson(res, 401, { message: 'Refresh token is invalid or expired.' })
    }

    const token = createAccessToken(user)
    const newRefreshToken = createRefreshToken(user)
    const refreshedSchool = user.school_id ? await fetchSchoolById(user.school_id) : null
    const refreshedUser = buildUserPayload({
      ...user,
      tenant_id: user.tenant_id || refreshedSchool?.tenant_id || null,
      code: refreshedSchool?.code || null,
    })

    return sendJson(res, 200, {
      message: 'Token refreshed successfully.',
      token,
      refreshToken: newRefreshToken,
      user: refreshedUser,
      schoolBranding: buildSchoolBranding(refreshedSchool),
    })
  } catch (err) {
    console.error('Refresh token error:', err.message)
    return sendJson(res, 401, { message: 'Refresh token is invalid or expired.' })
  }
})

router.post('/logout', async (req, res) => {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
  res.clearCookie('userId', options)
  res.clearCookie('tenantId', options)
  res.clearCookie('role', options)
  res.clearCookie('authToken', options)
  return sendJson(res, 200, { message: 'Logged out successfully.' })
})

router.post('/password-reset/request', async (req, res) => {
  try {
    const loginId = normalizeLoginId(req.body?.loginId || req.body?.email || req.body?.username)
    const requestedRole = String(req.body?.role || '').trim().toLowerCase() || null
    if (!loginId) {
      return sendJson(res, 400, { message: 'Login ID is required.' })
    }
    if (requestedRole && !['admin', 'teacher', 'student', 'parent', 'super_admin'].includes(requestedRole)) {
      return sendJson(res, 400, { message: 'Invalid portal role.' })
    }

    let requestedSchool = await resolveRequestedSchool(req)
    const user = await findUserByLoginId(loginId, requestedRole, requestedSchool?.id, requestedSchool?.code)
    if (!user) {
      return sendJson(res, 404, { message: 'No active account found for this Login ID.' })
    }

    const otp = String(crypto.randomInt(100000, 1000000))
    const resetToken = crypto.randomBytes(24).toString('hex')
    const otpHash = await bcrypt.hash(otp, 10)
    passwordResetOtps.set(resetToken, {
      userId: user.id,
      schoolId: normalizeSchoolId(user.school_id),
      otpHash,
      expiresAt: Date.now() + RESET_OTP_TTL_MS,
      attempts: 0,
    })

    const delivery = await sendPasswordOtp(user, otp)
    return sendJson(res, 200, {
      message: delivery.message || `OTP sent to ${maskPhone(user.phone)}.`,
      resetToken,
    })
  } catch (err) {
    console.error('Password reset request error:', err.message)
    return sendJson(res, 500, { message: 'Unable to start password reset.' })
  }
})

router.post('/password-reset/confirm', async (req, res) => {
  try {
    const resetToken = String(req.body?.resetToken || '').trim()
    const otp = String(req.body?.otp || '').trim()
    const newPassword = String(req.body?.newPassword || '')
    if (!resetToken || !otp || !newPassword) {
      return sendJson(res, 400, { message: 'Reset token, OTP, and new password are required.' })
    }
    if (!isValidPassword(newPassword)) {
      return sendJson(res, 400, { message: 'Password must be at least 8 characters long.' })
    }

    const entry = passwordResetOtps.get(resetToken)
    if (!entry || Date.now() > entry.expiresAt) {
      passwordResetOtps.delete(resetToken)
      return sendJson(res, 400, { message: 'OTP expired. Please request a new OTP.' })
    }
    if (entry.attempts >= 5) {
      passwordResetOtps.delete(resetToken)
      return sendJson(res, 429, { message: 'Too many OTP attempts. Please request a new OTP.' })
    }

    const valid = await bcrypt.compare(otp, entry.otpHash)
    if (!valid) {
      entry.attempts += 1
      return sendJson(res, 400, { message: 'Invalid OTP.' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    const result = await query(
      'UPDATE users SET password = $1 WHERE id = $2 AND school_id = $3 AND is_active = true',
      [hashed, entry.userId, entry.schoolId],
    )
    passwordResetOtps.delete(resetToken)
    if (result.rowCount === 0) {
      return sendJson(res, 404, { message: 'User account was not found.' })
    }
    return sendJson(res, 200, { message: 'Password updated successfully. Please login with your new password.' })
  } catch (err) {
    console.error('Password reset confirm error:', err.message)
    return sendJson(res, 500, { message: 'Unable to reset password.' })
  }
})

router.get('/me', protect, async (req, res) => {
  try {
    const decoded = req.user || {}
    let user
    try {
      const result = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.id])
      if (result.rows.length > 0) {
        user = result.rows[0]
      }
    } catch (dbErr) {
      if (DEMO_LOGIN_ENABLED) {
        const email = decoded.email || 'demo@assps.edu.pk'
        const account = demoAccounts[email] || demoAccounts['demo@assps.edu.pk']
        return sendJson(res, 200, {
          user: {
            id: decoded.id || 999,
            school_id: normalizeSchoolId(decoded.school_id || account.school_id),
            tenant_id: decoded.tenant_id || decoded.tenantId || null,
            school_code: decoded.school_code || decoded.schoolCode || null,
            name: decoded.name || account.name,
            email: email,
            role: decoded.role || account.role,
            designation: decoded.designation || account.designation,
          },
          schoolBranding: buildSchoolBranding(await fetchSchoolById(normalizeSchoolId(decoded.school_id || account.school_id))),
        })
      }
      throw dbErr
    }

    if (!user) {
      const virtualUser = await findVirtualBranchUser(decoded.email)
      if (virtualUser) {
        return sendJson(res, 200, {
          user: buildUserPayload(virtualUser),
          schoolBranding: buildSchoolBranding(virtualUser.branchDetails),
        })
      }

      if (DEMO_LOGIN_ENABLED) {
        const email = decoded.email || 'demo@assps.edu.pk'
        const account = demoAccounts[email] || demoAccounts['demo@assps.edu.pk']
        return sendJson(res, 200, {
          user: {
            id: decoded.id || 999,
            school_id: normalizeSchoolId(decoded.school_id || account.school_id),
            tenant_id: decoded.tenant_id || decoded.tenantId || null,
            school_code: decoded.school_code || decoded.schoolCode || null,
            name: decoded.name || account.name,
            email: email,
            role: decoded.role || account.role,
            designation: decoded.designation || account.designation,
          },
          schoolBranding: buildSchoolBranding(await fetchSchoolById(normalizeSchoolId(decoded.school_id || account.school_id))),
        })
      }
      return sendJson(res, 404, { message: 'User not found.' })
    }

    const school = user.school_id ? await fetchSchoolById(user.school_id) : null
    return sendJson(res, 200, {
      user: buildUserPayload({
        ...user,
        tenant_id: user.tenant_id || school?.tenant_id || null,
        code: school?.code || null,
      }),
      schoolBranding: buildSchoolBranding(school),
    })
  } catch (err) {
    console.error('Auth me error:', err.message)
    if (DEMO_LOGIN_ENABLED || isMissingUsersTableError(err)) {
      const decoded = req.user || {}
      const email = decoded.email || 'demo@assps.edu.pk'
      const account = demoAccounts[email] || demoAccounts['demo@assps.edu.pk']
      return sendJson(res, 200, {
        user: {
          id: decoded.id || 999,
          school_id: normalizeSchoolId(decoded.school_id || account.school_id),
          tenant_id: decoded.tenant_id || decoded.tenantId || null,
          school_code: decoded.school_code || decoded.schoolCode || null,
          name: decoded.name || account.name,
          email: email,
          role: decoded.role || account.role,
          designation: decoded.designation || account.designation,
        },
        schoolBranding: buildSchoolBranding(await fetchSchoolById(normalizeSchoolId(decoded.school_id || account.school_id))),
      })
    }
    return sendJson(res, 401, { message: 'Token is invalid or expired.' })
  }
})

router.post('/users', protect, async (req, res) => {
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
    return sendJson(res, 403, { message: 'Permission denied.' })
  }
  
  const { name, email, password, role, designation } = req.body;
  if (!name || !email || !password || !role) {
    return sendJson(res, 400, { message: 'Name, email, password, and role are required.' })
  }

  const schoolId = req.user.role === 'super_admin'
    ? Number(req.body.school_id || req.body.schoolId)
    : Number(req.user.school_id)

  if (!Number.isFinite(schoolId) || schoolId <= 0) {
    return sendJson(res, 400, { message: 'A valid school_id is required to create a user.' })
  }

  try {
    const schoolResult = await query('SELECT id, tenant_id FROM schools WHERE id = $1 LIMIT 1', [schoolId])
    const school = schoolResult.rows[0]
    if (!school) {
      return sendJson(res, 404, { message: 'School not found.' })
    }
    if (req.user.role !== 'super_admin' && Number(req.user.school_id) !== schoolId) {
      return sendJson(res, 403, { message: 'Cannot create users for another school.' })
    }

    const hashed = await bcrypt.hash(password, 10);
    const supportsTenantId = await hasColumn('users', 'tenant_id').catch(() => false)
    const tenantId = supportsTenantId ? (school.tenant_id || currentTenantId(req) || null) : null
    const result = supportsTenantId
      ? await query(
        `INSERT INTO users (name, email, password, role, designation, school_id, tenant_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id, name, email, role, school_id, tenant_id`,
        [name, email, hashed, role, designation || role, schoolId, tenantId]
      )
      : await query(
        `INSERT INTO users (name, email, password, role, designation, school_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, name, email, role, school_id`,
        [name, email, hashed, role, designation || role, schoolId]
      )
    return sendJson(res, 201, { message: 'User created successfully', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return sendJson(res, 400, { message: 'A user with this email already exists.' })
    }
    console.error('Create user error:', err.message);
    return sendJson(res, 500, { message: 'Failed to create user.' })
  }
})

router.put('/users/password', protect, async (req, res) => {
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
    return sendJson(res, 403, { message: 'Permission denied.' })
  }

  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return sendJson(res, 400, { message: 'Email and newPassword are required.' })
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    let sql = 'UPDATE users SET password = $1 WHERE email = $2';
    const params = [hashed, email];
    
    if (req.user.role !== 'super_admin') {
      sql += ' AND school_id = $3';
      params.push(req.user.school_id);
    }
    
    const result = await query(sql, params);
    if (result.rowCount === 0) {
      return sendJson(res, 404, { message: 'User not found or permission denied.' });
    }
    
    return sendJson(res, 200, { message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err.message);
    return sendJson(res, 500, { message: 'Failed to update password.' })
  }
})

router.post('/change-password', protect, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return sendJson(res, 400, { message: 'Password must be at least 8 characters long.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    
    const userId = req.user?.id;
    if (!userId) {
      return sendJson(res, 401, { message: 'Unauthorized: missing user ID.' });
    }

    const result = await query(
      'UPDATE users SET password = $1, must_change_password = false WHERE id = $2 RETURNING id',
      [hashed, userId]
    );

    if (result.rowCount === 0) {
      return sendJson(res, 404, { message: 'User not found.' });
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return sendJson(res, 500, { success: false, message: 'Server error' });
  }
});

router.post('/change-temporary-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body || {}

    if (!userId || !currentPassword || !newPassword) {
      return sendJson(res, 400, { message: 'All fields are required' })
    }

    if (String(newPassword).length < 8) {
      return sendJson(res, 400, { message: 'New password must be at least 8 characters' })
    }

    const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId])
    const user = result.rows[0]

    if (!user) {
      return sendJson(res, 404, { message: 'User not found' })
    }
    if (!user.must_change_password) {
      return sendJson(res, 403, { message: 'Temporary password change is not available for this account.' })
    }

    const isValidPassword = await bcrypt.compare(String(currentPassword), user.password)
    if (!isValidPassword) {
      return sendJson(res, 400, { message: 'Current password is incorrect' })
    }

    const hashedNewPassword = await bcrypt.hash(String(newPassword), 10)
    await query(
      'UPDATE users SET password = $1, must_change_password = false WHERE id = $2',
      [hashedNewPassword, userId]
    )

    return sendJson(res, 200, { message: 'Password changed successfully' })
  } catch (error) {
    console.error('Temporary password change error:', error)
    return sendJson(res, 500, { message: 'Password change failed' })
  }
})

module.exports = router
