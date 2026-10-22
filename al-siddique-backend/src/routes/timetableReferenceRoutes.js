'use strict'
const express=require('express')
const router=express.Router()
const {query}=require('../config/database')
const {protect,requireScopeForServiceOnly}=require('../middleware/auth')
const BASE_SHA='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589'
const NINE_SHA='e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724'
const classes=['Four','Five','Six','Seven','Pre-Nine']
function signedSchool(req,res){
 const school=Number(req.school_id)
 if(!Number.isSafeInteger(school)||school<=0||!['admin','principal','teacher','super_admin','owner'].includes(String(req.user?.role||''))){
  res.status(403).json({success:false,code:'TIMETABLE_SCHOOL_ROLE_REQUIRED'})
  return 0
 }
 return school
}
router.get('/reference',protect,requireScopeForServiceOnly('school.timetable.read'),async(req,res)=>{
 const school=signedSchool(req,res)
 if(!school)return
 try{
  const {rows}=await query(`SELECT class_name,section,period_label,subject,teacher_display_name,
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
  if(school===1){
   const counter=new Map()
   for(const row of rows)counter.set(row.class_name+'|'+row.section,(counter.get(row.class_name+'|'+row.section)||0)+1)
   const expected=classes.every(c=>counter.get(c+'|')===8)&&counter.get('School-wide|')===2
   const grade9=!isGrade9Loaded||
    (counter.get('Nine|Usman')===8&&counter.get('Nine|Fatima')===8)
   if(![42,58].includes(rows.length)||!expected||!grade9||
      rows.some(x=>x.staff_identity_reviewed))
    return res.status(503).json({success:false,code:'TIMETABLE_IMPORT_INTEGRITY_HOLD'})
  }
  return res.json({success:true,session:'2026–27',pattern:'Regular',
    sourceTeacherAccountsApproved:false,
    fridayScheduleIncluded:false,
    grade9SectionsLoaded:isGrade9Loaded,
    data:rows})
 }catch(e){
  console.error('Timetable reference',e.code||'QUERY_FAILURE')
  return res.status(503).json({success:false,code:'TIMETABLE_REFERENCE_UNAVAILABLE'})
 }
})
router.get('/staff-subjects',protect,requireScopeForServiceOnly('school.timetable.read'),async(req,res)=>{
 const school=signedSchool(req,res)
 if(!school)return
 if(!['admin','principal','super_admin','owner'].includes(String(req.user?.role)))
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
