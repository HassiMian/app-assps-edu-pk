'use strict'
// Read-only, signed school-scoped photographic regular timetable.
const express=require('express')
const router=express.Router()
const {query}=require('../config/database')
const {protect,requireScopeForServiceOnly}=require('../middleware/auth')

router.get('/reference',protect,requireScopeForServiceOnly('school.timetable.read'),async(req,res)=>{
  try{
    const school=Number(req.school_id)
    if(!Number.isSafeInteger(school)||school<=0 ||
       !['admin','principal','teacher','super_admin'].includes(String(req.user?.role||'')))
      return res.status(403).json({success:false,code:'TIMETABLE_SCHOOL_ROLE_REQUIRED'})
    const result=await query(`SELECT class_name,section,period_label,subject,teacher_display_name,
      TO_CHAR(start_time,'HH24:MI') AS start_time,TO_CHAR(end_time,'HH24:MI') AS end_time,
      academic_session,source_sha256,staff_identity_reviewed
      FROM public.timetable
      WHERE school_id=$1 AND day_name='Regular'
      AND academic_session='2026–27'
      AND source_sha256=$2
      ORDER BY CASE WHEN class_name='School-wide' THEN 0 ELSE 1 END,
      CASE class_name WHEN 'Four' THEN 1 WHEN 'Five' THEN 2
       WHEN 'Six' THEN 3 WHEN 'Seven' THEN 4 WHEN 'Pre-Nine' THEN 5 ELSE 0 END,
       start_time,period_label`,
      [school,'263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589'])
    const rows=result.rows||[]
    // Fail closed on partial imports or accidentally linking reference teachers to accounts.
    const counts=new Map()
    for(const row of rows)counts.set(row.class_name,(counts.get(row.class_name)||0)+1)
    if(school===1 && (rows.length!==42 ||
      ['Four','Five','Six','Seven','Pre-Nine'].some(name=>counts.get(name)!==8) ||
      counts.get('School-wide')!==2 ||
      rows.some(row=>row.staff_identity_reviewed)))
      return res.status(503).json({success:false,code:'TIMETABLE_IMPORT_INTEGRITY_HOLD'})
    return res.json({success:true,session:'2026–27',pattern:'Regular',
      provenance:'2026-10-14 user uploaded image, original image printed 2024–2025',
      sourceTeacherAccountsApproved:false,
      fridayScheduleIncluded:false,
      data:rows})
  }catch(err){
    console.error('Regular timetable reference failed',err.code||'QUERY_FAILURE')
    return res.status(503).json({success:false,code:'TIMETABLE_REFERENCE_UNAVAILABLE'})
  }
})
module.exports=router
