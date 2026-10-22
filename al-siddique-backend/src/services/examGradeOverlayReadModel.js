'use strict'
// Revision overlays for immutable First Term source rows; no data mutation.
const GRADE_HISTORY=`(SELECT g.new_grade FROM exam_grade_revision_history g
  WHERE g.school_id=er.school_id AND g.exam_result_id=er.id
  ORDER BY g.id DESC LIMIT 1) AS revision_grade`
const MARK_HISTORY=`(SELECT h.new_marks FROM exam_marks_revision_history h
  WHERE h.school_id=er.school_id AND h.exam_result_id=er.id
  ORDER BY h.id DESC LIMIT 1) AS revision_marks,
 (SELECT h.new_grade FROM exam_marks_revision_history h
  WHERE h.school_id=er.school_id AND h.exam_result_id=er.id
  ORDER BY h.id DESC LIMIT 1) AS revision_mark_grade`
function gradeProjection(exists){
 return exists===true?GRADE_HISTORY:'NULL::text AS revision_grade'
}
function marksProjection(exists){
 return exists===true?MARK_HISTORY:
  'NULL::numeric AS revision_marks, NULL::text AS revision_mark_grade'
}
function effectiveGradeRows(rows){
 if(!Array.isArray(rows))return []
 return rows.map(row=>{
  if(row.revision_grade!=null && row.revision_marks!=null)
   throw Error('CONFLICTING_CROSS_LEDGER_ACADEMIC_CORRECTIONS')
  const originalGrade=row.grade,originalMarks=row.marks_obtained
  const grade=row.revision_grade??row.revision_mark_grade??originalGrade
  const marks=row.revision_marks??originalMarks
  return {...row,recorded_grade:originalGrade,recorded_marks:originalMarks,
   effective_grade:grade,effective_marks:marks,grade,marks_obtained:marks}
 })
}
module.exports={gradeProjection,marksProjection,effectiveGradeRows}
