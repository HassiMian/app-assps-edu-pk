'use strict'

// APEX Connect checks the authenticated session through /api/auth/me on every
// protected navigation. These checks MUST NOT exhaust the stricter, shared
// authentication-attempt quota. Actual login, refresh and password changes
// remain throttled and still require the regular authentication middleware.
function isReadOnlySessionIntrospection(req) {
  const method = String(req?.method || '').toUpperCase()
  const path = String(req?.path || '')
  return (method === 'GET' || method === 'HEAD') && path === '/me'
}

function guardAuthAttempts(authLimiter) {
  if (typeof authLimiter !== 'function') {
    throw new TypeError('An authentication attempt rate limiter is required')
  }
  return (req, res, next) => {
    if (isReadOnlySessionIntrospection(req)) return next()
    return authLimiter(req, res, next)
  }
}

module.exports = { isReadOnlySessionIntrospection, guardAuthAttempts }
