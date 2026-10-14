'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto')
const {build,OUT}=require('../qbank/prepare-grade910-five-final-long-research-drafts.cjs')
const prior=require('../../docs/question-bank/ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json')
let cached
const data=()=>cached??(cached=build())
test('last five original IDs are revision-bound to former unfilled 161-research slots',()=>{
 const x=data()
 assert.equal(x.priorUnapprovedAnswerResearchOriginalIds,161)
 assert.equal(x.lastFiveOriginalIdsAddressedInReviewerDocket,5)
 assert.equal(x.newSupplementalConceptualDrafts,4)
 assert.equal(x.facultyHeldWithoutAnswerText,1)
 assert.equal(x.combinedOriginalIdsWithSomeSupplementalResearch,165)
 assert.equal(x.originalQuestionCandidatesPreserved,2581)
 assert.equal(x.originalRubricOnlyLongCandidatesPreserved,166)
 assert.deepEqual(new Set(x.rows.map(q=>q.originalQuestionId)),new Set(prior.remainingOriginalQuestionIds))
 assert.deepEqual(x.rows.map(q=>q.grade).sort((a,b)=>a-b),[9,9,10,10,10])
})
test('each scholarly candidate remains unapproved, revision-pinned and never an unsafe procedure',()=>{
 const x=data()
 for(const p of x.rows){
  for(const key of ['originalQuestionRevisionSha256','originalSourceFileSha256','claimedSourcePdfSha256'])
   assert.match(p[key],/^[a-f0-9]{64}$/)
  assert.equal(p.proposedMarks,5)
  assert.equal(p.academicApprovalAuthenticated,false)
  assert.equal(p.published,false)
  assert.equal(p.publisherSelectable,false)
  if(p.requiresQualifiedSubjectFacultyCompletion){
   assert.equal(p.proposedConceptualExplanation,null)
   assert.deepEqual(p.proposedFiveMarkCriteria,[])
   assert.equal(p.researchAnswerRevisionSha256,null)
  }else{
   assert.equal(p.proposedFiveMarkCriteria.length,5)
   assert.equal(new Set(p.proposedFiveMarkCriteria).size,5)
   const digest=crypto.createHash('sha256').update(JSON.stringify({
    id:p.originalQuestionId,explanation:p.proposedConceptualExplanation,
    points:p.proposedFiveMarkCriteria})).digest('hex')
   assert.equal(p.researchAnswerRevisionSha256,digest)
  }
 }
 assert.equal(x.authenticatedIndependentApprovals,0)
 assert.equal(x.verifiedPublished,0)
 assert.equal(x.productionImportPermitted,false)
})
test('static supplemental docket matches original research freeze and maintains publication deny',()=>{
 assert.deepEqual(JSON.parse(fs.readFileSync(OUT,'utf8')),data())
})
