'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {RevisionError,parseRequest,deriveGrade,reviseExamScore}=require('../services/examOfficialMarksRevision')
const valid={expected_marks:0,expected_total_marks:75,expected_grade:'F',proposed_marks:55.5,reason:'Paper checked against master answer key.'}
const bands=[{label:'A',min_percentage:80,max_percentage:100},{label:'F',min_percentage:0,max_percentage:79}]
function mock({school=1,result=true,revisionTable=true,failAudit=false,oldMarks='0',oldGrade='F',status='SCORED'}={}){
 const queries=[],client={query:async(sql,values)=>{
  queries.push({sql:String(sql),values})
  if(/SELECT er.id/.test(sql)){
   return result?{rowCount:1,rows:[{id:12,school_id:school,exam_id:9,student_id:104,subject:'English',
    marks_obtained:oldMarks,total_marks:75,grade:oldGrade,result_status:status,
    revision_schema:revisionTable?'exam_marks_revision_history':null}]}:{rowCount:0,rows:[]}
  }
  if(/SELECT label,min_percentage/.test(sql))return {rowCount:bands.length,rows:bands}
  if(/UPDATE exam_results/.test(sql))return {rowCount:1,rows:[{id:12,marks_obtained:55.5,grade:'F'}]}
  if(/INSERT INTO exam_marks_revision_history/.test(sql)){
   if(failAudit)throw Error('audit insert fails')
   return {rowCount:1,rows:[{id:99,created_at:'2026-10-15T15:00:00Z'}]}
  }
  return {rowCount:0,rows:[]}
 },release:()=>{queries.push({sql:'RELEASE'})}}
 return {queries,pool:{connect:async()=>client}}
}
function execute(m,args={}){return reviseExamScore({pool:m.pool,applyTenantContext:async()=>m.queries.push({sql:'TENANT_CONTEXT'}),
 actor:{id:4,role:'principal'},schoolId:1,resultId:12,body:valid,...args})}
test('numeric zero remains legitimate recorded score and never blank',()=>{
 assert.equal(parseRequest(valid).old,0)
 assert.equal(parseRequest({...valid,proposed_marks:0.29}).proposed,0.29)
})
test('blank, forged, out-of-range, no change and missing reason rejected',()=>{
 for(const payload of [{...valid,proposed_marks:''},{...valid,proposed_marks:'-1'},
  {...valid,proposed_marks:76},{...valid,proposed_marks:0},
  {...valid,proposed_marks:13.007},{...valid,reason:'short'}]){
  assert.throws(()=>parseRequest(payload),RevisionError)
 }
})
test('school grading policy produces exact grade and refuses incomplete setup',()=>{
 assert.equal(deriveGrade(60,75,bands),'A')
 assert.throws(()=>deriveGrade(80,100,[]),/SCHOOL_GRADE_SETUP_REQUIRED/)
})
test('signed principal audits exactly one revision then commits',async()=>{
 const m=mock();const result=await execute(m)
 assert.equal(result.marks_obtained,55.5)
 assert.equal(result.revision_id,99)
 assert.equal(m.queries.filter(x=>/UPDATE exam_results/.test(x.sql)).length,1)
 assert.equal(m.queries.filter(x=>/INSERT INTO exam_marks_revision_history/.test(x.sql)).length,1)
 assert.equal(m.queries.filter(x=>x.sql==='COMMIT').length,1)
 assert.equal(m.queries.filter(x=>x.sql==='TENANT_CONTEXT').length,1)
})
test('teacher cannot reach database or create revision',async()=>{
 const m=mock()
 await assert.rejects(()=>execute(m,{actor:{id:9,role:'teacher'}}),e=>e.status===403)
 assert.equal(m.queries.length,0)
})
test('missing principal signed school context denies before connection',async()=>{
 const m=mock()
 await assert.rejects(()=>execute(m,{schoolId:null}),e=>e.status===403)
 assert.equal(m.queries.length,0)
})
test('foreign-school or missing result denies with transactional rollback',async()=>{
 const m=mock({result:false})
 await assert.rejects(()=>execute(m),e=>e.status===404)
 assert.equal(m.queries.filter(x=>x.sql==='ROLLBACK').length,1)
 assert.equal(m.queries.filter(x=>x.sql==='COMMIT').length,0)
})
test('existing marks snapshot conflict cannot overwrite live values',async()=>{
 const m=mock({oldMarks:'20'})
 await assert.rejects(()=>execute(m),e=>e.status===409)
 assert.equal(m.queries.filter(x=>/UPDATE exam_results/.test(x.sql)).length,0)
})
test('absent, pending and excused records reject scored-mark revisions',async()=>{
 for(const status of ['ABSENT','PENDING','EXCUSED']){
  const m=mock({status})
  await assert.rejects(()=>execute(m),e=>e.code==='ONLY_NUMERIC_SCORES_CAN_BE_REVISED')
  assert.equal(m.queries.some(x=>/UPDATE exam_results/.test(x.sql)),false)
 }
})
test('missing append-only audit schema denies all mutation',async()=>{
 const m=mock({revisionTable:false})
 await assert.rejects(()=>execute(m),e=>e.code==='REVISION_LEDGER_NOT_CERTIFIED')
 assert.equal(m.queries.some(x=>/UPDATE exam_results/.test(x.sql)),false)
})
test('audit write fails -> same transaction rolls back score update',async()=>{
 const m=mock({failAudit:true})
 await assert.rejects(()=>execute(m),/audit insert fails/)
 assert.equal(m.queries.filter(x=>x.sql==='ROLLBACK').length,1)
 assert.equal(m.queries.filter(x=>x.sql==='COMMIT').length,0)
})
