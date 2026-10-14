'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto')
const m=require('../qbank/aggregate-grade910-offline-faculty-decisions.cjs'),
 sign=require('../qbank/verify-grade910-institutional-signatures.cjs')
const H=x=>crypto.createHash('sha256').update(x).digest('hex')
let indexed
const baseline=()=>indexed??(indexed=m.originalIndex())
function fixture(){
 const row=[...baseline().values()].find(x=>!x.row.originalQuestionId.includes('C23-L01'))
 const review={schemaVersion:'assps-grade910-offline-subject-review-v1',
  originalQuestionId:row.row.originalQuestionId,
  originalQuestionRevisionSha256:row.row.originalQuestionRevisionSha256,
  originalSourceFileSha256:row.row.originalSourceFileSha256,
  reviewerClaimId:'synthetic-independent-reviewer-for-test',
  completedAt:'2026-10-12T12:00:00Z',academicSessionClaim:'2026-27',
  disposition:'needs-source-proof',
  independentAnswerBeforeReference:'Research-only independently written synthetic response',
  checks:sign.REVIEW_CHECKS.map(name=>({name,status:'pending',evidenceSha256:null})),
  academicallyApproved:false,published:false}
 return review
}
function temp(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-teacher-intake-'));fs.chmodSync(dir,0o700);return dir}
function write(dir,name,record){const file=path.join(dir,name);fs.writeFileSync(file,JSON.stringify(record),{mode:0o600});return file}
test('whole unchanged 2581 original faculty source cohort remains source SHA pinned',()=>{
 assert.equal(baseline().size,2581)
})
test('real restricted directory with zero faculty signatures records 2580 pending, 0 approvals',()=>{
 const dir=temp()
 try{
  const r=m.aggregate({reviewDir:dir})
  assert.equal(r.candidateCount,2581);assert.equal(r.unansweredFacultyItems,2580)
  assert.equal(r.unsignedTeacherResponsesReceived,0)
  assert.equal(r.academicallyApproved,0);assert.equal(r.verifiedPublished,0)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('one actual original candidate can be intake-recorded as UNSIGNED without publication authority',()=>{
 const dir=temp(),r=fixture()
 try{
  write(dir,'grade9-teacher01.faculty-review.json',r)
  const result=m.aggregate({reviewDir:dir})
  assert.equal(result.unsignedTeacherResponsesReceived,1)
  assert.equal(result.unansweredFacultyItems,2579)
  assert.equal(result.claimedDispositionCounts['needs-source-proof'],1)
  assert.equal(result.rows[0].originalQuestionId,r.originalQuestionId)
  assert.match(result.rows[0].privateRecordDigest,/^[0-9a-f]{64}$/)
  assert.equal(result.rows[0].reviewerIdentityAuthenticated,false)
  assert.equal(result.rows[0].paperStudioVerifiedSelectable,false)
  assert.equal(result.academicallyApproved,0)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('editing an original revision, duplicating a question or forging approved status fails closed',()=>{
 const dir=temp(),r=fixture()
 try{
  let bad={...r,originalQuestionRevisionSha256:H('tamper')}
  assert.throws(()=>m.inspect(bad,baseline()),/UNKNOWN_STALE_OR_RESTRICTED/)
  bad={...r,academicallyApproved:true}
  assert.throws(()=>m.inspect(bad,baseline()),/UNSIGNED_TEACHER_CANNOT_CLAIM/)
  const fp=write(dir,'teacher-a.faculty-review.json',r)
  write(dir,'teacher-b.faculty-review.json',{...r,reviewerClaimId:'another-claim'})
  assert.throws(()=>m.aggregate({reviewDir:dir}),/DUPLICATE_FACULTY_SUBMISSION/)
  fs.unlinkSync(fp)
  assert.equal(m.aggregate({reviewDir:dir}).unsignedTeacherResponsesReceived,1)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('recommendation requires eight per-check evidence references and subject source adoption claims',()=>{
 const r=fixture()
 r.disposition='recommend-independent-verification'
 assert.throws(()=>m.inspect(r,baseline()),/RECOMMENDATION_REQUIRES_COMPLETE/)
 r.checks=sign.REVIEW_CHECKS.map(name=>({name,status:'passed',evidenceSha256:H(name)}))
 r.adoptedTextbookTitleClaim='School book claim (NOT independent authority)'
 r.adoptedTextbookEditionClaim='2026-27'
 r.applicableExamYearClaim=2027
 r.schoolAdoptionProofHashClaim=H('school proof string test')
 r.finalQuestionRevisionSha256Claim=H('new question version')
 r.finalAnswerRevisionSha256Claim=H('new answer version')
 const result=m.inspect(r,baseline())
 assert.equal(result.disposition,'recommend-independent-verification')
 assert.equal(result.checks.passed,8)
 assert.equal(result.academicApproved,false)
 assert.equal(result.schoolAuthorityVerified,false)
 r.checks[0].evidenceSha256='not-a-sha'
 assert.throws(()=>m.inspect(r,baseline()),/INVALID_FACULTY_CRITERION/)
})
test('unsafe permission, non-json records, author self-review, and private path escape are denied',()=>{
 const dir=temp(),r=fixture()
 try{
  const p=write(dir,'signed-test.faculty-review.json',r)
  fs.chmodSync(p,0o644)
  assert.throws(()=>m.aggregate({reviewDir:dir}),/PRIVATE_FACULTY_FILE_PERMISSIONS/)
  fs.chmodSync(p,0o600)
  const row=baseline().get(r.originalQuestionId)
  r.reviewerClaimId=row.source.q.authorId
  assert.throws(()=>m.inspect(r,baseline()),/INDEPENDENT_REVIEWER_CLAIM/)
  fs.writeFileSync(p,'{invalid broken academic review JSON that exceeds minimum file length}')
  assert.throws(()=>m.aggregate({reviewDir:dir}),/INVALID_FACULTY_JSON/)
  assert.throws(()=>m.secureDir(path.resolve(__dirname,'../../docs/question-bank')),
   /CANNOT_READ_FACULTY_SUBMISSIONS_INSIDE_REPOSITORY/)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
