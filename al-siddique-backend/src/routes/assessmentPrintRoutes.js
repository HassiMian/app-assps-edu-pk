const express = require('express')
const router = express.Router()

const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const {
  buildStudentSafeProjection,
  buildStaffAnswerKeyProjection,
  createRosterSnapshot,
  createTeacherBindingSnapshot,
  createPrintJob,
  recordPrintAttempt,
  recordBookletPlan,
  withTenantTransaction,
} = require('../services/printJobPipeline')

const canOperatePrint = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')
router.use(protect, canOperatePrint)

const clean = value => String(value ?? '').trim()

function schoolIdForRequest(req, body = {}) {
  const direct = currentSchoolId(req)
  if (direct) return direct
  if (req.user?.role === 'super_admin' || req.user?.role === 'platform_owner') {
    const explicit = Number.parseInt(body.schoolId ?? req.query.school_id ?? req.query.schoolId, 10)
    return Number.isFinite(explicit) && explicit > 0 ? explicit : null
  }
  return null
}

function actorId(req) {
  const id = Number(req.user?.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

function safePublicId(value, prefix) {
  const id = clean(value)
  if (!id || id.length > 220 || !/^[A-Za-z0-9._:-]+$/.test(id)) return null
  if (prefix && !id.startsWith(prefix)) return null
  return id
}

function sanitizeRow(row = {}) {
  const {
    id, school_id, created_by, actor_id, assessment_release_id,
    roster_snapshot_id, teacher_binding_snapshot_id, print_job_id,
    ...safe
  } = row
  return safe
}

function printErrorStatus(error) {
  if (Number(error?.status) >= 400) return Number(error.status)
  const code = String(error?.code || '')
  if (code.includes('NOT_FOUND')) return 404
  if (code === 'ANSWER_KEY_ROLE_REQUIRED') return 403
  if (code.includes('AMBIGUOUS') || code.includes('ALREADY_FROZEN') || code.includes('RETRY_CONFIRMATION')) return 409
  if (code.includes('REQUIRED') || code.startsWith('INVALID_') || code.includes('LIMIT_EXCEEDED')) return 400
  return 500
}

function sendPrintError(res, error, fallback) {
  const status = printErrorStatus(error)
  if (status >= 500) console.error(fallback, error?.message)
  return res.status(status).json({
    success:false,
    code:error?.code || 'PRINT_PIPELINE_ERROR',
    message:status >= 500 ? fallback : error.message,
  })
}

async function resolveSnapshotId(schoolId, table, publicId) {
  const allowed = new Set(['roster_snapshots','teacher_binding_snapshots'])
  if (!allowed.has(table)) throw new Error('Unsupported snapshot table')
  return withTenantTransaction(schoolId, async (client, tenantId) => {
    const result = await client.query('SELECT id FROM ' + table + ' WHERE school_id=$1 AND public_id=$2', [tenantId, publicId])
    return result.rowCount ? Number(result.rows[0].id) : null
  })
}

router.post('/roster-snapshots', async (req, res) => {
  const schoolId = schoolIdForRequest(req, req.body || {})
  const className = clean(req.body?.className)
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!className) return res.status(400).json({success:false,message:'className is required.'})
  try {
    const row = await createRosterSnapshot({
      schoolId,
      className,
      section:clean(req.body?.section) || null,
      userId:actorId(req),
    })
    return res.status(201).json({
      success:true,
      data:{
        ...sanitizeRow(row),
        members:Array.isArray(row.members) ? row.members.map(({id,studentId,...member}) => member) : [],
      },
    })
  } catch (error) {
    return sendPrintError(res,error,'Could not create roster snapshot.')
  }
})

router.post('/teacher-binding-snapshots', async (req, res) => {
  const schoolId = schoolIdForRequest(req, req.body || {})
  const className = clean(req.body?.className)
  const subject = clean(req.body?.subject)
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!className || !subject) return res.status(400).json({success:false,message:'className and subject are required.'})
  try {
    const row = await createTeacherBindingSnapshot({
      schoolId,
      className,
      section:clean(req.body?.section) || null,
      subject,
      override:req.body?.override || null,
      userId:actorId(req),
    })
    return res.status(201).json({success:true,data:sanitizeRow(row)})
  } catch (error) {
    return sendPrintError(res,error,'Could not create teacher binding snapshot.')
  }
})

