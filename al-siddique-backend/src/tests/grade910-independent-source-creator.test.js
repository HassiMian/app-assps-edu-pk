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
 explanation:'',marks:2,is_approved:false,is_duplicate:false,metadata:{},created_by:REVIEWER}
function fakeDatabase(sourceCreator,{sourceMissing=false,signedCreator=REVIEWER,signedAt='2026-10-09T00:00:00Z',linkedOverrides={},revisionOverrides={}}={}){
 const queries=[]
 const master={id:3,public_id:'QB-1',current_revision:2,lifecycle_status:'reviewed',
  created_by:101,source_question_bank_id:legacy.id}
 const revision={revision_number:2,content_hash:contentHash,content_json:{...question,...revisionOverrides},created_by:102}
 const linked={...legacy,created_by:sourceCreator,...linkedOverrides}
 const review={mapping_status:'reviewed',reviewed_by:REVIEWER,created_by:signedCreator,reviewed_at:signedAt,
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
function loadReviewService(client,{syntheticEvidence=false}={}){
 const nativeRequire=createRequire(SERVICE)
 const mod={exports:{}}
 const customRequire=(name)=>name==='./questionBankGovernance'
  ?{withTenantTransaction:async(schoolId,fn)=>fn(client,schoolId)}
  :name==='./grade910AcademicReviewGate'&&syntheticEvidence
   ?{...nativeRequire(name),normalizeEvidence:()=>({})}
  :name==='node:util'&&syntheticEvidence
   ?{isDeepStrictEqual:(a,b)=>require('node:util').isDeepStrictEqual(
       JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)))}
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

test('publication rejects a review mapping entered by a different claimed signer',async()=>{
 const {client,master}=fakeDatabase(105,{signedCreator:108})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'REVIEW_SIGNOFF_ORIGINATOR_MISMATCH'})
})
test('publication rejects a reviewed mapping lacking its actual signing actor',async()=>{
 const {client,master}=fakeDatabase(105,{signedCreator:null})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'REVIEW_SIGNOFF_ORIGINATOR_MISMATCH'})
})
test('publication requires recorded reviewer signoff timestamp rather than status text alone',async()=>{
 const {client,master}=fakeDatabase(105,{signedAt:null})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'REVIEW_SIGNOFF_TIMESTAMP_MISSING'})
})
test('publication does not accept a fabricated invalid signing time',async()=>{
 const {client,master}=fakeDatabase(105,{signedAt:'a fabricated timestamp'})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'REVIEW_SIGNOFF_TIMESTAMP_MISSING'})
})

test('recorded academic-review replay rejects a forged creator even if reviewer ID and revision SHA agree',async()=>{
 const {client}=fakeDatabase(105,{signedCreator:108})
 const service=loadReviewService(client,{syntheticEvidence:true})
 await assert.rejects(service.recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEW_SIGNOFF_ORIGINATOR_MISMATCH'})
})
test('recorded academic-review replay rejects missing reviewed_at even when immutable revision agrees',async()=>{
 const {client}=fakeDatabase(105,{signedAt:null})
 const service=loadReviewService(client,{syntheticEvidence:true})
 await assert.rejects(service.recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEW_SIGNOFF_TIMESTAMP_MISSING'})
})
test('synthetic replay with matching recorded actor/time is idempotent but never approves a question',async()=>{
 const {client}=fakeDatabase(105)
 const service=loadReviewService(client,{syntheticEvidence:true})
 const output=await service.recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 })
 assert.equal(output.replayed,true)
 assert.equal(output.independentReviewRecorded,true)
 assert.equal(output.questionBankApproved,false)
})
test('invalid PostgreSQL Date object fails closed without unhandled conversion error',()=>{
 const {assertGrade910ReviewSignature}=require(GATE)
 assert.throws(()=>assertGrade910ReviewSignature(
  {created_by:REVIEWER,reviewed_at:new Date(NaN)},REVIEWER),
  {code:'REVIEW_SIGNOFF_TIMESTAMP_MISSING'})
})

