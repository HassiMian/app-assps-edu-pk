const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { query } = require('../config/database')

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-jwt-secret')

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.')
}

function sendJson(res, status, payload) {
  return res.status(status).json({ success: status >= 200 && status < 300, ...payload })
}

function parseCookieToken(req) {
  if (req.cookies?.authToken) return req.cookies.authToken

  const cookieHeader = req.headers.cookie || ''
  const authCookie = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('authToken='))

  if (!authCookie) return ''

  try {
    return decodeURIComponent(authCookie.slice('authToken='.length))
  } catch {
    return authCookie.slice('authToken='.length)
  }
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  if (authHeader) return authHeader
  return parseCookieToken(req)
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex')
}

function timingSafeEqualHex(left, right) {
  if (!left || !right || left.length !== right.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
  } catch {
    return false
  }
}

function serviceScopes() {
  return splitCsv(process.env.JARVIS_SCHOOL_SERVICE_SCOPES || [
    'school.students.read',
    'school.classes.read',
    'school.fees.read',
    'school.attendance.read',
    'school.results.read',
    'school.timetable.read',
    'school.staff.read',
    'school.admissions.read',
    'school.notices.read',
  ].join(','))
}

function isExpired(expiresAt) {
  if (!expiresAt) return false
  const expiry = Date.parse(expiresAt)
  return Number.isFinite(expiry) && Date.now() >= expiry
}

async function authenticateServiceToken(token, req) {
  const expectedHash = String(process.env.JARVIS_SCHOOL_SERVICE_TOKEN_SHA256 || '').trim().toLowerCase()
  if (!expectedHash || !token) return false
  if (!timingSafeEqualHex(hashToken(token), expectedHash)) return false
  if (isExpired(process.env.JARVIS_SCHOOL_SERVICE_EXPIRES_AT)) {
    return { errorStatus: 401, message: 'Service credential is expired.' }
  }

  const configuredIdentity = String(process.env.JARVIS_SCHOOL_SERVICE_IDENTITY || '').trim()
  const configuredTenantId = String(process.env.JARVIS_SCHOOL_SERVICE_TENANT_ID || '').trim()
  const configuredSchoolId = String(process.env.JARVIS_SCHOOL_SERVICE_SCHOOL_ID || '').trim()
  if (process.env.NODE_ENV === 'production' && (!configuredIdentity || !configuredTenantId || !configuredSchoolId)) {
    return { errorStatus: 403, message: 'Service credential claims are not fully configured.' }
  }

  const serviceIdentity = configuredIdentity || 'JARVIS_SCHOOL_SERVICE'
  const tenantId = configuredTenantId || 'assps'
  const schoolId = Number.parseInt(configuredSchoolId || '1', 10)
  if (!Number.isFinite(schoolId) || schoolId <= 0) {
    return { errorStatus: 403, message: 'Service school claim is invalid.' }
  }

  const school = await fetchSchoolById(schoolId)
  if (!school || !isSchoolActive(school)) {
    return { errorStatus: 403, message: 'Service school context is unavailable or inactive.' }
  }
  const schoolTenantId = school?.tenant_id || school?.code || null
  if (tenantId && schoolTenantId && String(schoolTenantId) !== String(tenantId)) {
    return { errorStatus: 403, message: 'Service tenant claim does not match school tenant.' }
  }

  req.user = {
    id: `service:${serviceIdentity}`,
    email: null,
    role: 'service',
    account_type: 'service',
    service_identity: serviceIdentity,
    school_id: schoolId,
    school_code: school?.code || null,
    tenant_id: tenantId || schoolTenantId,
    scopes: serviceScopes(),
    permissions: serviceScopes(),
    name: serviceIdentity,
    designation: 'Machine-to-machine service',
  }
  req.school_id = schoolId
  req.school = school
  req.school_code = school?.code || null
  req.tenant_id = req.user.tenant_id
  return true
}

