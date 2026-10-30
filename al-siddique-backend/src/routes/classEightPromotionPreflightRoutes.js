'use strict'
/* Read-only, signed school-scoped Class Eight -> Pre-Nine promotion preflight.
   Recording print completion or moving student records is intentionally absent. */
const express=require('express')
const router=express.Router()
const {query}=require('../config/database')
const {protect,requireScopeForServiceOnly}=require('../middleware/auth')
router.get('/eight-to-pre-nine/preflight',protect,requireScopeForServiceOnly('school.promotion.read'),async(req,res)=>{
 const school=Number(req.school_id)
 if(!Number.isSafeInteger(school)||school<=0||
   !['admin','principal','super_admin','owner'].includes(String(req.user?.role||'')))
  return res.status(403).json({success:false,code:'PROMOTION_ADMIN_ONLY'})
 try{
  const policy=await query(`SELECT id,exam_id,source_class,source_section,destination_class,
    destination_section,academic_session,exam_purpose_for_source_class,
    historical_exam_name,passing_percentage,baseline_student_count,expected_subject_count,
    status,print_verified_at,academic_approved_at,executed_at,result_snapshot_sha256
    FROM public.school_class_promotion_plans
    WHERE school_id=$1 AND exam_id=9 AND source_class='Eight'
      AND source_section='Blue' AND destination_class IN ('Pre-Nine','Pre Nine')`,[school])
  if(policy.rows.length!==1)
    return res.status(404).json({success:false,code:'SCHOOL_PROMOTION_POLICY_NOT_FOUND'})
  const p=policy.rows[0]
  const students=await query(`SELECT count(*)::int AS n
     FROM public.students WHERE school_id=$1 AND class=$2 AND section=$3 AND is_active=true`,
    [school,p.source_class,p.source_section])
  const total=Number(students.rows[0].n)
  const offerings=await query(`SELECT es.subject,
   COUNT(DISTINCT CASE WHEN r.marks_obtained IS NOT NULL AND r.total_marks>0
      THEN r.student_id END)::int AS entered,
   COUNT(DISTINCT CASE WHEN r.marks_obtained*100 < r.total_marks*$5
     THEN r.student_id END)::int AS below_passing,
   COUNT(DISTINCT CASE WHEN r.total_marks<=0 OR r.marks_obtained<0 OR
     r.marks_obtained>r.total_marks THEN r.student_id END)::int AS invalid,
   (MAX(CASE WHEN es.total_marks IS NOT NULL AND es.approval_status='approved'
     THEN 1 ELSE 0 END)=1) AS official_maximum_approved
   FROM public.exam_subjects es
   LEFT JOIN public.students s ON s.school_id=es.school_id
     AND s.class=es.class_name AND s.section=es.section AND s.is_active=true
   LEFT JOIN public.exam_results r ON r.school_id=es.school_id
     AND r.exam_id=es.exam_id AND r.student_id=s.id
     AND LOWER(BTRIM(r.subject))=LOWER(BTRIM(es.subject))
   WHERE es.school_id=$1 AND es.exam_id=$2 AND es.class_name=$3
      AND es.section=$4 AND es.is_active=true
   GROUP BY es.id,es.subject ORDER BY es.subject`,
    [school,p.exam_id,p.source_class,p.source_section,p.passing_percentage])
  // Frozen original class membership survives the later update to students.class.
  // No names, scores or roster IDs are returned through this endpoint.
  const frozen=await query(`SELECT
    COUNT(DISTINCT snap.student_id)::int AS captured,
    COUNT(DISTINCT CASE WHEN s.school_id=$1 AND s.class=$3 AND s.section=$4
      AND s.is_active THEN snap.student_id END)::int AS still_source,
    COUNT(DISTINCT r.id)::int AS historical_score_rows
    FROM public.school_class_promotion_source_roster snap
    JOIN public.students s ON s.id=snap.student_id
    LEFT JOIN public.exam_results r ON r.school_id=snap.school_id
      AND r.student_id=snap.student_id AND r.exam_id=$5
    WHERE snap.school_id=$1 AND snap.plan_id=$2`,
    [school,p.id,p.source_class,p.source_section,p.exam_id])
  const snapshot=frozen.rows[0]
  const captured=Number(snapshot?.captured||0)
  const stillSource=Number(snapshot?.still_source||0)
  const historicalScoreRows=Number(snapshot?.historical_score_rows||0)
  const originalCohortPreserved=captured===Number(p.baseline_student_count)
    && stillSource===captured
  const subjects=offerings.rows.map(x=>({
    subject:x.subject,entered:Number(x.entered),missing:Math.max(total-Number(x.entered),0),
    belowPassing:Number(x.below_passing),invalid:Number(x.invalid),
    officialMaximumApproved:x.official_maximum_approved===true
  }))
  const noMatch=subjects.length!==Number(p.expected_subject_count)
  const missing=subjects.filter(x=>x.missing>0).map(x=>x.subject)
  const bad=subjects.some(x=>x.invalid>0)
  const unapprovedMaxima=subjects.filter(x=>!x.officialMaximumApproved).map(x=>x.subject)
  const printed=Boolean(p.print_verified_at)&&Boolean(p.result_snapshot_sha256)
  const schoolApproved=Boolean(p.academic_approved_at)
  const sameRoster=total===Number(p.baseline_student_count)
  const targetIsCanonical=p.destination_class==='Pre Nine'&&p.destination_section==='Blue'
  const canPromote=!noMatch&&missing.length===0&&!bad&&unapprovedMaxima.length===0&&
    printed&&schoolApproved&&sameRoster&&originalCohortPreserved&&targetIsCanonical&&
    p.status==='READY_FOR_APPROVED_PROMOTION'
  return res.json({success:true,
   plan:{id:p.id,schoolId:school,sourceExamId:p.exam_id,
     originalExamName:p.historical_exam_name,
     classEightAssessmentUse:'FINAL_TERM_EQUIVALENT_FOR_PROMOTION_ONLY',
     sourceClass:p.source_class,sourceSection:p.source_section,
     targetClass:p.destination_class,targetSection:p.destination_section,
     promotionStatus:p.status,passingPercentage:Number(p.passing_percentage),
     enrolledStudents:total,rosterAtPlanning:Number(p.baseline_student_count),
     frozenOriginalCohortCount:captured,historicalLinkedScoreCount:historicalScoreRows,
     originalCohortPreserved,
     officialSubjectCount:subjects.length,expectedSubjectCount:Number(p.expected_subject_count),
     printedResultCardsVerified:printed,principalAcademicApproval:schoolApproved,
     completedPromotion:Boolean(p.executed_at),canPromoteNow:canPromote},
   subjectProgress:subjects,missingSubjects:missing,
   maximaPending:unapprovedMaxima,rosterChanged:!sameRoster,
   releaseHoldReasons:[
     ...(noMatch?['SUBJECT_OFFERINGS_CHANGED']:[]),
     ...(!originalCohortPreserved?['HISTORICAL_CLASS_EIGHT_ROSTER_NOT_VERIFIED']:[]),
     ...(missing.length?['SCHEDULED_MARKS_INCOMPLETE']:[]),
     ...(bad?['INVALID_SAVED_MARKS']:[]),
     ...(unapprovedMaxima.length?['PAPER_MAXIMA_NOT_APPROVED']:[]),
     ...(!printed?['RESULT_CARDS_NOT_PRINT_VERIFIED']:[]),
     ...(!schoolApproved?['ACADEMIC_PROMOTION_REVIEW_PENDING']:[]),
     ...(!sameRoster?['CLASS_EIGHT_ROSTER_CHANGED']:[]),
     ...(!p.destination_section?['PRE_NINE_SECTION_NOT_ASSIGNED']:[]),
     ...(!targetIsCanonical?['PRE_NINE_DESTINATION_NOT_CANONICAL']:[])
   ],
   readOnly:true,noStudentClassChanged:true,
   note:'Class Eight First Term exam is final assessment for its promotion only. It is not a Class IX exam. Original class Eight cohort is preserved for historical results, but final marks and printed result-card batch still require their own signed post-examination evidence before transfers.'})
 }catch(err){
  console.error('Grade Eight promotion preflight',err.code||'QUERY_FAILED')
  return res.status(503).json({success:false,code:'PROMOTION_PREFLIGHT_UNAVAILABLE'})
 }
})
module.exports=router