test('review recording refuses an original source row with altered answer despite valid reviewed revision and reviewer',async()=>{
 const {client}=fakeDatabase(105,{linkedOverrides:{answer:'Contradictory source answer'}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
})
test('review recording refuses original-source marks and chapter drift before allowing recorded review replay',async()=>{
 for(const linkedOverrides of [{marks:5},{chapter_no:'2'}]){
  const {client}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:contentHash,evidence:{}
  }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
 }
})
test('review recording must reject same-subject revision with a different original medium',async()=>{
 const {client}=fakeDatabase(105,{linkedOverrides:{medium:'urdu'}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
})
test('review recording rejects altered original stem, subject, grade or question type, and does not insert a review',async()=>{
 const changes=[
  {question_text:'Different unreviewed textbook question'},
  {subject:'chemistry'},
  {class_level:'10th'},
  {question_type:'mcq'},
  {explanation:'Different explanation from linked school source'}
 ]
 for(const linkedOverrides of changes){
  const {client,queries}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:contentHash,evidence:{}
  }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
  assert.equal(queries.some(sql=>sql.includes('INSERT INTO question_mappings')),false)
 }
})
test('positive exact linked original permits idempotent replay only with tenant scoped share-locked source read',async()=>{
 const {client,queries}=fakeDatabase(105)
 const response=await loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 })
 assert.equal(response.replayed,true)
 assert.equal(response.questionBankApproved,false)
 assert.ok(queries.some(sql=>sql.includes('FROM question_bank')&&sql.includes('school_id=$1')&&sql.includes('FOR SHARE')&&sql.includes('question_text')&&sql.includes('marks')))
})

test('review recording blocks flagged or uncertain legacy Question Bank duplicates before a mapping is stored',async()=>{
 for(const flag of [true,null,undefined,'false']){
  const {client,queries}=fakeDatabase(105,{linkedOverrides:{is_duplicate:flag}})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:contentHash,evidence:{}
  }),{code:'REVIEW_DUPLICATE_STATUS_UNRESOLVED'})
  assert.equal(queries.some(q=>q.includes('INSERT INTO question_mappings')),false)
 }
})
test('publication precheck refuses an already-reviewed mapping linked to flagged or ambiguous duplicate source',async()=>{
 for(const flag of [true,null,undefined,'false']){
  const {client,master}=fakeDatabase(105,{linkedOverrides:{is_duplicate:flag}})
  await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
   {code:'REVIEW_DUPLICATE_STATUS_UNRESOLVED'})
 }
})
test('only boolean false source duplicate status can progress to other independent review gates',async()=>{
 const {client,queries}=fakeDatabase(105)
 const output=await loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 })
 assert.equal(output.replayed,true)
 assert.equal(output.questionBankApproved,false)
 assert.ok(queries.some(q=>q.includes('is_duplicate')&&q.includes('FROM question_bank')))
})

test('recorded academic review cannot replay identical source and revision with an empty answer',async()=>{
 const {client,queries}=fakeDatabase(105,{linkedOverrides:{answer:' '},revisionOverrides:{answer:' '}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
 assert.equal(queries.some(q=>q.includes('INSERT INTO question_mappings')),false)
})
test('recorded academic review rejects identical invalid zero marks before writing signoff',async()=>{
 const {client,queries}=fakeDatabase(105,{linkedOverrides:{marks:0},revisionOverrides:{marks:0}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
 assert.equal(queries.some(q=>q.includes('INSERT INTO question_mappings')),false)
})
test('valid Urdu-only question with independent reviewable answer and positive marks remains eligible for other evidence checks',async()=>{
 const prompt='توانائی کیا ہے؟'
 const answer='توانائی کام کرنے کی صلاحیت ہے۔'
 const {client}=fakeDatabase(105,{
  linkedOverrides:{medium:'urdu',question_text:'',question_text_urdu:prompt,answer},
  revisionOverrides:{medium:'urdu',questionText:'',questionTextUrdu:prompt,answer}
 })
 const replay=await loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 })
 assert.equal(replay.replayed,true)
 assert.equal(replay.questionBankApproved,false)
})
