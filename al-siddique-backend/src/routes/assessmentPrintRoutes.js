const express = require('express')
const router = express.Router()

const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const {
  createRosterSnapshot,
  createTeacherBindingSnapshot,
  createPrintJob,
  recordPrintAttempt,
  recordBookletPlan,
} = require('../services/printJobPipeline')

const canPrintAssessments = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')

function schoolIdForRequest(req, body = {}) {
  const direct = currentSchoolId(req)
  if (direct) return direct
  if (req.user?.role === 'super_admin' || req.user?.role === 'platform_owner') {
    const explicit = Number.parseInt(body.schoolId ?? req.query.school_id ?? req.query.schoolId, 10)
    return Number.isFinite(explicit) && explicit > 0 ? explicit : null
  }
  return null
}

function statusFor(error) {
  if (error?.status) return Number(error.status)
  if (['ASSESSMENT_RELEASE_NOT_FOUND','ROSTER_SNAPSHOT_NOT_FOUND','TEACHER_BINDING_SNAPSHOT_NOT_FOUND','PRINT_JOB_NOT_FOUND','TEACHER_BINDING_NOT_FOUND'].includes(error?.code)) return 404
  if (['TEACHER_BINDING_AMBIGUOUS','PRINT_RETRY_CONFIRMATION_REQUIRED','PRINT_BOOKLET_PLAN_ALREADY_FROZEN'].includes(error?.code)) return 409
  if (['TEACHER_OVERRIDE_REASON_REQUIRED','ROSTER_SNAPSHOT_REQUIRED','BOOKLET_PLAN_REQUIRES_STUDENT_BATCH','INVALID_COPY_COUNT','PRINT_BATCH_LIMIT_EXCEEDED'].includes(error?.code)) return 400
  return 500
}

function sendError(res, error) {
  const status = statusFor(error)
  if (status >= 500) console.error('Assessment print pipeline error:', error?.message || error)
  return res.status(status).json({ success:false, code:error?.code || 'PRINT_PIPELINE_ERROR', message:error?.message || 'Print operation failed.' })
}

router.use(protect, canPrintAssessments)

router.post('/roster-snapshots', async (req,res) => {
  try {
    const schoolId = schoolIdForRequest(req, req.body)
    if (!schoolId) return res.status(403).json({ success:false, code:'TENANT_REQUIRED', message:'School context is required.' })
    const data = await createRosterSnapshot({ schoolId, className:req.body?.className, section:req.body?.section || null, userId:req.user?.id || null })
    return res.status(201).json({ success:true, data })
  } catch (error) { return sendError(res,error) }
})

router.post('/teacher-bindings', async (req,res) => {
  try {
    const schoolId = schoolIdForRequest(req, req.body)
    if (!schoolId) return res.status(403).json({ success:false, code:'TENANT_REQUIRED', message:'School context is required.' })
    const data = await createTeacherBindingSnapshot({ schoolId, className:req.body?.className, section:req.body?.section || null, subject:req.body?.subject, userId:req.user?.id || null, override:req.body?.override || null })
    return res.status(201).json({ success:true, data })
  } catch (error) { return sendError(res,error) }
})

router.post('/jobs', async (req,res) => {
  try {
    const schoolId = schoolIdForRequest(req, req.body)
    if (!schoolId) return res.status(403).json({ success:false, code:'TENANT_REQUIRED', message:'School context is required.' })
    const data = await createPrintJob({
      schoolId,
      releaseId:req.body?.releaseId,
      rosterSnapshotId:req.body?.rosterSnapshotId || null,
      teacherBindingSnapshotId:req.body?.teacherBindingSnapshotId || null,
      artifactKind:req.body?.artifactKind || 'master',
      duplex:Boolean(req.body?.duplex),
      copyCount:Number(req.body?.copyCount || 1),
      rendererVersion:req.body?.rendererVersion || 'assps-paper-workspace-v1',
      browserEngineVersion:req.body?.browserEngineVersion || null,
      settings:req.body?.settings || {},
      userId:req.user?.id || null,
    })
    return res.status(201).json({ success:true, data })
  } catch (error) { return sendError(res,error) }
})

router.post('/jobs/:publicId/booklets', async (req,res) => {
  try {
    const schoolId = schoolIdForRequest(req, req.body)
    if (!schoolId) return res.status(403).json({ success:false, code:'TENANT_REQUIRED', message:'School context is required.' })
    const data = await recordBookletPlan({ schoolId, printJobPublicId:req.params.publicId, pageCounts:req.body?.pageCounts || {} })
    return res.status(201).json({ success:true, data })
  } catch (error) { return sendError(res,error) }
})

router.post('/jobs/:publicId/attempts', async (req,res) => {
  try {
    const schoolId = schoolIdForRequest(req, req.body)
    if (!schoolId) return res.status(403).json({ success:false, code:'TENANT_REQUIRED', message:'School context is required.' })
    const data = await recordPrintAttempt({ schoolId, printJobPublicId:req.params.publicId, actorId:req.user?.id || null, operatorConfirmed:Boolean(req.body?.operatorConfirmed), note:req.body?.note || null })
    return res.status(201).json({ success:true, data })
  } catch (error) { return sendError(res,error) }
})

module.exports = router
