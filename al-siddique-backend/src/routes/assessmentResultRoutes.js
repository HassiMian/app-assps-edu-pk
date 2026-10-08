const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { paperRestrictedDatabase } = require('../middleware/paperRestrictedDatabase')
const { currentSchoolId, tenantClause } = require('../middleware/tenant')
const { saveResultRevision } = require('../services/assessmentResults')
const { ensureTeacherAssignmentSchema, teacherCanAccessClass } = require('../services/teacherAssignmentService')

const canEnterResults = requireRoles('super_admin','admin','school_admin','principal','teacher','result_entry')

function safeId(value) {
  const id=String(value||'').trim()
  if(!id || id.length>220 || !/^[A-Za-z0-9._:-]+$/.test(id)) return null
  return id
}
function actorKey(req) { return String(req.user?.id || req.user?.email || 'unknown') }
function schoolIdForRequest(req, body={}) {
  const direct=currentSchoolId(req)
  if(direct) return direct
  if(req.user?.role==='super_admin' || req.user?.role==='platform_owner'){
    const explicit=Number.parseInt(body.schoolId ?? req.query.school_id ?? req.query.schoolId,10)
    return Number.isFinite(explicit)&&explicit>0?explicit:null
  }
  return null
}

async function teacherCanAccessRelease(req, schoolId, releaseId) {
  if (String(req.user?.role || '').toLowerCase() !== 'teacher') return true
  await ensureTeacherAssignmentSchema()
  const release = await query(
    'SELECT snapshot_json FROM assessment_releases WHERE school_id=$1 AND release_id=$2 LIMIT 1',
    [schoolId, releaseId]
  )
  if (!release.rowCount) return null
  const snapshot = release.rows[0]?.snapshot_json || {}
  const meta = snapshot?.metadata || {}
  const className = String(meta.className || meta.classLevel || '').trim()
  const section = String(meta.section || '').trim()
  const subject = String(meta.subject || meta.subjectName || '').trim()
  if (!className) return false
  return teacherCanAccessClass({ schoolId, teacherUserId:req.user?.id, className, section, subject })
}

router.use(protect, canEnterResults)
router.use(paperRestrictedDatabase)

router.post('/', async (req,res)=>{
  try{
    const schoolId=schoolIdForRequest(req,req.body||{})
    const releaseId=safeId(req.body?.releaseId)
    const studentKey=safeId(req.body?.studentKey)
    const resultId=req.body?.resultId?safeId(req.body.resultId):null
    if(!schoolId) return res.status(400).json({success:false,message:'School context required.'})
    if(!releaseId || !studentKey) return res.status(400).json({success:false,message:'Valid releaseId and studentKey required.'})
    const teacherScope=await teacherCanAccessRelease(req,schoolId,releaseId)
    if(teacherScope===null) return res.status(404).json({success:false,message:'Assessment release not found.'})
    if(teacherScope===false) return res.status(403).json({success:false,message:'Teacher is not assigned to this assessment class and subject.'})
    const data=await saveResultRevision({
      schoolId,releaseId,studentKey,studentSnapshot:req.body?.studentSnapshot||{},resultId,
      expectedRevision:Number(req.body?.expectedRevision||0),
      entries:Array.isArray(req.body?.entries)?req.body.entries:[],
      reason:req.body?.reason||null,status:String(req.body?.status||'IN_PROGRESS').toUpperCase(),actorKey:actorKey(req),
    })
    return res.status(data.currentRevision===1?201:200).json({success:true,data})
  }catch(error){
    if(error?.code==='ASSESSMENT_RELEASE_NOT_FOUND') return res.status(404).json({success:false,message:'Assessment release not found.'})
    if(error?.code==='RESULT_REVISION_CONFLICT') return res.status(409).json({success:false,message:'Result revision conflict.',currentRevision:error.currentRevision})
    if(['RESULT_VALIDATION_FAILED','RESULT_INVALID','RESULT_IDENTITY_MISMATCH'].includes(error?.code)) return res.status(400).json({success:false,message:error.message,details:error.details||null})
    if(Number(error?.status)>=400 && Number(error?.status)<600) return res.status(Number(error.status)).json({success:false,message:error.message})
    console.error('Assessment Results save error:',error.message)
    return res.status(500).json({success:false,message:'Could not save assessment result revision.'})
  }
})

router.get('/:resultId', async (req,res)=>{
  try{
    const schoolId=schoolIdForRequest(req)
    const resultId=safeId(req.params.resultId)
    if(!schoolId) return res.status(400).json({success:false,message:'School context required.'})
    if(!resultId) return res.status(400).json({success:false,message:'Invalid result id.'})
    await tenantClause(req,{table:'assessment_result_records'})
    const result=await query(
      `SELECT r.result_id,r.release_id,r.student_key,r.student_snapshot,r.status,r.current_revision,r.created_at,r.updated_at,
              v.entries_json,v.obtained_marks,v.maximum_marks,v.revision_reason,v.created_at AS revision_created_at
         FROM assessment_result_records r
         LEFT JOIN assessment_result_revisions v
           ON v.school_id=r.school_id AND v.result_record_id=r.id AND v.revision_number=r.current_revision
        WHERE r.school_id=$1 AND r.result_id=$2
        LIMIT 1`,
      [schoolId,resultId]
    )
    if(!result.rowCount) return res.status(404).json({success:false,message:'Assessment result not found.'})
    const teacherScope=await teacherCanAccessRelease(req,schoolId,result.rows[0].release_id)
    if(teacherScope===null) return res.status(404).json({success:false,message:'Assessment result not found.'})
    if(teacherScope===false) return res.status(403).json({success:false,message:'Teacher is not assigned to this assessment class and subject.'})
    return res.json({success:true,data:result.rows[0]})
  }catch(error){
    if(Number(error?.status)>=400 && Number(error?.status)<600) return res.status(Number(error.status)).json({success:false,message:error.message})
    console.error('Assessment Results read error:',error.message)
    return res.status(500).json({success:false,message:'Could not read assessment result.'})
  }
})

module.exports=router
