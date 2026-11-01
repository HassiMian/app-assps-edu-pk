'use strict'
// Read-only teacher/result policy audit. The authoritative mark is never changed.
const validExamId = v => {
 if (v === undefined || v === null || v === '') return null
 const n = Number(v)
 return Number.isSafeInteger(n) && n>0 ? n : false
}
function parseFilters(query){
 const examId=validExamId(query?.examId)
 if(examId===false) return {error:'EXAM_ID_INVALID'}
 const n=query?.limit===undefined?50:Number(query.limit)
 if(!Number.isSafeInteger(n)||n<1||n>100) return {error:'LIMIT_INVALID'}
 return {examId,limit:n}
}
const expectedGradeSQL=`
 WITH scored AS (
 SELECT r.exam_id,r.student_id,r.subject,r.grade AS stored_grade,r.marks_obtained,r.total_marks,
        s.class AS class_name,s.section AS section_name,
        FLOOR(100.0*r.marks_obtained/NULLIF(r.total_marks,0))::int AS whole_percent
 FROM exam_results r JOIN students s ON s.id=r.student_id AND s.school_id=r.school_id
 WHERE r.school_id=$1 AND r.total_marks>0 AND r.marks_obtained IS NOT NULL
   AND ($2::integer IS NULL OR r.exam_id=$2)
 ),
 checked AS (
 SELECT sc.*,
 (SELECT g.label FROM grade_settings g
  WHERE g.school_id=$1 AND sc.whole_percent BETWEEN g.min_percentage AND g.max_percentage
  ORDER BY g.min_percentage DESC LIMIT 1) expected_grade,
 (SELECT g.label FROM grade_settings g
  WHERE g.school_id=$1 AND FLOOR(sc.marks_obtained)::int BETWEEN g.min_percentage AND g.max_percentage
  ORDER BY g.min_percentage DESC LIMIT 1) grade_if_hypothetical_100_max
 FROM scored sc
 )
 SELECT * FROM checked WHERE stored_grade IS DISTINCT FROM expected_grade
 ORDER BY exam_id,class_name,section_name,student_id,subject
`
function summaryRows(rows) {
 const records=Array.isArray(rows)?rows:[]
 const byExam={}
 const bySubject={}
 for(const r of records){
   const exam=String(r.exam_id)
   const subj=String(r.subject||'')
   byExam[exam]=(byExam[exam]||0)+1
   bySubject[subj]=(bySubject[subj]||0)+1
 }
 return {discrepancies:records.length,byExam,bySubject}
}
// Investigative fingerprint only. Never a finding of signed academic intent.
function mismatchHint(row){
 if(!row||row.stored_grade===row.expected_grade)return 'NO_MISMATCH'
 if(Number(row.total_marks)<100 && String(row.stored_grade||'')===String(row.grade_if_hypothetical_100_max||'')){
  return 'POSSIBLE_FIXED_100_MARK_DENOMINATOR'
 }
 if(String(row.stored_grade)==='E' && String(row.expected_grade)==='D')return 'LEGACY_GRADE_E_LABEL'
 return 'OTHER_REQUIRES_REVIEW'
}
function summarizeMismatchHints(rows){
 const result={possibleFixed100Denominator:0,legacyGradeE:0,other:0}
 for(const r of Array.isArray(rows)?rows:[]){
  const h=mismatchHint(r)
  if(h==='POSSIBLE_FIXED_100_MARK_DENOMINATOR')result.possibleFixed100Denominator++
  else if(h==='LEGACY_GRADE_E_LABEL')result.legacyGradeE++
  else if(h!=='NO_MISMATCH')result.other++
 }
 return result
}
module.exports={parseFilters,expectedGradeSQL,summaryRows,mismatchHint,summarizeMismatchHints}
