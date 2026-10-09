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
const {sha256}=require('../services/questionGovernanceHash')
const question={classLevel:'9th',subject:'biology',medium:'english',chapterNo:'1',
 board:'punjab board',chapterName:'biological introduction',topicName:'cellular energy',
 questionType:'short',questionText:'Why do organisms require energy?',answer:'Energy supports biological processes.',marks:2,
 difficulty:'medium',priority:'additional',sourceType:'json_seed',sourceFileId:'biology9Starter2026.json',sourcePageNo:null}
const contentHash=sha256(question)
const legacy={id:'ORIG-IX-01',school_id:SCHOOL,class_level:'9th',subject:'biology',
 medium:'english',board:'Punjab Board',chapter_no:'1',chapter_name:'Biological Introduction',topic_name:'Cellular Energy',question_type:'short',question_text:question.questionText,
 question_text_urdu:'',options:[],correct_option:'',answer:question.answer,
 explanation:'',marks:2,difficulty:'medium',priority:'additional',source_type:'json_seed',
 source_file_id:'biology9Starter2026.json',source_page_no:null,
 is_approved:false,is_duplicate:false,metadata:{},created_by:REVIEWER}
function fakeDatabase(sourceCreator,{sourceMissing=false,signedCreator=REVIEWER,signedAt='2026-10-09T00:00:00Z',linkedOverrides={},revisionOverrides={},reviewerActive=true,reviewerRole='principal',reviewerMissing=false,recordedHash=null}={}){
 const queries=[]
 const master={id:3,public_id:'QB-1',current_revision:2,lifecycle_status:'reviewed',
  created_by:101,source_question_bank_id:legacy.id}
 const revisionContent={...question,...revisionOverrides}
 const revision={revision_number:2,content_hash:recordedHash??sha256(revisionContent),content_json:revisionContent,created_by:102}
 const linked={...legacy,created_by:sourceCreator,...linkedOverrides}
 const review={mapping_status:'reviewed',reviewed_by:REVIEWER,created_by:signedCreator,reviewed_at:signedAt,
  metadata:{currentRevision:2,contentHash:revision.content_hash,reviewerUserId:REVIEWER,schoolId:SCHOOL,sourceEvidence:{}}}
 const client={async query(sql){
  queries.push(sql)
  if(sql.includes('FROM users'))return reviewerMissing?{rowCount:0,rows:[]}:{rowCount:1,rows:[{id:REVIEWER,role:reviewerRole,is_active:reviewerActive}]}
  if(sql.includes('FROM question_masters'))return{rowCount:1,rows:[master]}
  if(sql.includes('FROM question_revisions'))return{rowCount:1,rows:[revision]}
  if(sql.includes('FROM question_bank'))return sourceMissing?{rowCount:0,rows:[]}:{rowCount:1,rows:[linked]}
  if(sql.includes('FROM question_mappings'))return{rowCount:1,rows:[review]}
  throw Error('UNEXPECTED_TEST_QUERY:'+sql)
 }}
 return{client,queries,master,revisionHash:revision.content_hash}
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
 const {client,queries,revisionHash}=fakeDatabase(105,{linkedOverrides:{answer:' '},revisionOverrides:{answer:' '}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:revisionHash,evidence:{}
 }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
 assert.equal(queries.some(q=>q.includes('INSERT INTO question_mappings')),false)
})
test('recorded academic review rejects identical invalid zero marks before writing signoff',async()=>{
 const {client,queries,revisionHash}=fakeDatabase(105,{linkedOverrides:{marks:0},revisionOverrides:{marks:0}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:revisionHash,evidence:{}
 }),{code:'REVIEW_LINKED_SOURCE_CONTENT_DRIFT'})
 assert.equal(queries.some(q=>q.includes('INSERT INTO question_mappings')),false)
})
test('valid Urdu-only question with independent reviewable answer and positive marks remains eligible for other evidence checks',async()=>{
 const prompt='توانائی کیا ہے؟'
 const answer='توانائی کام کرنے کی صلاحیت ہے۔'
 const {client,revisionHash}=fakeDatabase(105,{
  linkedOverrides:{medium:'urdu',question_text:'',question_text_urdu:prompt,answer},
  revisionOverrides:{medium:'urdu',questionText:'',questionTextUrdu:prompt,answer}
 })
 const replay=await loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:revisionHash,evidence:{}
 })
 assert.equal(replay.replayed,true)
 assert.equal(replay.questionBankApproved,false)
})


