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

async function fetchSchoolById(schoolId) {
  try {
    const result = await query('SELECT id, name, code, tenant_id, status, feature_flags FROM schools WHERE id = $1 LIMIT 1', [schoolId])
    return result.rows[0] || null
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Database connection failed in fetchSchoolById:', err.message)
      return null
    }
    console.error('Database connection failed in fetchSchoolById, returning mock active school:', err.message)
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

async function protect(req, res, next) {
  const token = getRequestToken(req)
  if (!token) return sendJson(res, 401, { message: 'Token required' })

  if (process.env.DEMO_LOGIN_ENABLED === 'true' && token === 'mock-jwt-token') {
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
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    req.school_id = req.user?.school_id || req.user?.schoolId || null

    if (req.user?.role !== 'super_admin') {
      if (!req.school_id) {
        return sendJson(res, 403, { message: 'School context is missing in user profile.' })
      }
      const school = await fetchSchoolById(req.school_id)
      if (!school) {
        return sendJson(res, 403, { message: 'School context not found. Please contact support.' })
      }
      req.school = school
      req.school_code = school?.code || req.user?.school_code || req.user?.schoolCode || null
      req.tenant_id = req.user?.tenant_id || req.user?.tenantId || school?.tenant_id || null
      req.user.tenant_id = req.tenant_id
      req.user.school_code = req.school_code
      if (!isSchoolActive(school)) {
        return sendJson(res, 403, {
          message: `School access disabled. Subscription status: ${school.status}. Contact your administrator.`,
        })
      }
    } else {
      req.school_code = req.user?.school_code || req.user?.schoolCode || null
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
    console.error('JWT Verification failed! Secret used:', JWT_SECRET ? (JWT_SECRET.slice(0, 5) + '...') : 'undefined', 'Error:', err.message, 'Token snippet:', token ? (token.slice(0, 15) + '...') : 'undefined')
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

module.exports = { protect, adminOnly, requireRoles, requireFeature }
