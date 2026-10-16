'use strict'
const express=require('express')
const router=express.Router()
const {query}=require('../config/database')
const {protect,requireScopeForServiceOnly}=require('../middleware/auth')
const {SCHOOL_ID:ASSPS_SCHOOL_ID,SOURCE_SHAS,VERSION:APPROVED_TIMETABLE_VERSION,rowsForDay}=require('../services/approvedSchoolTimetable')
const {publicationAssessment}=require('../services/timetablePublicationGate')
const [BASE_SHA,NINE_SHA]=SOURCE_SHAS
const ASSPS_REQUIRED_GROUPS=new Map([
 ['Four|Blue',8],['Five|Blue',8],['Six|Blue',8],['Seven|Blue',8],
 ['Pre-Nine|',8],['Nine|Usman',8],['Nine|Fatima',8],['School-wide|',2]
])
function signedSchool(req,res){
 const school=Number(req.school_id)
 if(!Number.isSafeInteger(school)||school<=0||!['admin','principal','teacher','super_admin'].includes(String(req.user?.role||''))){
  res.status(403).json({success:false,code:'TIMETABLE_SCHOOL_ROLE_REQUIRED'})
  return 0
 }
 return school
}
router.get('/reference',protect,requireScopeForServiceOnly('school.timetable.read'),async(req,res)=>{
 const school=signedSchool(req,res)
 if(!school)return
 try{
  const {rows}=await query(`SELECT class_name,section,period_label,subject,teacher_display_name,teacher_id,
   TO_CHAR(start_time,'HH24:MI') AS start_time,TO_CHAR(end_time,'HH24:MI') AS end_time,
   academic_session,source_sha256,staff_identity_reviewed
   FROM public.timetable
   WHERE school_id=$1 AND day_name='Regular' AND academic_session='2026–27'
    AND source_sha256 IN ($2,$3)
   ORDER BY CASE WHEN class_name='School-wide' THEN 0 ELSE 1 END,
    CASE class_name WHEN 'Four' THEN 1 WHEN 'Five' THEN 2 WHEN 'Six' THEN 3
      WHEN 'Seven' THEN 4 WHEN 'Pre-Nine' THEN 5 WHEN 'Nine' THEN 6 ELSE 7 END,
    section,start_time,period_label`,[school,BASE_SHA,NINE_SHA])
  const isGrade9Loaded=rows.length===58
  if(school===ASSPS_SCHOOL_ID){
   const counter=new Map()
   for(const row of rows){
    const key=String(row.class_name||'').trim()+'|'+String(row.section||'').trim()
    counter.set(key,(counter.get(key)||0)+1)
   }
   // Exact live school group + section, not a class-only key. The original
   // check used Four| even though all real Four records have section Blue.
   // It incorrectly held a fully valid 58-row import with HTTP 503.
   const verifiedGroups=rows.length===58 && counter.size===ASSPS_REQUIRED_GROUPS.size &&
    [...ASSPS_REQUIRED_GROUPS].every(([key,count])=>counter.get(key)===count)
   const safeRows=rows.every(x=>!x.staff_identity_reviewed)
   if(!verifiedGroups||!safeRows)
    return res.status(503).json({success:false,code:'TIMETABLE_IMPORT_INTEGRITY_HOLD'})
  }
  // Aggregate timetable completeness only for school administrators. A scoped
  // teacher can still view the imported reference, but never receives full
  // student-roster counts or staff identity reconciliation metadata.
  let coverage=null
  if(school===ASSPS_SCHOOL_ID && ['admin','principal','super_admin'].includes(String(req.user?.role||''))){
   try{
    const roster=await query(`SELECT class,section,COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE parent_user_id IS NOT NULL)::int AS parent_linked
      FROM public.students WHERE school_id=$1 AND is_active=true
      GROUP BY class,section ORDER BY class,section`,[school])
    coverage=publicationAssessment({schoolId:school,roster:roster.rows,
      entries:rows.filter(r=>r.class_name!=='School-wide')})
   }catch(coverageError){
    console.error('Timetable school coverage unavailable',coverageError.code||'QUERY_FAILURE')
    coverage={decision:'UNVERIFIED',reason:'COVERAGE_READ_UNAVAILABLE'}
   }
  }
  const safeRows=rows.map(({teacher_id,...safe})=>safe)
  return res.json({success:true,session:'2026–27',pattern:'Regular',
    sourceTeacherAccountsApproved:false,
    fridayScheduleIncluded:false,
    grade9SectionsLoaded:isGrade9Loaded,
    approvedTimingVersion:school===ASSPS_SCHOOL_ID?APPROVED_TIMETABLE_VERSION:null,
    approvedBellTimings:school===ASSPS_SCHOOL_ID?{regular:rowsForDay('Monday'),friday:rowsForDay('Friday')}:null,
    timingNotice:'Stored imported timestamps are superseded by approvedBellTimings; original imported records remain unchanged.',
    coverage,
    data:safeRows})
 }catch(e){
  console.error('Timetable reference',e.code||'QUERY_FAILURE')
  return res.status(503).json({success:false,code:'TIMETABLE_REFERENCE_UNAVAILABLE'})
 }
})
router.get('/staff-subjects',protect,requireScopeForServiceOnly('school.timetable.read'),async(req,res)=>{
 const school=signedSchool(req,res)
 if(!school)return
 if(!['admin','principal','super_admin'].includes(String(req.user?.role)))
  return res.status(403).json({success:false,code:'STAFF_DIRECTORY_ADMIN_ONLY'})
 try{
  const {rows}=await query(`SELECT x.teacher_label,x.employee_id,
    e.name AS official_employee_name,e.is_active AS employee_active,
    x.class_name,x.section,x.period_label,x.canonical_subject,
    x.teaching_department,x.identity_status,x.authorization_status
    FROM public.employee_teaching_subject_evidence x
    LEFT JOIN public.employees e ON e.id=x.employee_id AND e.school_id=x.school_id
    WHERE x.school_id=$1 ORDER BY x.teacher_label,x.class_name,x.section,x.period_label`,[school])
  if(school===1 && (rows.length!==56||rows.some(r=>r.authorization_status!=='schedule_reference_only')))
   return res.status(503).json({success:false,code:'STAFF_REFERENCE_INCOMPLETE'})
  return res.json({success:true,authorizationIssued:false,records:rows,
    note:'Subjects are observed in the regular timetable, NOT certified teacher qualifications or marks-entry permissions.'})
 }catch(e){
  console.error('Timetable staff reference',e.code||'QUERY_FAILURE')
  return res.status(503).json({success:false,code:'STAFF_REFERENCE_UNAVAILABLE'})
 }
})
module.exports=router
