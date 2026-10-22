'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const {gradeProjection,marksProjection,effectiveGradeRows}=require('../services/examGradeOverlayReadModel')
test('effective grade layer uses same-school append-only history',()=>{
 const frag=gradeProjection(true)
 assert.match(frag,/school_id=er.school_id AND g.exam_result_id=er.id/)
 assert.match(frag,/ORDER BY g.id DESC LIMIT 1/)
 assert.match(gradeProjection(false),/NULL::text AS revision_grade/)
 assert.match(marksProjection(false),/NULL::numeric AS revision_marks/)
 assert.match(marksProjection(true),/h.school_id=er.school_id AND h.exam_result_id=er.id/)
})
test('effective grade corrected while original grade and numeric zero preserved',()=>{
 const input=[{id:7,grade:'D',marks_obtained:'50.00',revision_grade:'A+'},
 {id:8,grade:'F',marks_obtained:'0.00',revision_grade:null}]
 const rows=effectiveGradeRows(input)
 assert.deepEqual(rows.map(r=>r.grade),['A+','F'])
 assert.deepEqual(rows.map(r=>r.recorded_grade),['D','F'])
 assert.equal(rows[1].marks_obtained,'0.00')
 assert.equal(input[0].grade,'D')
 const converted=effectiveGradeRows([{grade:'F',marks_obtained:'0.00',
  revision_marks:'45.50',revision_mark_grade:'A',revision_grade:null}])[0]
 assert.equal(converted.recorded_marks,'0.00')
 assert.equal(converted.marks_obtained,'45.50')
 assert.equal(converted.grade,'A')
 assert.throws(()=>effectiveGradeRows([{grade:'D',marks_obtained:'50.00',
  revision_grade:'A+',revision_marks:'45.00',revision_mark_grade:'B'}]),
  /CONFLICTING_CROSS_LEDGER/)

})
test('all result-list endpoints use conditional overlay, without updating base records',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../routes/examRoutes.js'),'utf8')
 assert.equal(s.split("const gradeExpr=gradeProjection(Boolean(ledger.rows[0]?.rel))").length-1,3)
 assert.equal(s.split("const marksExpr=marksProjection(Boolean(marksLedger.rows[0]?.rel))").length-1,3)
 assert.equal(s.split("data: effectiveGradeRows(result.rows)").length-1,3)
})
