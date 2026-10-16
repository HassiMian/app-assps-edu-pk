'use strict'
const {SCHOOL_ID,SOURCE_SHAS,studentGroupKey}=require('./approvedSchoolTimetable')
const REQUIRED_PERIODS=new Set(Array.from({length:8},(_,i)=>'Period '+(i+1)))
function publicationAssessment({schoolId,roster,entries,session='2026–27'}){
 if(schoolId!==SCHOOL_ID) return {decision:'DENY',reason:'TENANT_POLICY_NOT_CONFIGURED'}
 if(!Array.isArray(roster)||!Array.isArray(entries))throw Error('INVALID_TIMETABLE_ASSESSMENT_DATA')
 const groups=new Map()
 for(const r of roster){
  if(!Number.isFinite(Number(r.n))||Number(r.n)<0)throw Error('INVALID_ACTIVE_ROSTER_COUNT')
  const key=studentGroupKey(r.class,r.section)
  const prev=groups.get(key)||{key,class:r.class,section:r.section||'',students:0,parentsLinked:0}
  prev.students+=Number(r.n)
  prev.parentsLinked+=Number(r.parent_linked||0)
  if(prev.parentsLinked>prev.students)throw Error('PARENT_LINK_COUNT_INVALID')
  groups.set(key,prev)
 }
 const byGroup=new Map()
 for(const e of entries){
  const key=studentGroupKey(e.class_name,e.section)
  if(!byGroup.has(key))byGroup.set(key,[])
  byGroup.get(key).push(e)
 }
 let covered=0,partial=0,linked=0,missingTeacherLoginIds=0
 const summary=[]
 for(const g of groups.values()){
  const rows=byGroup.get(g.key)||[]
  const periodLabels=new Set(rows.map(x=>x.period_label))
  const valid=rows.length===8 && periodLabels.size===8 &&
   [...periodLabels].every(x=>REQUIRED_PERIODS.has(x)) &&
   rows.every(x=>x.subject&&x.teacher_display_name&&SOURCE_SHAS.includes(String(x.source_sha256||'').trim())&&x.academic_session===session)
  const nullIds=rows.filter(x=>x.teacher_id==null).length
  missingTeacherLoginIds+=nullIds
  covered+=valid?g.students:0
  partial+=valid?0:g.students
  linked+=g.parentsLinked
  summary.push({
   class:g.class,section:g.section,active_students:g.students,linked_parent_students:g.parentsLinked,
   approved_subject_periods:valid?8:0,missing_teacher_login_ids:nullIds,
   delivery_status:valid?'VERIFIED_SUBJECTS_AND_TIMES':'APPROVED_TIMES_INCHARGE_ONLY_SUBJECTS_PENDING'
  })
 }
 const unknownImports=[...byGroup.keys()].filter(x=>!groups.has(x))
 const total=[...groups.values()].reduce((a,x)=>a+x.students,0)
 const totalNullIds=entries.filter(x=>x.teacher_id==null).length
 const fullReady=total>0&&covered===total&&linked===total&&totalNullIds===0&&unknownImports.length===0
 return {
  version:'ASSPS-COVERAGE-GATE-2026-10-16-V1',
  school_id:SCHOOL_ID,
  decision:fullReady?'FULL_RELEASE_READY':'HOLD_FULL_RELEASE',
  limited_readonly_possible:covered>0&&summary.every(x=>x.approved_subject_periods===0||x.approved_subject_periods===8),
  total_active_students:total,fully_verified_subject_timetable_students:covered,
  students_subject_timetable_pending:partial,students_parent_linked:linked,
  unlinked_parent_students:total-linked,unlinked_teacher_periods:totalNullIds,
  unmatched_imported_groups:unknownImports,groups:summary,
  reasons:[
   ...(partial?['UNVERIFIED_SUBJECT_PERIODS_FOR_'+partial+'_STUDENTS']:[]),
   ...(total-linked?['PARENT_LINKS_MISSING_'+(total-linked)]:[]),
   ...(totalNullIds?['TEACHER_IDENTITY_LINKS_MISSING_'+totalNullIds]:[]),
   ...(unknownImports.length?['UNMATCHED_IMPORTED_CLASS_GROUPS']:[])
  ]
 }
}
module.exports={publicationAssessment}
