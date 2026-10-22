'use strict'

// Tenant-authorized teaching cohorts only; no schoolwide teacher discovery.
function buildTeachingOptionsQuery({schoolId,role,teacherId,actorSchoolId}) {
  const sid=Number(schoolId)
  if(!Number.isSafeInteger(sid)||sid<=0) return null
  const r=String(role||'').toLowerCase()
  const sqlBase=`SELECT s.class, s.section
     FROM students s
     WHERE s.school_id=$1 AND (s.is_active=true OR s.is_active IS NULL)`
  if(r==='teacher') {
    const tid=Number(teacherId)
    if(!Number.isSafeInteger(tid)||tid<=0 || Number(actorSchoolId)!==sid) return null
    return {sql:`${sqlBase}
      AND EXISTS (
        SELECT 1 FROM teacher_class_assignments tca
        WHERE tca.school_id=s.school_id AND tca.teacher_user_id=$2
          AND tca.is_active=true
          AND LOWER(BTRIM(tca.class_name))=LOWER(BTRIM(s.class))
          AND BTRIM(COALESCE(tca.section,''))<>''
          AND LOWER(BTRIM(tca.section))=LOWER(BTRIM(COALESCE(s.section,'')))
      ) GROUP BY s.class,s.section ORDER BY s.class::text,s.section::text`,params:[sid,tid]}
  }
  if(r==='owner' && Number(actorSchoolId)!==sid) return null
  if(['principal','admin','super_admin','owner'].includes(r))
    return {sql:`${sqlBase} GROUP BY s.class,s.section ORDER BY s.class::text,s.section::text`,params:[sid]}
  return null
}
module.exports={buildTeachingOptionsQuery}
