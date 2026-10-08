'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const crypto=require('node:crypto')
const {analyze,verifyQuestionAgainstReference,FACTS,SOURCE,OUT}=require('../qbank/audit-physics9-conceptual-mcq-reference.cjs')
const {buildReviewQueue}=require('../qbank/build-grade910-review-triage.cjs')
const {collectDocuments}=require('../qbank/audit-authoring-crossfile-qa.cjs')
const manifest=require('../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const sourceBytes=fs.readFileSync(SOURCE)
const doc=JSON.parse(sourceBytes)
const analysis=analyze(sourceBytes)
const SHA=v=>crypto.createHash('sha256').update(v).digest('hex')
const clone=v=>JSON.parse(JSON.stringify(v))
test('all 18 original Physics IX MCQs have independent conceptual reference candidates with no human approval',()=>{
 assert.equal(analysis.originalMcqCount,18)
 assert.equal(analysis.referenceOptionConsistent,18)
 assert.equal(analysis.contextualQualifications,8)
 assert.equal(analysis.originalQuestionCount,54)
 assert.equal(analysis.uniqueQuestionsAdded,0)
 assert.equal(analysis.academicApproved,0)
 assert.equal(analysis.independentHumanAnswerVerified,0)
 assert.equal(analysis.sourcePageVerified,0)
 assert.equal(analysis.schoolEditionAdoptionVerified,0)
 assert.equal(analysis.releaseEligible,false)
 assert.equal(analysis.liveImportAllowed,false)
 assert.equal(analysis.allStoredKeysOriginallyA,true)
 assert.equal(new Set(analysis.rows.map(r=>r.questionId)).size,18)
})
test('candidate report is deterministic and original source+per-question SHA are exact',()=>{
 assert.deepEqual(fs.readFileSync(OUT),Buffer.from(JSON.stringify(analysis,null,2)+'\n'))
 assert.equal(analysis.parentSourceSha256,SHA(sourceBytes))
 for(const row of analysis.rows){
  const q=doc.drafts.find(q=>q.id===row.questionId)
  assert.ok(q)
  assert.equal(row.originalQuestionSha256,SHA(JSON.stringify(q)))
  assert.equal(row.expectedAnswerSha256,SHA(q.content.en.answer.toLowerCase().trim()))
  assert.equal(row.selectedOptionId,q.correctOptionId)
  assert.equal(row.independentReviewerId,null)
  assert.equal(row.answerAccuracyHumanVerified,false)
  assert.equal(row.approved,false)
  assert.equal(row.published,false)
 }
})
test('physics heat/phase transition and classical scope caveats are still pending subject review',()=>{
 const byId=new Map(analysis.rows.map(x=>[x.questionId,x]))
 assert.equal(byId.get('IX-PHY-2025-C07-M02').contextCaveat,'PHASE_CHANGE_EXCEPTION_REVIEW')
 assert.equal(byId.get('IX-PHY-2025-C03-M02').contextCaveat,'CLASSICAL_NONRELATIVISTIC_SCOPE')
 assert.equal(byId.get('IX-PHY-2025-C04-M02').contextCaveat,'COPLANAR_STATIC_EQUILIBRIUM_SCOPE')
 assert.ok([...byId.values()].every(r=>r.approved===false))
})
test('original question changes cannot use stale conceptual reference',()=>{
 const changed=Buffer.from(sourceBytes.toString('utf8').replace('Which SI base unit','Which international base unit'))
 assert.throws(()=>analyze(changed),/PHYSICS9_SOURCE_CONTENT_SHA_DRIFT/)
})
test('scientific-reference mismatches reject an incorrect keyed option or altered answer',()=>{
 const q=clone(doc.drafts.find(x=>x.id==='IX-PHY-2025-C03-M02'))
 assert.equal(verifyQuestionAgainstReference(q,FACTS[q.id]).selectedOptionId,'A')
 q.correctOptionId='C'
 assert.throws(()=>verifyQuestionAgainstReference(q,FACTS[q.id]),/PHYSICS9_STORED_KEY_CONTRADICTS_REFERENCE/)
 q.correctOptionId='A';q.content.en.answer='Acceleration'
 assert.throws(()=>verifyQuestionAgainstReference(q,FACTS[q.id]),/PHYSICS9_STORED_KEY_CONTRADICTS_REFERENCE/)
})
test('duplicate options and missing independently expected answer are rejected',()=>{
 const q=clone(doc.drafts.find(x=>x.id==='IX-PHY-2025-C01-M01'))
 q.content.en.options[1].text=q.content.en.options[0].text
 assert.throws(()=>verifyQuestionAgainstReference(q,FACTS[q.id]),/PHYSICS9_MCQ_OPTIONS_INVALID/)
 q.content.en.options[1].text='force'
 q.content.en.options[0].text='second'
 assert.throws(()=>verifyQuestionAgainstReference(q,FACTS[q.id]),/PHYSICS9_EXPECTED_SCIENTIFIC_OPTION_MISSING_OR_AMBIGUOUS/)
})
test('18 revision-bound provisional references integrate into 2,581-item review queue and remain pending',()=>{
 const queue=buildReviewQueue(collectDocuments(),manifest,{},[],[],{pairs:[]},analysis)
 assert.equal(queue.counts.questionRecords,2581)
 assert.equal(queue.physicsProvisionalConceptReferences,18)
 assert.equal(queue.physicsConceptualScopeCaveats,8)
 assert.equal(queue.blockerCounts.PHYSICS_CONCEPT_ANSWER_HUMAN_REVIEW_REQUIRED,18)
 assert.equal(queue.blockerCounts.PHYSICS_CONCEPT_SCOPE_QUALIFIER_REVIEW_REQUIRED,8)
 assert.equal(queue.counts.approved,0)
 const refs=queue.records.filter(row=>row.physicsConceptualReferenceCandidate)
 assert.equal(refs.length,18)
 assert.ok(refs.every(x=>x.physicsConceptualReferenceCandidate.reviewStatus==='PENDING_PHYSICS_SUBJECT_SPECIALIST'))
 assert.ok(refs.every(x=>x.status.approved===false))
})
test('review queue rejects mismatched content revision hashes and forged human review',()=>{
 const docs=collectDocuments()
 const changed=clone(analysis)
 changed.rows[0].originalQuestionSha256='f'.repeat(64)
 assert.throws(()=>buildReviewQueue(docs,manifest,{},[],[],{pairs:[]},changed),/PHYSICS_CONCEPT_REFERENCE_SOURCE_OR_REVIEW_DRIFT/)
 const forged=clone(analysis)
 forged.rows[0].answerAccuracyHumanVerified=true
 assert.throws(()=>buildReviewQueue(docs,manifest,{},[],[],{pairs:[]},forged),/PHYSICS_CONCEPT_REFERENCE_SOURCE_OR_REVIEW_DRIFT/)
 const duplicate=clone(analysis)
 duplicate.rows[1].questionId=duplicate.rows[0].questionId
 assert.throws(()=>buildReviewQueue(docs,manifest,{},[],[],{pairs:[]},duplicate),/PHYSICS_REFERENCE_DUPLICATE_QUESTION/)
 const orphan=clone(analysis)
 orphan.rows[0].questionId='ORPHAN'
 assert.throws(()=>buildReviewQueue(docs,manifest,{},[],[],{pairs:[]},orphan),/PHYSICS_CONCEPT_REFERENCES_MISSING_ORIGINAL_QUESTION/)
})