router.post('/jobs', async (req, res) => {
  const schoolId = schoolIdForRequest(req, req.body || {})
  const releaseId = safePublicId(req.body?.releaseId, 'release-')
  const rosterPublicId = req.body?.rosterSnapshotPublicId ? safePublicId(req.body.rosterSnapshotPublicId, 'roster-') : null
  const teacherPublicId = req.body?.teacherBindingPublicId ? safePublicId(req.body.teacherBindingPublicId, 'teacher-binding-') : null
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!releaseId) return res.status(400).json({success:false,message:'Valid releaseId is required.'})
  if (req.body?.rosterSnapshotPublicId && !rosterPublicId) return res.status(400).json({success:false,message:'Invalid roster snapshot id.'})
  if (req.body?.teacherBindingPublicId && !teacherPublicId) return res.status(400).json({success:false,message:'Invalid teacher binding snapshot id.'})
  try {
    const rosterSnapshotId = rosterPublicId ? await resolveSnapshotId(schoolId,'roster_snapshots',rosterPublicId) : null
    if (rosterPublicId && !rosterSnapshotId) return res.status(404).json({success:false,code:'ROSTER_SNAPSHOT_NOT_FOUND',message:'Roster snapshot not found.'})
    const teacherBindingSnapshotId = teacherPublicId ? await resolveSnapshotId(schoolId,'teacher_binding_snapshots',teacherPublicId) : null
    if (teacherPublicId && !teacherBindingSnapshotId) return res.status(404).json({success:false,code:'TEACHER_BINDING_SNAPSHOT_NOT_FOUND',message:'Teacher binding snapshot not found.'})
    const row = await createPrintJob({
      schoolId,
      releaseId,
      rosterSnapshotId,
      teacherBindingSnapshotId,
      artifactKind:clean(req.body?.artifactKind) || 'master',
      duplex:Boolean(req.body?.duplex),
      copyCount:req.body?.copyCount ?? 1,
      rendererVersion:clean(req.body?.rendererVersion) || 'paper-workspace-v1',
      browserEngineVersion:clean(req.body?.browserEngineVersion) || null,
      settings:req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : {},
      userId:actorId(req),
    })
    return res.status(201).json({
      success:true,
      data:{
        ...sanitizeRow(row),
        releaseId,
        rosterSnapshotPublicId:rosterPublicId,
        teacherBindingPublicId:teacherPublicId,
      },
    })
  } catch (error) {
    return sendPrintError(res,error,'Could not create print job.')
  }
})

router.post('/jobs/:printJobId/booklets', async (req, res) => {
  const schoolId = schoolIdForRequest(req, req.body || {})
  const printJobPublicId = safePublicId(req.params.printJobId, 'print-')
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!printJobPublicId) return res.status(400).json({success:false,message:'Invalid print job id.'})
  if (!req.body?.pageCounts || typeof req.body.pageCounts !== 'object') return res.status(400).json({success:false,message:'pageCounts object is required.'})
  try {
    const data = await recordBookletPlan({schoolId,printJobPublicId,pageCounts:req.body.pageCounts})
    return res.status(201).json({success:true,data})
  } catch (error) {
    return sendPrintError(res,error,'Could not record booklet plan.')
  }
})

router.post('/jobs/:printJobId/attempts', async (req, res) => {
  const schoolId = schoolIdForRequest(req, req.body || {})
  const printJobPublicId = safePublicId(req.params.printJobId, 'print-')
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!printJobPublicId) return res.status(400).json({success:false,message:'Invalid print job id.'})
  try {
    const row = await recordPrintAttempt({
      schoolId,
      printJobPublicId,
      actorId:actorId(req),
      operatorConfirmed:Boolean(req.body?.operatorConfirmed),
      note:clean(req.body?.note) || null,
    })
    return res.status(201).json({success:true,data:sanitizeRow(row)})
  } catch (error) {
    return sendPrintError(res,error,'Could not record print attempt.')
  }
})

router.get('/jobs/:printJobId', async (req, res) => {
  const schoolId = schoolIdForRequest(req)
  const printJobPublicId = safePublicId(req.params.printJobId, 'print-')
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!printJobPublicId) return res.status(400).json({success:false,message:'Invalid print job id.'})
  try {
    const data = await withTenantTransaction(schoolId, async (client, tenantId) => {
      const result = await client.query(
        'SELECT pj.*, ar.release_id, rs.public_id AS roster_public_id, tb.public_id AS teacher_binding_public_id FROM print_jobs pj JOIN assessment_releases ar ON ar.school_id=pj.school_id AND ar.id=pj.assessment_release_id LEFT JOIN roster_snapshots rs ON rs.school_id=pj.school_id AND rs.id=pj.roster_snapshot_id LEFT JOIN teacher_binding_snapshots tb ON tb.school_id=pj.school_id AND tb.id=pj.teacher_binding_snapshot_id WHERE pj.school_id=$1 AND pj.public_id=$2',
        [tenantId, printJobPublicId]
      )
      if (!result.rowCount) return null
      const attempts = await client.query('SELECT attempt_number,status,operator_confirmed,note,created_at FROM print_job_attempts WHERE school_id=$1 AND print_job_id=$2 ORDER BY attempt_number',[tenantId,result.rows[0].id])
      const booklets = await client.query('SELECT booklet_index,start_page,content_pages,padding_pages,artifact_hash FROM print_job_booklets WHERE school_id=$1 AND print_job_id=$2 ORDER BY booklet_index',[tenantId,result.rows[0].id])
      return {job:sanitizeRow(result.rows[0]),attempts:attempts.rows,booklets:booklets.rows}
    })
    if (!data) return res.status(404).json({success:false,code:'PRINT_JOB_NOT_FOUND',message:'Print job not found.'})
    return res.json({success:true,data})
  } catch (error) {
    return sendPrintError(res,error,'Could not read print job.')
  }
})