async function fetchSchoolById(schoolId) {
  try {
    const result = await query('SELECT id, name, code, tenant_id, status, feature_flags FROM schools WHERE id = $1 LIMIT 1', [schoolId])
    return result.rows[0] || null
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Database connection failed in fetchSchoolById:', err.message)
      return null
    }
    console.error('Database connection failed in fetchSchoolById, returning development mock active school:', err.message)
    return {
      id: schoolId || 1,
      name: 'Al Siddique Scholars Public School',
      code: 'assps',
      status: 'active',
      feature_flags: ['paper_generator', 'ai_analytics', 'attendance_qr', 'fees_view', 'employees']
    }
  }
}

function isSchoolActive(school) {
  return school && ['active', 'trial'].includes(String(school.status || '').toLowerCase())
}

function normalizeSchoolId(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildUserContext(user, school = null) {
  return {
    id: user.id,
    email: user.email || null,
    role: user.role,
    school_id: normalizeSchoolId(user.school_id),
    school_code: school?.code || user.school_code || user.schoolCode || null,
    tenant_id: user.tenant_id || user.tenantId || school?.tenant_id || null,
    name: user.name || null,
    designation: user.designation || null,
  }
}

async function fetchActiveUserById(userId) {
  const parsedId = Number.parseInt(userId, 10)
  if (!Number.isFinite(parsedId)) return null
  const result = await query(
    `SELECT id, school_id, name, email, role, designation
     FROM users
     WHERE id = $1 AND is_active = true
     LIMIT 1`,
    [parsedId],
  )
  return result.rows[0] || null
}

async function fetchVirtualBranchUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return null
  const result = await query('SELECT school_id, school_access FROM settings WHERE school_access IS NOT NULL')
  for (const row of result.rows) {
    if (!Array.isArray(row.school_access)) continue
    const branch = row.school_access.find(item => {
      return item?.active && String(item.adminEmail || '').trim().toLowerCase() === normalizedEmail
    })
    if (branch) {
      return {
        id: 9000000 + Number(row.school_id || 0),
        school_id: row.school_id,
        name: `${branch.schoolName || 'Branch'} Admin`,
        email: branch.adminEmail,
        role: 'admin',
        designation: 'Branch Admin',
        school_code: branch.schoolCode || null,
      }
    }
  }
  return null
}

async function protect(req, res, next) {
  const token = getRequestToken(req)
  if (!token) return sendJson(res, 401, { message: 'Token required' })

  const serviceAuth = await authenticateServiceToken(token, req)
  if (serviceAuth === true) return next()
  if (serviceAuth && serviceAuth.errorStatus) {
    return sendJson(res, serviceAuth.errorStatus, { message: serviceAuth.message })
  }

  if (process.env.NODE_ENV !== 'production' && process.env.DEMO_LOGIN_ENABLED === 'true' && token === 'mock-jwt-token') {
    req.user = {
      id: 999,
      email: 'admin@alsiddique.edu.pk',
      role: 'admin',
      school_id: 1,
      school_code: 'assps',
      name: 'Super Admin',
      designation: 'Admin'
    }
    req.school_id = 1
    req.school = await fetchSchoolById(1)
    req.school_code = req.school?.code || 'assps'
    return next()
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    let activeUser = await fetchActiveUserById(decoded?.id)
    if (!activeUser) {
      activeUser = await fetchVirtualBranchUserByEmail(decoded?.email)
    }
    if (!activeUser) {
      return sendJson(res, 401, { message: 'Invalid or expired token.' })
    }
    if (decoded?.email && activeUser.email && String(decoded.email).toLowerCase() !== String(activeUser.email).toLowerCase()) {
      return sendJson(res, 401, { message: 'Invalid or expired token.' })
    }

    req.user = buildUserContext(activeUser)
    req.school_id = req.user.school_id

    if (req.user.role !== 'super_admin') {
      if (!req.school_id) {
        return sendJson(res, 403, { message: 'School context is missing in user profile.' })
      }
      const school = await fetchSchoolById(req.school_id)
      if (!school) {
        return sendJson(res, 403, { message: 'School context not found. Please contact support.' })
      }
      req.school = school
      req.school_code = school?.code || req.user.school_code || null
      req.tenant_id = req.user.tenant_id || school?.tenant_id || null
      req.user.tenant_id = req.tenant_id
      req.user.school_code = req.school_code
      if (!isSchoolActive(school)) {
        return sendJson(res, 403, {
          message: `School access disabled. Subscription status: ${school.status}. Contact your administrator.`,
        })
      }
    } else {
      req.school_code = req.user.school_code || null
    }

    // Demo Mode Guard: Block destructive actions for school_id: 2 or demo email
    if (Number(req.school_id) === 2 || req.user?.email === 'demo@assps.edu.pk') {
      const method = req.method.toUpperCase();
      const url = req.originalUrl.toLowerCase();
      
      if (method === 'DELETE' || 
         (method === 'PUT' && (url.includes('/settings') || url.includes('/pay') || url.includes('/logo') || url.includes('/twilio'))) ||
         (method === 'POST' && (url.includes('/import') || url.includes('/reset') || url.includes('/bulk') || url.includes('/seed')))) {
        return sendJson(res, 403, { message: 'Destructive actions, settings modifications, and fee payments are disabled in Demo Mode.' });
      }
    }

    return next()
  } catch (err) {
    console.warn('JWT verification failed:', err.name || 'JwtError')
    return sendJson(res, 401, { message: 'Invalid or expired token.' })
  }
}

