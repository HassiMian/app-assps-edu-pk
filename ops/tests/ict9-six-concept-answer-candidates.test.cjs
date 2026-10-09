'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {build,markdown,ANSWERS,PIN}=require('../qbank/author-ict9-six-concept-answer-candidates.cjs')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/ict9TechStarter2026.json')
const originalBytes=fs.readFileSync(INPUT),original=JSON.parse(originalBytes)
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')))
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const run=(bytes=originalBytes,source=original,reg=registry)=>build({bytes,source,registry:reg})
test('original ICT IX source contains 30 questions and exactly six long rubric-only originals',()=>{
 const d=run()
 assert.equal(sha(originalBytes),PIN)
 assert.equal(d.originalAuthoredResearchQuestions,30)
 assert.equal(d.originalRubricOnlyLongQuestions,6)
 assert.equal(d.newExplanatoryAnswerResearchDrafts,6)
 assert.equal(d.newFiveMarkPointProposals,30)
 assert.equal(Object.keys(ANSWERS).length,6)
 assert.deepEqual(d.items.map(x=>x.questionId),original.drafts.filter(q=>q.type==='long').map(q=>q.id))
 assert.deepEqual(d.items.map(x=>x.chapterNo),[1,2,3,4,5,6])
})
test('each new explanatory answer is distinct from the original rubric and has immutable provenance',()=>{
 const d=run(),byId=new Map(original.drafts.map(q=>[q.id,q]))
 for(const x of d.items){
  const orig=byId.get(x.questionId)
  assert.ok(orig)
  assert.equal(x.sourceQuestionSha256,sha(JSON.stringify(orig)))
  assert.equal(x.sourceAnswerSha256,sha(orig.content.en.answer))
  assert.equal(x.sourceFileSha256,PIN)
  assert.equal(x.catalogSourceId,original.sourceRecordId)
  assert.equal(x.claimedSourcePdfSha256,original.sourcePdfSha256)
  assert.equal(x.marks,5)
  assert.equal(x.topicId,orig.topicId)
  assert.ok(x.proposedIndependentEnglishExplanation.length>=250)
  assert.notEqual(x.proposedIndependentEnglishExplanation,orig.content.en.answer)
  assert.equal(rubricOnlyLongAnswer('long',x.proposedIndependentEnglishExplanation),false)
  assert.equal(x.proposedDistinctMarkingPoints.length,5)
  assert.equal(new Set(x.proposedDistinctMarkingPoints).size,5)
  assert.equal(x.originalQuestionUnchanged,true)
  assert.equal(x.answerLanguage,'English')
  assert.equal(x.catalogMediumVerified,false)
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
test('microcontroller candidate remains conceptual and defers actual electrical equipment to supervised qualified teachers',()=>{
 const d=run(),answer=d.items.find(q=>q.questionId==='IX-ICT-C02-L01').proposedIndependentEnglishExplanation
 assert.match(answer,/input.process.output/i)
 assert.match(answer,/sensor/i)
 assert.match(answer,/qualified teacher/)
 assert.doesNotMatch(answer,/connect the pin|wire to|solder|plug into the socket/i)
})
test('school privacy, copyright, accessible communication and reliable web service concepts are explicitly present',()=>{
 const d=run(),answers=new Map(d.items.map(x=>[x.questionId,x.proposedIndependentEnglishExplanation]))
 assert.match(answers.get('IX-ICT-C01-L01'),/responsible communication/i)
 assert.match(answers.get('IX-ICT-C03-L01'),/permission to use/i)
 assert.match(answers.get('IX-ICT-C04-L01'),/appropriate access controls/i)
 assert.match(answers.get('IX-ICT-C05-L01'),/authorized backup/i)
 assert.match(answers.get('IX-ICT-C06-L01'),/aggregat(e|e school|e school data)|aggregate school/i)
})
test('tampered original long answer and unrelated MCQ invalidate the exact original source SHA',()=>{
 for(const id of ['IX-ICT-C01-L01','IX-ICT-C01-M01']){
  const changed=structuredClone(original),q=changed.drafts.find(q=>q.id===id)
  assert.ok(q,id)
  q.content.en.answer='Changed research answer'
  assert.throws(()=>run(Buffer.from(JSON.stringify(changed)),changed),/ICT9_SOURCE_SHA_CHANGED/)
 }
})
test('forged in-memory question cannot reuse original signed file bytes',()=>{
 const changed=structuredClone(original)
 changed.drafts[0].content.en.answer='Unreviewed altered in-memory source'
 assert.throws(()=>run(originalBytes,changed),/ICT9_SOURCE_SHA_CHANGED/)
})
test('catalog source hash, edition and medium mismatches fail closed rather than claiming a school-approved textbook',()=>{
 for(const update of [
  x=>{x.pdfSha256='0'.repeat(64)},
  x=>{x.medium='English'},
  x=>{x.edition='2026-27'},
  x=>{x.academicApproval=true}
 ]){
  const changed=structuredClone(registry)
  update(changed.entries.find(x=>x.recordId===original.sourceRecordId))
  assert.throws(()=>run(originalBytes,original,changed),/ICT9_UNVERIFIED_CATALOG_IDENTITY_DRIFT/)
 }
})
test('original source catalog has intentionally uncertified medium and no school session rather than invented credentials',()=>{
 const d=run()
 assert.equal(d.sourceCatalogMediumClaim,'UNSPECIFIED_BY_CATALOG_LABEL')
 assert.equal(d.sourceCatalogEditionClaim,'CURRENT_CATALOG_LABEL_NO_SESSION')
 assert.equal(d.humanSchoolSourceVerified,0)
 assert.equal(d.qualifiedHumanAcademicReviewed,0)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('faculty-facing packet accurately describes six unique drafts and blocks academic selection',()=>{
 const d=run(),md=markdown(d)
 assert.match(md,/six new original explanatory answer drafts/)
 assert.match(md,/source.page verified 0/i)
 assert.match(md,/reviewed 0/i)
 assert.match(md,/Paper Studio verified selector remains empty/i)
 assert.ok(d.items.every(x=>x.reviewStatus==='RESEARCH_DRAFT_REQUIRES_SCHOOL_ADOPTION_AND_TEACHER_REVIEW'))
})
