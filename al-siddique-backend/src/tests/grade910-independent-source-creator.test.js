'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const path=require('node:path')
const {createRequire}=require('node:module')

const ROOT=path.resolve(__dirname,'..')
const SERVICE=path.join(ROOT,'services/grade910AcademicReviewService.js')
const GATE=path.join(ROOT,'services/grade910AcademicReviewGate.js')
const REVIEWER=103, SCHOOL=1
const contentHash='a'.repeat(64)
const question={classLevel:'9th',subject:'biology',medium:'english',chapterNo:'1',
 questionType:'short',questionText:'Why do organisms require energy?',answer:'Energy supports biological processes.',marks:2}
const legacy={id:'ORIG-IX-01',school_id:SCHOOL,class_level:'9th',subject:'biology',
 medium:'english',chapter_no:'1',question_type:'short',question_text:question.questionText,
 question_text_urdu:'',options:[],correct_option:'',answer:question.answer,
 explanation:'',marks:2,is_approved:false,metadata:{},created_by:REVIEWER}
function fakeDatabase(sourceCreator,{sourceMissing=false}={}){
 const queries=[]
 const master={id:3,public_id:'QB-1',current_revision:2,lifecycle_status:'reviewed',
  created_by:101,source_question_bank_id:legacy.id}
 const revision={revision_number:2,content_hash:contentHash,content_json:question,created_by:102}
 const linked={...legacy,created_by:sourceCreator}
 const review={mapping_status:'reviewed',reviewed_by:REVIEWER,
  metadata:{currentRevision:2,contentHash,reviewerUserId:REVIEWER,schoolId:SCHOOL,sourceEvidence:{}}}
 const client={async query(sql){
  queries.push(sql)
  if(sql.includes('FROM users'))return{rowCount:1,rows:[{id:REVIEWER,role:'principal'}]}
  if(sql.includes('FROM question_masters'))return{rowCount:1,rows:[master]}
  if(sql.includes('FROM question_revisions'))return{rowCount:1,rows:[revision]}
  if(sql.includes('FROM question_bank'))return sourceMissing?{rowCount:0,rows:[]}:{rowCount:1,rows:[linked]}
  if(sql.includes('FROM question_mappings'))return{rowCount:1,rows:[review]}
  throw Error('UNEXPECTED_TEST_QUERY:'+sql)
 }}
 return{client,queries,master}
}
function loadReviewService(client){
 const nativeRequire=createRequire(SERVICE)
 const mod={exports:{}}
 const customRequire=(name)=>name==='./questionBankGovernance'
  ?{withTenantTransaction:async(schoolId,fn)=>fn(client,schoolId)}
  :nativeRequire(name)
 vm.runInNewContext(fs.readFileSync(SERVICE,'utf8'),
  {require:customRequire,module:mod,exports:mod.exports,console},{filename:SERVICE})
 return mod.exports
}
function loadApprovalGate(){
 return require(GATE).assertIndependentReviewReady
}
test('academic reviewer cannot be creator of the linked tenant Question Bank source even when master and revision authors differ',async()=>{
 const {client,queries}=fakeDatabase(REVIEWER)
 const service=loadReviewService(client)
 await assert.rejects(service.recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'ACADEMIC_REVIEW_SOURCE_CREATOR_CONFLICT'})
 assert.ok(queries.some(x=>x.includes('FROM question_bank')&&x.includes('school_id')&&x.includes('FOR SHARE')))
})
test('null/unattributed linked source creator cannot be independently attested from just a client-side checkbox',async()=>{
 const {client}=fakeDatabase(null)
 const service=loadReviewService(client)
 await assert.rejects(service.recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'ACADEMIC_REVIEW_SOURCE_CREATOR_UNKNOWN'})
})
test('release cannot reuse approved-looking mapping whose reviewer created linked original source row',async()=>{
 const {client,master,queries}=fakeDatabase(REVIEWER)
 const gate=loadApprovalGate()
 await assert.rejects(gate(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'REVIEW_SOURCE_CREATOR_NOT_INDEPENDENT'})
 assert.ok(queries.some(x=>x.includes('FROM question_bank')&&x.includes('created_by')))
})
test('release blocks null linked source originator even if master and revision authors are distinct',async()=>{
 const {client,master}=fakeDatabase(null)
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'REVIEW_SOURCE_CREATOR_UNKNOWN'})
})
test('independently identified linked original source originator still requires all other review and source checks',async()=>{
 const {client}=fakeDatabase(105)
 const service=loadReviewService(client)
 await assert.rejects(service.recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),err=>err.code!=='ACADEMIC_REVIEW_SOURCE_CREATOR_CONFLICT'&&err.code!=='ACADEMIC_REVIEW_SOURCE_CREATOR_UNKNOWN')
})

test('source creator lookup cannot accept a missing or differently tenant-owned Question Bank row',async()=>{
 const {client}=fakeDatabase(105,{sourceMissing:true})
 const service=loadReviewService(client)
 await assert.rejects(service.recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEW_SOURCE_QUESTION_NOT_FOUND'})
})