router.post('/releases/:releaseId/student-projection', async (req, res) => {
  const schoolId = schoolIdForRequest(req, req.body || {})
  const releaseId = safePublicId(req.params.releaseId, 'release-')
  const rosterPublicId = safePublicId(req.body?.rosterSnapshotPublicId, 'roster-')
  const studentKey = clean(req.body?.studentKey)
  const ordinal = Number(req.body?.ordinal)
  const teacherPublicId = req.body?.teacherBindingPublicId ? safePublicId(req.body.teacherBindingPublicId,'teacher-binding-') : null
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!releaseId || !rosterPublicId) return res.status(400).json({success:false,message:'Valid release and roster snapshot ids are required.'})
  if (!studentKey && (!Number.isInteger(ordinal) || ordinal < 1)) return res.status(400).json({success:false,message:'studentKey or ordinal is required.'})
  try {
    const projection = await withTenantTransaction(schoolId, async (client, tenantId) => {
      const release = await client.query('SELECT snapshot_json FROM assessment_releases WHERE school_id=$1 AND release_id=$2',[tenantId,releaseId])
      if (!release.rowCount) { const e=new Error('Assessment release not found'); e.code='ASSESSMENT_RELEASE_NOT_FOUND'; throw e }
      const roster = await client.query('SELECT id FROM roster_snapshots WHERE school_id=$1 AND public_id=$2',[tenantId,rosterPublicId])
      if (!roster.rowCount) { const e=new Error('Roster snapshot not found'); e.code='ROSTER_SNAPSHOT_NOT_FOUND'; throw e }
      const member = studentKey
        ? await client.query('SELECT display_name,roll_number,class_name,section FROM roster_snapshot_members WHERE school_id=$1 AND roster_snapshot_id=$2 AND student_key=$3',[tenantId,roster.rows[0].id,studentKey])
        : await client.query('SELECT display_name,roll_number,class_name,section FROM roster_snapshot_members WHERE school_id=$1 AND roster_snapshot_id=$2 AND ordinal=$3',[tenantId,roster.rows[0].id,ordinal])
      if (!member.rowCount) { const e=new Error('Roster member not found'); e.code='ROSTER_MEMBER_NOT_FOUND'; throw e }
      let teacher = null
      if (teacherPublicId) {
        const binding = await client.query('SELECT teacher_name,subject FROM teacher_binding_snapshots WHERE school_id=$1 AND public_id=$2',[tenantId,teacherPublicId])
        if (!binding.rowCount) { const e=new Error('Teacher binding snapshot not found'); e.code='TEACHER_BINDING_SNAPSHOT_NOT_FOUND'; throw e }
        teacher={displayName:binding.rows[0].teacher_name,subject:binding.rows[0].subject}
      }
      return buildStudentSafeProjection(release.rows[0].snapshot_json,{
        student:{
          displayName:member.rows[0].display_name,
          rollNumber:member.rows[0].roll_number,
          className:member.rows[0].class_name,
          section:member.rows[0].section,
        },
        teacher,
      })
    })
    return res.json({success:true,data:projection})
  } catch (error) {
    return sendPrintError(res,error,'Could not build student-safe projection.')
  }
})

router.get('/releases/:releaseId/answer-key', async (req, res) => {
  const schoolId = schoolIdForRequest(req)
  const releaseId = safePublicId(req.params.releaseId, 'release-')
  if (!schoolId) return res.status(400).json({success:false,message:'School context required.'})
  if (!releaseId) return res.status(400).json({success:false,message:'Invalid release id.'})
  try {
    const projection = await withTenantTransaction(schoolId, async (client, tenantId) => {
      const release = await client.query('SELECT snapshot_json FROM assessment_releases WHERE school_id=$1 AND release_id=$2',[tenantId,releaseId])
      if (!release.rowCount) { const e=new Error('Assessment release not found'); e.code='ASSESSMENT_RELEASE_NOT_FOUND'; throw e }
      return buildStaffAnswerKeyProjection(release.rows[0].snapshot_json,{role:req.user?.role})
    })
    return res.json({success:true,data:projection})
  } catch (error) {
    return sendPrintError(res,error,'Could not build answer-key projection.')
  }
})

module.exports = router

