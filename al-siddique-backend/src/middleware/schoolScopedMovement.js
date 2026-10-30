'use strict'
/**
 * Force signed, school-bounded database context for the single already-
 * authenticated Principal/Admin movement route. This is a narrowing operation:
 * even a platform super_admin may only move within their verified user school.
 * Do not accept school ID from query/body/headers.
 */
function schoolScopedMovement(tenantContext) {
  return (req, res, next) => {
    const role=String(req.user?.role||'').trim().toLowerCase()
    const allow=new Set(['principal','admin','super_admin'])
    const id=Number(req.user?.id)
    const school=Number(req.user?.school_id)
    const authenticatedSchool=Number(req.school_id)
    const ctx=tenantContext.getStore()
    const originalSchool=ctx && ctx.tenantId!=null ? Number(ctx.tenantId) : null
    if (!allow.has(role) ||
        !Number.isSafeInteger(id) || id<=0 ||
        !Number.isSafeInteger(school) || school<=0 ||
        !Number.isSafeInteger(authenticatedSchool) || school!==authenticatedSchool ||
        !ctx || ctx.rlsEnabled!==true ||
        (originalSchool!==null && originalSchool!==school)) {
      return res.status(403).json({
        success:false, code:'SIGNED_MOVEMENT_ACTOR_SCOPE_REQUIRED',
        message:'Authenticated Principal school scope could not be confirmed. No students moved.'
      })
    }
    // Auth.protect has already verified JWT issuer, active DB account and
    // signed JWT.school_id === activeUser.school_id before reaching this route.
    ctx.actorId=id
    ctx.isSuperAdmin=false
    ctx.tenantId=school
    ctx.tenantKey=String(req.user.tenant_id||req.tenant_id||ctx.tenantKey||'').trim() || null
    next()
  }
}
module.exports={schoolScopedMovement}