function adminOnly(req, res, next) {
  const allowed = ['super_admin', 'admin', 'principal']
  if (!req.user?.role || !allowed.includes(req.user.role)) {
    return sendJson(res, 403, { message: 'Admin or principal only' })
  }
  next()
}

function hasServiceScope(req, scope) {
  if (req.user?.account_type !== 'service') return false
  const scopes = Array.isArray(req.user?.scopes) ? req.user.scopes : []
  return scopes.includes(scope)
}

function requireServiceScope(scope) {
  return (req, res, next) => {
    if (hasServiceScope(req, scope)) return next()
    return sendJson(res, 403, { message: `Service permission denied. Required scope: ${scope}` })
  }
}

function requireScopeForServiceOnly(scope) {
  return (req, res, next) => {
    if (req.user?.account_type !== 'service') return next()
    if (hasServiceScope(req, scope)) return next()
    return sendJson(res, 403, { message: `Service permission denied. Required scope: ${scope}` })
  }
}

function adminOrServiceScope(scope) {
  return (req, res, next) => {
    if (hasServiceScope(req, scope)) return next()
    return adminOnly(req, res, next)
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return sendJson(res, 403, {
        message: `Access denied. Allowed roles: ${roles.join(', ')}`
      })
    }
    next()
  }
}

function parseSchoolFeatureFlags(school) {
  if (!school) return []
  if (Array.isArray(school.feature_flags)) return school.feature_flags
  if (typeof school.feature_flags === 'string') {
    try {
      return JSON.parse(school.feature_flags)
    } catch {
      return []
    }
  }
  return []
}

function requireFeature(feature) {
  return (req, res, next) => {
    if (req.user?.role === 'super_admin') {
      return next()
    }
    if (!req.school) {
      return sendJson(res, 403, { message: 'School context is required to verify feature access.' })
    }
    const enabledFeatures = parseSchoolFeatureFlags(req.school)
    if (!enabledFeatures.includes(feature)) {
      return sendJson(res, 403, {
        message: `Feature access denied. The school is not subscribed to ${feature.replace(/_/g, ' ')}.`,
      })
    }
    next()
  }
}

module.exports = { protect, adminOnly, requireRoles, requireFeature, requireServiceScope, requireScopeForServiceOnly, adminOrServiceScope, hasServiceScope }
