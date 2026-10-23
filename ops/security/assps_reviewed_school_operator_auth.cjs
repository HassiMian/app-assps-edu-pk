'use strict'
const { requireConfiguredSchoolId } = require('./schoolChannelGuard.cjs')
function isAuthorizedSchoolOperator(user, configuredSchoolId) {
  const role = String(user?.role || '')
  const schoolId = Number(user?.school_id)
  return Number.isSafeInteger(configuredSchoolId)
    && configuredSchoolId > 0
    && Number.isSafeInteger(schoolId)
    && schoolId === configuredSchoolId
    && user?.account_type !== 'service'
    && ['principal', 'admin', 'school_admin'].includes(role)
}
function authorizeSchoolOperator(req, res, next) {
  let configuredSchoolId
  try { configuredSchoolId = requireConfiguredSchoolId() }
  catch { return res.status(503).json({success:false,error:'SCHOOL_CHANNEL_NOT_CONFIGURED'}) }
  if (!isAuthorizedSchoolOperator(req.user, configuredSchoolId))
    return res.status(403).json({success:false,error:'SCHOOL_OPERATOR_IDENTITY_SCOPE_DENIED'})
  return next()
}
module.exports = { isAuthorizedSchoolOperator, authorizeSchoolOperator }
