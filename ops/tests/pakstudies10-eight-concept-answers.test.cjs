'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {build,markdown,ANSWERS,PIN}=require('../qbank/author-pakstudies10-eight-concept-answer-candidates.cjs')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const P=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/pakistanStudies10Starter2026.json')
const originalBytes=fs.readFileSync(P),original=JSON.parse(originalBytes)
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')))
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const run=(bytes=originalBytes,source=original,reg=registry)=>build({bytes,source,registry:reg})
test('verified exact original file hash: 40 Pakistan Studies X research questions, eight long rubrics and eight drafted answers',()=>{
 const d=run()
 assert.equal(sha(originalBytes),PIN)
 assert.equal(d.originalAuthoredResearchQuestions,40)
 assert.equal(d.originalRubricOnlyLongQuestions,8)
 assert.equal(d.newExplanatoryAnswerResearchDrafts,8)
 assert.equal(d.newFiveMarkPointProposals,40)
 assert.equal(Object.keys(ANSWERS).length,8)
 assert.deepEqual(d.items.map(x=>x.questionId),original.drafts.filter(q=>q.type==='long').map(q=>q.id))
 assert.deepEqual(d.items.map(x=>x.chapterNo),[1,2,3,4,5,6,7,8])
})
test('each original full question/answer/source SHA and separate 5-point guide agree with the unchanged original',()=>{
 const d=run(),byId=new Map(original.drafts.map(q=>[q.id,q]))
 for(const x of d.items){
  const q=byId.get(x.questionId)
  assert.ok(q)
  assert.equal(x.sourceQuestionSha256,sha(JSON.stringify(q)))
  assert.equal(x.sourceAnswerSha256,sha(q.content.en.answer))
  assert.equal(x.sourceFileSha256,PIN)
  assert.equal(x.catalogSourceId,original.sourceRecordId)
  assert.equal(x.claimedSourcePdfSha256,original.sourcePdfSha256)
  assert.equal(x.marks,5)
  assert.equal(x.topicId,q.topicId)
  assert.ok(x.proposedIndependentEnglishExplanation.length>=250)
  assert.notEqual(x.proposedIndependentEnglishExplanation,q.content.en.answer)
  assert.equal(rubricOnlyLongAnswer('long',x.proposedIndependentEnglishExplanation),false)
  assert.equal(x.proposedDistinctMarkingPoints.length,5)
  assert.equal(new Set(x.proposedDistinctMarkingPoints).size,5)
  assert.equal(x.originalQuestionUnchanged,true)
  assert.equal(x.schoolAdoptedEditionSessionVerified,false)
  assert.equal(x.originalPrintedExercisePageVerified,false)
  assert.equal(x.qualifiedIndependentSubjectReviewed,false)
  assert.equal(x.urduEquivalenceReviewed,false)
  assert.equal(x.independentReviewerId,null)
  assert.equal(x.approvedRevisionId,null)
  assert.equal(x.academicallyApproved,false)
  assert.equal(x.verifiedPublished,false)
 }
})
test('constitutional historical facts are distinguishable and consistent with published parliamentary history',()=>{
 const answers=new Map(run().items.map(x=>[x.questionId,x.proposedIndependentEnglishExplanation]))
 const history=answers.get('X-PAKS-C02-L01'),constitution=answers.get('X-PAKS-C03-L01')
 assert.match(history,/1906/)
 assert.match(history,/March 1940/)
 assert.match(history,/August 1947/)
 assert.match(constitution,/1956/)
 assert.match(constitution,/1962/)
 assert.match(constitution,/1973/)
 assert.match(constitution,/1958/)
 assert.match(constitution,/bicameral/)
 assert.match(constitution,/parliamentary/)
})
test('neutrality and inclusive citizenship are present and current officeholder claims are avoided',()=>{
 const answers=new Map(run().items.map(x=>[x.questionId,x.proposedIndependentEnglishExplanation]))
 assert.match(answers.get('X-PAKS-C01-L01'),/diverse views/i)
 assert.match(answers.get('X-PAKS-C05-L01'),/diplomacy/i)
 assert.match(answers.get('X-PAKS-C07-L01'),/Inclusive policies/i)
 assert.match(answers.get('X-PAKS-C08-L01'),/access to justice/i)
 assert.doesNotMatch(JSON.stringify(answers),/current prime minister is|present president is/i)
})
test('original long answer and unrelated short answer mutations invalidate all source-bound answer drafts',()=>{
 for(const id of ['X-PAKS-C03-L01','X-PAKS-C01-S01']){
  const changed=structuredClone(original),q=changed.drafts.find(z=>z.id===id)
  assert.ok(q,id)
  q.content.en.answer='A modified draft that has not been reviewed'
  assert.throws(()=>run(Buffer.from(JSON.stringify(changed)),changed),/PAKS10_SOURCE_SHA_CHANGED/)
 }
})
test('a forged in-memory source is rejected even when raw byte source matches',()=>{
 const changed=structuredClone(original)
 changed.drafts[0].content.en.answer='Forged unreviewed answer'
 assert.throws(()=>run(originalBytes,changed),/PAKS10_SOURCE_SHA_CHANGED/)
})
test('changes to canonical PDF or edition/school approval metadata fail closed',()=>{
 for(const modify of [
  x=>{x.pdfSha256='0'.repeat(64)},
  x=>{x.medium='Urdu'},
  x=>{x.edition='2026-27 confirmed'},
  x=>{x.academicApproval=true}
 ]){
  const altered=structuredClone(registry)
  modify(altered.entries.find(x=>x.recordId===original.sourceRecordId))
  assert.throws(()=>run(originalBytes,original,altered),/PAKS10_UNVERIFIED_CATALOG_IDENTITY_DRIFT/)
 }
})
test('catalog English label cannot be misreported as approved school adoption or book page',()=>{
 const d=run()
 assert.equal(d.sourceCatalogMediumClaim,'English')
 assert.equal(d.sourceCatalogEditionClaim,'CURRENT_CATALOG_LABEL_NO_SESSION')
 assert.equal(d.humanSchoolSourceVerified,0)
 assert.equal(d.qualifiedHumanAcademicReviewed,0)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('faculty-readable review packet clearly keeps independent approval and selection on HOLD',()=>{
 const d=run(),md=markdown(d)
 assert.match(md,/eight new original explanatory answer drafts/i)
 assert.match(md,/actual school adoption/i)
 assert.match(md,/Human source\/page verified 0/i)
 assert.match(md,/Paper Studio verified selector remains empty/i)
 assert.ok(d.items.every(x=>x.reviewStatus==='RESEARCH_DRAFT_REQUIRES_SCHOOL_ADOPTION_AND_TEACHER_REVIEW'))
})
