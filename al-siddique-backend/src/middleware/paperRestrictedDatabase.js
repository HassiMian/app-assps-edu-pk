// Architecture V1: route-scoped, authenticated Paper/Assessment DB boundary.
// Auth must have already verified the user/token and resolved the school.
// No client-supplied school_id / tenantId can override a non-platform actor.
const { tenantContext } = require('../config/database')
const { currentSchoolId } = require('./tenant')

function paperRestrictedDatabase(req, res, next) {
  if (process.env.PAPER_RESTRICTED_DB_ENABLED !== 'true') return next()
  const scope = tenantContext.getStore()
  const actor = req.user
  const schoolId = Number(currentSchoolId(req))
  const role = String(actor?.role || '').trim().toLowerCase()
  if (!scope || !actor || !['admin','school_admin','principal','teacher','super_admin'].includes(role)) {
    return res.status(403).json({ success: false, code: 'PAPER_DB_AUTH_REQUIRED' })
  }
  // Platform administrators must select an authenticated school context via
  // normal tenant middleware; arbitrary query/body fields never select it.
  // Never let a platform user choose an arbitrary tenant from a query/body
  // parameter. Require a server-bound school identity for this boundary.
  // Ordinary actors are bound to their authenticated user.school_id, even
  // when an upstream proxy or route supplies a forged req.school_id.
  // Platform admins require a server-bound req.school_id (never query/body).
  const verifiedSchoolId = role === 'super_admin'
    ? Number(req.school_id)
    : Number(actor.school_id)
  if (!Number.isSafeInteger(schoolId) || schoolId <= 0 ||
      !Number.isSafeInteger(verifiedSchoolId) || verifiedSchoolId !== schoolId) {
    return res.status(403).json({ success: false, code: 'PAPER_DB_TENANT_REQUIRED' })
  }
  const actorId = Number(actor.id)
  if (!Number.isSafeInteger(actorId) || actorId <= 0) {
    return res.status(403).json({ success: false, code: 'PAPER_DB_ACTOR_REQUIRED' })
  }
  scope.paperActorId = actorId
  scope.paperActorRole = role
  scope.rlsEnabled = true
  scope.paperRestricted = true
  scope.isSuperAdmin = false
  scope.tenantId = schoolId
  scope.tenantKey = String(req.tenant_id || actor.tenant_id || req.school?.tenant_id || '')
  return next()
}

module.exports = { paperRestrictedDatabase }
