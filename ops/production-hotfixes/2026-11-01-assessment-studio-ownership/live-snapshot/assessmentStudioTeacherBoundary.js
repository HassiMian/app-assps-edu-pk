'use strict'
// School JWT alone does not authorize cross-teacher draft, release, print-job or answer-key access.
function isTeacher(actor) {
 return String(actor?.role || '').trim().toLowerCase() === 'teacher'
}
function resourceFromPath(path) {
 const segments=String(path||'').split('/').filter(Boolean)
 if(segments[1]){try{segments[1]=decodeURIComponent(segments[1])}catch{return null}}
 if (segments[0]==='papers' && segments[1]) return {table:'assessment_papers',key:'public_id',id:segments[1],type:'paper'}
 if (segments[0]==='print-jobs' && segments[1]) return {table:'assessment_print_jobs',key:'print_job_id',id:segments[1],type:'print-job'}
 return null
}
function teacherOwnerBoundary({query,schoolIdForRequest,actorKey,safePublicId}) {
 return async (req,res,next)=>{
  if(!isTeacher(req.user))return next()
  const resource=resourceFromPath(req.path)
  if(!resource)return next()
  const id=safePublicId(resource.id)
  if(!id)return next()
  const schoolId=schoolIdForRequest(req,req.body||{})
  const userId=Number(req.user?.id)
  if(!schoolId||!Number.isSafeInteger(userId)||userId<1)
   return res.status(403).json({success:false,code:'ASSESSMENT_TEACHER_ACCOUNT_REQUIRED'})
  try{
   const result=await query('SELECT created_by_key FROM '+resource.table+' WHERE school_id=$1 AND '+resource.key+'=$2 LIMIT 1',[schoolId,id])
   const row=result.rows?.[0]
   if(!row){
    return next() // original handler handles missing paper or new first revision
   }
   if(String(row.created_by_key||'')!==actorKey(req))
    return res.status(404).json({success:false,code:'ASSESSMENT_RESOURCE_NOT_FOUND'})
   return next()
  }catch(e){
   console.error('Assessment teacher owner boundary unavailable',e.code||'LOOKUP_FAILED')
   return res.status(503).json({success:false,code:'ASSESSMENT_OWNER_CHECK_UNAVAILABLE'})
  }
 }
}
module.exports={isTeacher,resourceFromPath,teacherOwnerBoundary}
