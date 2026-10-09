'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {build,markdown,ID,PIN}=require('../qbank/author-physics10-single-magnet-comparison.cjs')
const ROOT=path.resolve(__dirname,'../..')
const input=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/physics10OriginalApplicationBatch2026.json')
const bytes=fs.readFileSync(input),original=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')))
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const run=(b=bytes,s=original,r=registry)=>build({bytes:b,source:s,registry:r})
test('sole uncovered Physics X source ID pinned to exact 36-question original and one five-mark rubric',()=>{
 const d=run(),q=original.drafts.find(x=>x.id===ID)
 assert.equal(sha(bytes),PIN)
 assert.equal(original.drafts.length,36)
 assert.equal(d.items.length,1)
 assert.equal(d.items[0].questionId,'X-PHY-C17-L03')
 assert.equal(d.originalRubricOnlyLongQuestions,1)
 assert.equal(d.newExplanatoryAnswerResearchDrafts,1)
 assert.equal(d.newFiveMarkPointProposals,5)
 assert.equal(d.items[0].sourceQuestionSha256,sha(JSON.stringify(q)))
 assert.equal(d.items[0].sourceAnswerSha256,sha(q.content.en.answer))
 assert.equal(d.items[0].sourceFileSha256,PIN)
})
test('five conceptual comparisons are distinct, nuanced and avoid physical electrical operating instructions',()=>{
 const a=run().items[0],s=a.proposedIndependentEnglishExplanation
 assert.equal(a.proposedDistinctMarkingPoints.length,5)
 assert.equal(new Set(a.proposedDistinctMarkingPoints).size,5)
 assert.match(s,/permanent magnet retains its magnetic field/i)
 assert.match(s,/controllable magnetic field from electric current/i)
 assert.match(s,/residual magnetization/i)
 assert.match(s,/pole direction/i)
 assert.doesNotMatch(s,/attach the wire|connect to the mains|insert the battery|winding procedure/i)
})
test('changes to original magnet answer and unrelated original question both fail closed',()=>{
 for(const id of [ID,'X-PHY-C10-M03']){
  const changed=structuredClone(original)
  const q=changed.drafts.find(x=>x.id===id)
  assert.ok(q,id)
  q.content.en.answer='Forged change'
  assert.throws(()=>run(Buffer.from(JSON.stringify(changed)),changed),/PHY10_SINGLE_SOURCE_SHA_CHANGED/)
 }
})
test('in-memory forged source with authentic bytes fails closed',()=>{
 const changed=structuredClone(original)
 changed.drafts[0].content.en.answer='Different fabricated content'
 assert.throws(()=>run(bytes,changed),/PHY10_SINGLE_SOURCE_SHA_CHANGED/)
})
test('wrong catalog SHA or approval declaration blocks stale source evidence',()=>{
 for(const mutate of [x=>{x.pdfSha256='0'.repeat(64)},x=>{x.academicApproval=true},x=>{x.edition='some other school edition'}]){
  const r=structuredClone(registry)
  mutate(r.entries.find(x=>x.recordId===original.sourceRecordId))
  assert.throws(()=>run(bytes,original,r),/PHY10_SINGLE_UNAPPROVED_SOURCE_REGISTRY_CHANGED/)
 }
})
test('originally authored explanatory proposal never becomes academic approval',()=>{
 const d=run(),x=d.items[0],readable=markdown(d)
 assert.equal(x.independentReviewerId,null)
 assert.equal(x.approvedRevisionId,null)
 assert.equal(x.originalPrintedExercisePageVerified,false)
 assert.equal(x.schoolAdoptedEditionSessionVerified,false)
 assert.equal(x.qualifiedIndependentSubjectReviewed,false)
 assert.equal(x.academicallyApproved,false)
 assert.equal(x.verifiedPublished,false)
 assert.equal(d.academicallyApproved,0)
 assert.match(readable,/Production HOLD/)
})