test('disabled reviewer cannot record or replay academic review even if principal role is retained',async()=>{
 const {client,queries}=fakeDatabase(105,{reviewerActive:false})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 }),{code:'REVIEWER_NOT_AUTHORIZED_FOR_TENANT'})
 assert.equal(queries.some(sql=>sql.includes('INSERT INTO question_mappings')),false)
})
test('publication rejects academic signature of deactivated reviewer at latest tenant-scoped status',async()=>{
 const {client,master,queries}=fakeDatabase(105,{reviewerActive:false})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'ACADEMIC_REVIEWER_NO_LONGER_AUTHORIZED'})
 assert.ok(queries.some(sql=>sql.includes('FROM users')&&sql.includes('is_active')))
})
test('publication rejects old reviewed mapping after reviewer role downgrade',async()=>{
 const {client,master}=fakeDatabase(105,{reviewerRole:'teacher'})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'ACADEMIC_REVIEWER_NO_LONGER_AUTHORIZED'})
})
test('publication rejects reviewer whose user no longer belongs to this tenant',async()=>{
 const {client,master}=fakeDatabase(105,{reviewerMissing:true})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'ACADEMIC_REVIEWER_NO_LONGER_AUTHORIZED'})
})
test('authorized active principal may proceed to mandatory source-evidence checks without automatic approval',async()=>{
 const {client,master,queries}=fakeDatabase(105,{reviewerActive:true,reviewerRole:'principal'})
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  error=>error?.code!=='ACADEMIC_REVIEWER_NO_LONGER_AUTHORIZED')
 assert.ok(queries.some(sql=>sql.includes('FROM users')&&sql.includes('school_id=$2')))
})

test('deactivated principal is denied academic review-context details before question lookup',async()=>{
 const {client,queries}=fakeDatabase(105,{reviewerActive:false})
 await assert.rejects(loadReviewService(client).getAcademicReviewContext({
  schoolId:SCHOOL,requesterId:REVIEWER,publicId:'QB-1'
 }),{code:'REVIEW_SCOPE_DENIED'})
 assert.equal(queries.some(sql=>sql.includes('FROM question_masters')),false)
})
test('active principal can obtain limited review context but never an academic approval',async()=>{
 const {client}=fakeDatabase(105,{reviewerActive:true})
 const response=await loadReviewService(client).getAcademicReviewContext({
  schoolId:SCHOOL,requesterId:REVIEWER,publicId:'QB-1'
 })
 assert.equal(response.academicApprovalGranted,false)
 assert.equal(response.schoolId,SCHOOL)
})


test('review signing rejects changed curriculum topic despite matching original chapter and question answer',async()=>{
 const {client,queries}=fakeDatabase(105,{linkedOverrides:{topic_name:'Unrelated plant topic'}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',expectedRevision:2,
  expectedContentHash:contentHash,evidence:{}
 }),{code:'ACADEMIC_CURRICULUM_TOPIC_DRIFT'})
 assert.equal(queries.some(sql=>sql.includes('INSERT INTO question_mappings')),false)
})
test('independent review rejects mismatched textbook chapter title and examination board',async()=>{
 for(const linkedOverrides of [{chapter_name:'Unrelated chapter title'},{board:'Other examination board'}]){
  const {client}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:contentHash,evidence:{}
  }),{code:'ACADEMIC_CURRICULUM_TOPIC_DRIFT'})
 }
})
test('independent review rejects missing original topic/chapter/board provenance and unchanged empty pairs',async()=>{
 for(const linkedOverrides of [{topic_name:null},{chapter_name:''},{board:null}]){
  const {client}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:contentHash,evidence:{}
  }),{code:'ACADEMIC_CURRICULUM_TOPIC_DRIFT'})
 }
 const {client,revisionHash}=fakeDatabase(105,{linkedOverrides:{topic_name:null},revisionOverrides:{topicName:''}})
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:revisionHash,evidence:{}
 }),{code:'ACADEMIC_CURRICULUM_TOPIC_DRIFT'})
})
test('publisher rechecks original board chapter title and topic after a saved review is signed',async()=>{
 for(const linkedOverrides of [{topic_name:'Different topic'},{chapter_name:'Other chapter'},{board:'Other Board'},{topic_name:null}]){
  const {client,master}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
   {code:'ACADEMIC_CURRICULUM_TOPIC_DRIFT'})
 }
})
test('exact matching mapped board/chapter title/topic permits other mandatory publication proof checks',async()=>{
 const {client,master,queries}=fakeDatabase(105)
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  e=>e.code!=='ACADEMIC_CURRICULUM_TOPIC_DRIFT')
 assert.ok(queries.some(sql=>sql.includes('FROM question_bank')&&sql.includes('topic_name')&&sql.includes('chapter_name')&&sql.includes('board')))
})

