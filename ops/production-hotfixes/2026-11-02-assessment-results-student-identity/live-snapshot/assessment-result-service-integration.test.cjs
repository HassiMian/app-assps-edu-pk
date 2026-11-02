'use strict'
const fs=require('fs'),vm=require('vm'),crypto=require('crypto')
const test=require('node:test'),assert=require('node:assert/strict')
const d=__dirname
const source=fs.readFileSync(d+'/assessmentResults.js','utf8')
const identity=require(d+'/assessmentResultStudentIdentity.js')
const snapshot={metadata:{className:'Pre Nine',section:'Blue',subject:'Biology'},sections:[{id:'q1',authoritativeSectionTotal:10}],scoringPlan:{maximumObtainableMarks:10}}
function sandbox({releaseSnapshot=snapshot,rows=[{id:231,school_id:1,name:'Student synthetic',class:'Pre-Nine',section:'Blue',roll_number:'12',is_active:true}]}={}){
 const statements=[],record={id:991,current_revision:0,student_key:'231',release_id:'assess-1',student_snapshot:{}}
 const client={query:async(sql,args=[])=>{
  statements.push({sql,args})
  if(sql.includes('FROM assessment_releases'))return {rows:[{release_id:'assess-1',snapshot_json:releaseSnapshot}],rowCount:1}
  if(sql.includes('FROM students WHERE'))return {rows,rowCount:rows.length}
  if(sql.includes('FROM assessment_result_records'))return {rows:[],rowCount:0}
  if(sql.includes('INSERT INTO assessment_result_records'))return {rows:[{...record,student_key:args[3],student_snapshot:JSON.parse(args[4])}],rowCount:1}
  return {rows:[],rowCount:1}
 },release:()=>{statements.push({sql:'RELEASE'})}}
 const mod={exports:{}}
 vm.runInNewContext(source,{require:(id)=>{
  if(id==='crypto')return crypto
  if(id==='../config/database')return {pool:{connect:async()=>client}}
  if(id==='./assessmentResultStudentIdentity')return identity
  throw new Error('unexpected module '+id)
 },module:mod,exports:mod.exports,Error,Number,String,Array,Map,Set,Object,Math,JSON,Buffer,console})
 return {svc:mod.exports,statements}
}
function input(overrides={}){return {
 schoolId:1,releaseId:'assess-1',studentKey:'231',expectedRevision:0,
 entries:[{questionInstanceId:'q1',state:'SCORED',score:0}],
 reason:'Authentic correction',status:'IN_PROGRESS',actorKey:'123',
 studentSnapshot:{studentId:231,className:'Pre Nine',section:'Blue'},
 ...overrides
}}
test('real verified student becomes server-owned persisted snapshot with accurate zero',async()=>{
 const {svc,statements}=sandbox()
 const res=await svc.saveResultRevision(input())
 assert.equal(res.obtainedMarks,0)
 assert.equal(res.maximumMarks,10)
 assert.equal(res.currentRevision,1)
 const inserted=statements.find(x=>x.sql.includes('INSERT INTO assessment_result_records'))
 assert.equal(inserted.args[3],'231')
 assert.equal(JSON.parse(inserted.args[4]).displayName,'Student synthetic')
 assert.ok(statements.some(x=>x.sql.includes('COMMIT')))
})
test('student:ID and ID aliases produce identical stable result and canonical store key',async()=>{
 const a=sandbox(),b=sandbox()
 const x=await a.svc.saveResultRevision(input({studentKey:'231'}))
 const y=await b.svc.saveResultRevision(input({studentKey:'student:231'}))
 assert.equal(x.resultId,y.resultId)
 const row=b.statements.find(x=>x.sql.includes('INSERT INTO assessment_result_records'))
 assert.equal(row.args[3],'231')
})
test('spoofed resultId is denied before any result write',async()=>{
 const {svc,statements}=sandbox()
 await assert.rejects(()=>svc.saveResultRevision(input({resultId:'custom-id-1'})),e=>e.code==='RESULT_IDENTITY_MISMATCH')
 assert.equal(statements.some(x=>x.sql.includes('INSERT INTO assessment_result_records')),false)
 assert.ok(statements.some(x=>x.sql.includes('ROLLBACK')))
})
test('unverified release cohort fails closed with zero writes',async()=>{
 const {svc,statements}=sandbox({releaseSnapshot:{metadata:{subject:'Bio'},sections:[{id:'q1',authoritativeSectionTotal:10}]}})
 await assert.rejects(()=>svc.saveResultRevision(input()),e=>e.code==='ASSESSMENT_RELEASE_COHORT_REQUIRED')
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO assessment_result_')))
})
test('unassigned class/section fails before first result write',async()=>{
 const {svc,statements}=sandbox({rows:[{id:231,school_id:1,name:'Synthetic',class:'Nine',section:'Fatima',is_active:true}]})
 await assert.rejects(()=>svc.saveResultRevision(input()),e=>e.code==='ASSESSMENT_STUDENT_COHORT_MISMATCH')
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO assessment_result_')))
})
