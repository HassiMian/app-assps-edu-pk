'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {build,markdown,ANSWERS,PIN}=require('../qbank/author-fashion9-nine-long-answer-candidates.cjs')
const {rubricOnlyLongAnswer}=require('../../al-siddique-backend/src/services/grade910ModelAnswerPolicy')
const ROOT=path.resolve(__dirname,'../..'),IN=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/fashionDesigning9TechStarter2026.json')
const bytes=fs.readFileSync(IN),source=JSON.parse(bytes)
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')))
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const run=(b=bytes,s=source,r=registry)=>build({bytes:b,source:s,registry:r})
test('all original Fashion IX 36 candidates contain 9 long with 7 marks, yielding 9 new answers and 63 separate marking criteria',()=>{
 const d=run()
 assert.equal(sha(bytes),PIN)
 assert.equal(d.originalAuthoredResearchQuestions,36)
 assert.equal(d.originalRubricOnlyLongQuestions,9)
 assert.equal(d.newExplanatoryAnswerResearchDrafts,9)
 assert.equal(d.newSevenMarkPointProposals,63)
 assert.equal(Object.keys(ANSWERS).length,9)
 assert.deepEqual(d.items.map(x=>x.questionId),source.drafts.filter(x=>x.type==='long').map(x=>x.id))
 assert.ok(d.items.every(x=>x.marks===7&&x.proposedDistinctMarkingPoints.length===7))
})
test('every original question, original answer and full source SHA matches and full explanatory response differs from rubric',()=>{
 const d=run(),byId=new Map(source.drafts.map(q=>[q.id,q]))
 for(const x of d.items){
  const q=byId.get(x.questionId)
  assert.ok(q)
  assert.equal(x.sourceQuestionSha256,sha(JSON.stringify(q)))
  assert.equal(x.sourceAnswerSha256,sha(q.content.en.answer))
  assert.equal(x.sourceFileSha256,PIN)
  assert.equal(x.catalogSourceId,source.sourceRecordId)
  assert.equal(x.claimedSourcePdfSha256,source.sourcePdfSha256)
  assert.equal(x.chapterNo,q.chapter.number)
  assert.equal(x.topicId,q.topicId)
  assert.equal(x.marks,q.marks)
  assert.ok(x.proposedIndependentEnglishExplanation.length>=250)
  assert.notEqual(x.proposedIndependentEnglishExplanation,q.content.en.answer)
  assert.equal(rubricOnlyLongAnswer('long',x.proposedIndependentEnglishExplanation),false)
  assert.equal(x.proposedDistinctMarkingPoints.length,7)
  assert.equal(new Set(x.proposedDistinctMarkingPoints).size,7)
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
test('creative concepts prioritize function and personal expression without harmful body judgments',()=>{
 const d=run(),map=new Map(d.items.map(x=>[x.questionId,x.proposedIndependentEnglishExplanation]))
 assert.match(map.get('IX-FASH-C01-L01'),/without implying that any physical appearance is superior/)
 assert.match(map.get('IX-FASH-C03-L01'),/not the value of anyone.s body/i)
 assert.match(map.get('IX-FASH-C06-L01'),/without needing to judge or compare/i)
 assert.match(map.get('IX-FASH-C07-L01'),/no academic requirement to present an idealized body/i)
 assert.match(map.get('IX-FASH-C08-L01'),/comfort/i)
})
test('sewing workspace guidance is non-procedural and explicitly defers machines to trained supervision',()=>{
 const a=run().items.find(x=>x.questionId==='IX-FASH-C09-L01').proposedIndependentEnglishExplanation
 assert.match(a,/teacher supervision/)
 assert.match(a,/qualified person/)
 assert.doesNotMatch(a,/thread a needle|machine dial|attach a presser foot|sewing machine speed/i)
})
test('changing a flagged original answer or unrelated MCQ invalidates exact file provenance',()=>{
 for(const id of ['IX-FASH-C01-L01','IX-FASH-C01-M01']){
  const s=structuredClone(source),q=s.drafts.find(x=>x.id===id)
  assert.ok(q,id)
  q.content.en.answer='Altered research draft'
  assert.throws(()=>run(Buffer.from(JSON.stringify(s)),s),/FASH9_SOURCE_SHA_CHANGED/)
 }
})
test('a forged in-memory source is not equivalent to its pinned original bytes',()=>{
 const s=structuredClone(source)
 s.drafts[0].content.en.answer='Unapproved changed answer'
 assert.throws(()=>run(bytes,s),/FASH9_SOURCE_SHA_CHANGED/)
})
test('unverified edition 2025, unspecified medium, catalog PDF SHA or approval flip fails closed',()=>{
 for(const modify of [
  x=>{x.edition='2026-27 certified'},x=>{x.medium='English'},x=>{x.pdfSha256='0'.repeat(64)},x=>{x.academicApproval=true}
 ]){
  const r=structuredClone(registry)
  modify(r.entries.find(x=>x.recordId===source.sourceRecordId))
  assert.throws(()=>run(bytes,source,r),/FASH9_UNVERIFIED_CATALOG_IDENTITY_DRIFT/)
 }
})
test('actual book medium is not inferred from independently drafted English answers',()=>{
 const d=run()
 assert.equal(d.sourceCatalogMediumClaim,'UNSPECIFIED_BY_CATALOG_LABEL')
 assert.equal(d.sourceCatalogEditionClaim,'2025')
 assert.equal(d.humanSchoolSourceVerified,0)
 assert.equal(d.qualifiedHumanAcademicReviewed,0)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('faculty packet is explicitly source-unapproved and production blocked',()=>{
 const d=run(),md=markdown(d)
 assert.match(md,/nine new original explanatory answer drafts/i)
 assert.match(md,/63 new distinct marking criteria/i)
 assert.match(md,/Human source\/page verified 0/)
 assert.match(md,/Paper Studio verified selector remains empty/)
 assert.ok(d.items.every(x=>x.reviewStatus==='RESEARCH_DRAFT_REQUIRES_FASHION_IX_ADOPTION_AND_INDEPENDENT_REVIEW'))
})