test('case, Unicode and whitespace-equivalent verified mapping labels do not cause false source drift',async()=>{
 const {client,queries}=fakeDatabase(105,{linkedOverrides:{
  board:' PUNJAB   BOARD ',chapter_name:'BIOLOGICAL  INTRODUCTION',
  topic_name:' Cellular    Energy ',
 }})
 const replay=await loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 })
 assert.equal(replay.replayed,true)
 assert.equal(replay.questionBankApproved,false)
 assert.ok(queries.some(sql=>sql.includes('FROM question_bank')&&sql.includes('board')&&sql.includes('topic_name')))
})


test('recording rejects source-aligned answer tampering when stored immutable hash was not recomputed',async()=>{
 const tampered='Energy is a stored different explanation.'
 const {client,queries}=fakeDatabase(105,{
  linkedOverrides:{answer:tampered},revisionOverrides:{answer:tampered},recordedHash:contentHash
 })
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 }),{code:'ACADEMIC_REVISION_HASH_CONTENT_DRIFT'})
 assert.equal(queries.some(sql=>sql.includes('INSERT INTO question_mappings')),false)
})
test('publication rejects a signed source and revision both changed while the immutable SHA remains original',async()=>{
 const tampered='Later modified answer.'
 const {client,master}=fakeDatabase(105,{
  linkedOverrides:{answer:tampered},revisionOverrides:{answer:tampered},recordedHash:contentHash
 })
 await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
  {code:'ACADEMIC_REVISION_HASH_CONTENT_DRIFT'})
})
test('recorded revision SHA is the canonical governance SHA, not raw JSON key insertion order',()=>{
 const {assertGrade910ImmutableRevisionHash}=require(GATE)
 const rearranged={marks:question.marks,answer:question.answer,topicName:question.topicName,
  chapterName:question.chapterName,chapterNo:question.chapterNo,
  questionText:question.questionText,questionType:question.questionType,
  board:question.board,medium:question.medium,subject:question.subject,
  classLevel:question.classLevel,sourcePageNo:question.sourcePageNo,
  sourceFileId:question.sourceFileId,sourceType:question.sourceType,
  difficulty:question.difficulty,priority:question.priority}
 assert.equal(assertGrade910ImmutableRevisionHash({content_json:rearranged,content_hash:contentHash}),true)
})
test('revision hash refuses unsupported or missing JSON content rather than hashing meaningless string',()=>{
 const {assertGrade910ImmutableRevisionHash}=require(GATE)
 for(const content of [null,undefined,'text',[],true])
  assert.throws(()=>assertGrade910ImmutableRevisionHash({content_json:content,content_hash:contentHash}),
   {code:'ACADEMIC_REVISION_HASH_CONTENT_DRIFT'})
})

test('canonical revision hashing preserves governance SHA-256 for English, Urdu and rearranged JSON keys',()=>{
 const {sha256,stable}=require('../services/questionGovernanceHash')
 assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
 const a={marks:2,answer:'توانائی کام کرنے کی صلاحیت ہے۔',subject:'biology',options:[{text:'A + B',label:'A'}]}
 const b={options:[{label:'A',text:'A + B'}],subject:'biology',answer:'توانائی کام کرنے کی صلاحیت ہے۔',marks:2}
 assert.equal(sha256(a),sha256(b))
 assert.deepEqual(Object.keys(stable({b:1,a:2})),['a','b'])
 assert.notEqual(sha256({...a,marks:3}),sha256(a))
})

