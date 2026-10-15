'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const dir=path.resolve(__dirname,'../../docs/question-bank')
const data=JSON.parse(fs.readFileSync(path.join(dir,'ASSPS_GRADE910_BULK_TEACHER_CORRECTION_PRINCIPAL_EXCEPTION_ATTESTATION_20261015.json')))
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
test('all questions route through 56 existing teacher cohorts, not Principal three-by-three review',()=>{
 assert.equal(data.sourceOriginals,2581)
 assert.equal(data.teacherReviewCandidates,2580)
 assert.equal(data.teacherReviewGroups,56)
 assert.equal(data.mcqTextualOptionStructuralPass,875)
 assert.equal(data.claimedPhysicalPageNotRecorded,1188)
 assert.equal(data.heuristicLongAnswerReviewItems,166)
 assert.equal(data.sourceAuditSha256,sha(fs.readFileSync(path.join(dir,'ASSPS_GRADE910_2581_BULK_OBJECTIVE_ANSWER_SCREENING_20261015.json'))))
})
test('three user-supplied Grade IX Biology answers remain ONLY self-reported preliminary feedback',()=>{
 assert.equal(data.provisionalPrincipalFeedbackQuestions,3)
 assert.equal(data.provisionalPositivePrincipalFeedback,3)
 assert.equal(data.provisionalPrincipalEvidenceRevisionBound,true)
 assert.match(data.principalFeedbackSupersededOldSha256,/^[a-f0-9]{64}$/)
 assert.match(data.principalFeedbackCurrentSha256,/^[a-f0-9]{64}$/)
 assert.notEqual(data.principalFeedbackSupersededOldSha256,data.principalFeedbackCurrentSha256)
 for(const key of ['realTeacherReviewsAuthenticated','schoolBookAdoptionAuthenticated',
  'principalSchoolApprovalAuthenticated','academicallyApproved','published','productionWrites'])
   assert.equal(data[key],0)
 assert.equal(data.releaseDecision,'HOLD_UNTIL_INSTITUTIONAL_AUTHENTICITY')
})
test('public receipts do not leak user feedback question/answer, student, school private directory or reviewer claims',()=>{
 for(const prop of ['reviewedQuestions','questionText','answerKey','answer','reviewerClaimId',
  'privatePath','privateDirectory','staffName','schoolEmail','studentName'])
   assert.equal(Object.hasOwn(data,prop),false)
})
