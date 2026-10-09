'use strict'
// Architecture V1 — authenticated, school- and actor-bound database scope.
// Never accept client-supplied tenant or role as authority. Feature gated.
const { tenantContext } = require('../config/database')
const { currentSchoolId } = require('./tenant')

const PAPER_ROLES = new Set(['admin','school_admin','principal','teacher','super_admin','result_entry'])

// The shared legacy currentSchoolId() accepts numeric prefixes via parseInt.
// Re-validate trusted JWT / server-bound IDs at this restricted Paper boundary
// before constructing a signed PostgreSQL tenant or actor context.
function canonicalPaperId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value.trim())) {
    const id = Number(value.trim())
    return Number.isSafeInteger(id) && id > 0 ? id : null
  }
  return null
}

function verifiedPaperContext(req) {
  const role = String(req.user?.role || '').trim().toLowerCase()
  const actorId = canonicalPaperId(req.user?.id)
  // A malformed explicit server school ID must not be silently converted by
  // resolveSchoolId() or discarded in favor of a second valid fallback.
  const explicitSchoolValid = req.school_id == null || canonicalPaperId(req.school_id) !== null
  const tenantSchoolValid = req.tenantSchoolId == null || canonicalPaperId(req.tenantSchoolId) !== null
  const requestedSchoolId = canonicalPaperId(currentSchoolId(req))
  const serverBoundSchoolId = role === 'super_admin'
    ? canonicalPaperId(req.school_id)
    : canonicalPaperId(req.user?.school_id)
  if (!req.user || !PAPER_ROLES.has(role) ||
      !explicitSchoolValid || !tenantSchoolValid ||
      !Number.isSafeInteger(actorId) || actorId <= 0 ||
      !Number.isSafeInteger(requestedSchoolId) || requestedSchoolId <= 0 ||
      !Number.isSafeInteger(serverBoundSchoolId) || serverBoundSchoolId !== requestedSchoolId) {
    const err = new Error('Restricted Paper data requires authenticated school and actor context')
    err.code = 'PAPER_DB_CONTEXT_FORBIDDEN'
    err.status = 403
    throw err
  }
  return {
    rlsEnabled:true,
    paperRestricted:true,
    isSuperAdmin:false,
    tenantId:serverBoundSchoolId,
    tenantKey:String(req.tenant_id || req.user.tenant_id || req.school?.tenant_id || ''),
    paperActorId:actorId,
    paperActorRole:role,
  }
}

function paperRestrictedDatabase(req,res,next) {
  if(process.env.PAPER_RESTRICTED_DB_ENABLED!=='true')return next()
  try {
    const existing=tenantContext.getStore()
    if(!existing)throw Object.assign(new Error('Missing request authentication context'),{status:403,code:'PAPER_DB_CONTEXT_FORBIDDEN'})
    Object.assign(existing, verifiedPaperContext(req))
    return next()
  }catch(err){return res.status(err.status || 403).json({success:false,code:err.code || 'PAPER_DB_CONTEXT_FORBIDDEN'})}
}

// For mixed-purpose endpoints such as Global Search and Lesson Planner, route
// only protected Paper/Question/Curriculum reads through the restricted pool.
// Fee, student and other unrelated SaaS queries keep their existing connection.
function withPaperRestrictedScope(req,fn) {
  if(process.env.PAPER_RESTRICTED_DB_ENABLED!=='true')return fn()
  const existing=tenantContext.getStore() || {}
  return tenantContext.run({...existing,...verifiedPaperContext(req)},fn)
}
module.exports={paperRestrictedDatabase,withPaperRestrictedScope,verifiedPaperContext}