test('other-grade question publication precheck does not acquire Grade IX/X hash obligations',async()=>{
 const {client,master}=fakeDatabase(105,{
  linkedOverrides:{class_level:'8th'},
  revisionOverrides:{classLevel:'8th'},
  recordedHash:'f'.repeat(64)
 })
 const state=await loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104})
 assert.equal(state.grade,null)
 assert.equal(state.review,null)
})
test('independent Grade9/10 review API rejects Grade8 before revision hash mismatch',async()=>{
 const {client}=fakeDatabase(105,{
  linkedOverrides:{class_level:'8th'},
  revisionOverrides:{classLevel:'8th'},
  recordedHash:'f'.repeat(64)
 })
 await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:'f'.repeat(64),evidence:{}
 }),{code:'REVIEW_GRADE_NOT_SUPPORTED'})
})


test('review recording refuses mismatched original difficulty, priority or source classification metadata',async()=>{
 const cases=[
  {difficulty:'easy'},
  {priority:'past paper'},
  {source_type:'copied_guide'},
  {source_file_id:'other-school-file.json'},
  {source_page_no:57}
 ]
 for(const linkedOverrides of cases){
  const {client,queries}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
    schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
    expectedRevision:2,expectedContentHash:contentHash,evidence:{}
  }),{code:'ACADEMIC_SOURCE_CLASSIFICATION_DRIFT'})
  assert.equal(queries.some(sql=>sql.includes('INSERT INTO question_mappings')),false)
 }
})
test('review recording refuses unattested original file provenance and source-type even when revision is equally blank',async()=>{
 for(const linkedOverrides of [{source_file_id:null},{source_type:''}]){
  const {client}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:contentHash,evidence:{}
  }),{code:'ACADEMIC_SOURCE_CLASSIFICATION_DRIFT'})
 }
 for(const k of ['sourceFileId','sourceType']){
  const revisionOverrides={[k]:''}
  const linkedOverrides=k==='sourceFileId'?{source_file_id:''}:{source_type:''}
  const {client,revisionHash}=fakeDatabase(105,{linkedOverrides,revisionOverrides})
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:revisionHash,evidence:{}
  }),{code:'ACADEMIC_SOURCE_CLASSIFICATION_DRIFT'})
 }
})
test('publisher checks changed source assessment and provenance metadata after signed review',async()=>{
 for(const linkedOverrides of [
  {difficulty:'hard'},{priority:'high'},{source_type:'external'},
  {source_file_id:'different-source.pdf'},{source_page_no:4},{source_file_id:null}
 ]){
  const {client,master}=fakeDatabase(105,{linkedOverrides})
  await assert.rejects(loadApprovalGate()(client,{schoolId:SCHOOL,master,actorId:104}),
   {code:'ACADEMIC_SOURCE_CLASSIFICATION_DRIFT'})
 }
})
test('source attribution requires full tenant-scoped locked fields, but matching provisional metadata never confers approval',async()=>{
 const {client,queries}=fakeDatabase(105)
 const out=await loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:contentHash,evidence:{}
 })
 assert.equal(out.questionBankApproved,false)
 assert.ok(queries.some(q=>q.includes('FROM question_bank')&&
  q.includes('difficulty')&&q.includes('source_file_id')&&q.includes('source_page_no')&&q.includes('FOR SHARE')))
})

test('positive matching page number and editorial classification do not grant academic approval',async()=>{
 const {client,revisionHash}=fakeDatabase(105,{
  linkedOverrides:{source_page_no:12,difficulty:' Medium ',priority:' ADDITIONAL '},
  revisionOverrides:{sourcePageNo:12}
 })
 const out=await loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
  schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
  expectedRevision:2,expectedContentHash:revisionHash,evidence:{}
 })
 assert.equal(out.replayed,true)
 assert.equal(out.questionBankApproved,false)
})
test('invalid original and immutable revision page identities both fail closed',async()=>{
 for(const page of [0,-1,1.5,'12']){
  const {client,revisionHash}=fakeDatabase(105,{
   linkedOverrides:{source_page_no:page},revisionOverrides:{sourcePageNo:page}
  })
  await assert.rejects(loadReviewService(client,{syntheticEvidence:true}).recordIndependentAcademicReview({
   schoolId:SCHOOL,reviewerId:REVIEWER,publicId:'QB-1',
   expectedRevision:2,expectedContentHash:revisionHash,evidence:{}
  }),{code:'ACADEMIC_SOURCE_CLASSIFICATION_DRIFT'})
 }
})
