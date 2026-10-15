'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const moduleGate=require('../qbank/attest-grade910-2581-source-publication-wall-20261015.cjs')
const base=JSON.parse(fs.readFileSync(moduleGate.INPUT))
test('2581-question release gate refuses automatic faculty trust or publication',()=>{
 const r=moduleGate.verify(base)
 assert.equal(r.originalQuestions,2581)
 assert.equal(r.subjectMediumReviewGroups,56)
 assert.equal(r.researchCandidatesWithPreReviewEvidence,584)
 assert.equal(r.unflaggedOriginals,1997)
 assert.equal(r.revisedMcqProposals,66)
 assert.equal(r.approved,0)
 assert.equal(r.published,0)
 assert.equal(r.productionWrites,0)
 assert.equal(r.answerBearingFacultyReviewsTrackedInPublicSource,0)
 assert.match(r.decision,/HOLD/)
})
test('a forged school approval, teacher review or selector flag cannot pass release wall',()=>{
 for(const [field,value] of [['approved',true],['paperStudioSelectable',true],
  ['schoolAdoptionVerified',true],['reviewerIdentityVerified',true],
  ['schoolPrincipalAuthenticatedApproval',true]]){
  const fake={...base,rows:base.rows.map((q,i)=>i? q:{...q,[field]:value})}
  assert.throws(()=>moduleGate.verify(fake,{checkTracked:false}),/UNAUTHENTICATED_QUESTION_PUBLICATION/)
 }
})
test('tampered duplicate question ID or original SHA is rejected before school release',()=>{
 const duplicate={...base,rows:base.rows.map((q,i)=>i===1?{...q,questionId:base.rows[0].questionId}:q)}
 assert.throws(()=>moduleGate.verify(duplicate,{checkTracked:false}),/DUPLICATE_ID/)
 const corrupt={...base,rows:base.rows.map((q,i)=>i===2?{...q,originalRevisionSha256:'mismatched'}:q)}
 assert.throws(()=>moduleGate.verify(corrupt,{checkTracked:false}),/ORIGINAL_SOURCE_NOT_SEALED/)
})
test('a signature or answer-bearing field on public metadata is rejected',()=>{
 const dirty={...base,rows:base.rows.map((q,i)=>i===0?{...q,answerKey:'TEST_VALUE'}:q)}
 assert.throws(()=>moduleGate.verify(dirty,{checkTracked:false}),/SENSITIVE_FIELD/)
 const groups={...base,groups:base.groups.map((q,i)=>i===0?{...q,sourceResearchQuestions:q.sourceResearchQuestions+1}:q)}
 assert.throws(()=>moduleGate.verify(groups,{checkTracked:false}),/GROUP_ASSIGNMENT_DRIFT/)
})
