'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const gate=require('../qbank/attest-biology9-visual-source-page7-11.cjs')
const aggregate=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const fresh=()=>gate.loadInputs()
const get=(x,id)=>{
 for(const d of x.documents)
  for(const q of [...(d.data?.drafts||[]),...(d.data?.items||[])])
   if(q.id===id)return q
 throw Error('NOT_FOUND:'+id)
}
test('two genuinely observed original official-hash PDF scan pages bind exactly eight original questions',()=>{
 const r=gate.assertFrozen(fresh())
 assert.equal(r.grade,9)
 assert.equal(r.subject,'Biology')
 assert.equal(r.sourceCatalogId,'pectaa-catalog-009')
 assert.equal(r.sourcePdfPageCount,180)
 assert.equal(r.actualScannedPdfPagesVisuallyObservedByAI,2)
 assert.equal(r.originalQuestionRevisionsLinkedToVisuallyObservedSourcePages,8)
 assert.deepEqual(r.pages.map(x=>x.pdfPageIndex),[7,11])
 assert.deepEqual(r.pages.map(x=>x.printedPageNumberObservedVisuallyByAI),[7,11])
 assert.deepEqual(r.pages.map(x=>x.originalQuestionCount),[5,3])
 assert.equal(r.academicallyApproved,0)
 assert.equal(r.verifiedPublished,0)
 assert.equal(r.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('render fingerprints match exact frozen visual observations without copyrighted full-page copies',()=>{
 const r=gate.assertFrozen(fresh())
 assert.equal(r.pages[0].scannedPageRenderedJpegSha256,
  'bf927237b0b57d3071d56eb452e18ebac91d86523dcac54f732f786019fbd687')
 assert.equal(r.pages[1].scannedPageRenderedJpegSha256,
  'ac483cad415d9a4585240e34736480041f2be47f840ea1d70602942ee96d09fe')
 assert.ok(r.pages.every(p=>p.chapterHeaderObservedVisually==='THE SCIENCE OF BIOLOGY'))
 assert.ok(r.pages[0].shortTopicLabelsObserved.includes('Genetics'))
 assert.ok(r.pages[1].shortTopicLabelsObserved.includes('Horticulture'))
 assert.equal(r.cachedPdfPageTextLayer,'IMAGE_ONLY_NO_TEXT_LAYER')
})
test('all eight exact original source revisions are unchanged and none becomes approved',()=>{
 const x=fresh(),r=gate.build(x),items=r.pages.flatMap(p=>p.questions),ids=new Set()
 assert.equal(items.length,8)
 for(const q of items){
  assert.ok(!ids.has(q.originalQuestionId));ids.add(q.originalQuestionId)
  assert.match(q.originalQuestionRevisionSha256,/^[a-f0-9]{64}$/)
  assert.match(q.originalSourceFileSha256,/^[a-f0-9]{64}$/)
  assert.equal(q.originallyClaimedBilingualSource,!!get(x,q.originalQuestionId).source.languages)
  assert.equal(q.humanScientificAnswerAndLanguageParityApproved,false)
  assert.equal(q.actualBookAdoptionVerified,false)
  assert.equal(q.actualTextbookExerciseVerified,false)
  assert.equal(q.academicallyApproved,false)
  assert.equal(q.verifiedPublished,false)
  for(const prohibited of ['stem','questionText','options','answer','exerciseText'])
   assert.equal(Object.hasOwn(q,prohibited),false)
 }
 assert.equal(ids.size,8)
})
test('original cached PDF source hash is proven only as research identity, not school edition adoption',()=>{
 const r=gate.build(fresh())
 assert.equal(r.officialCachedSourcePdfSha256,'f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5')
 assert.equal(r.schoolAdoptedTextbookEditionAuthenticated,false)
 assert.equal(r.actualSchoolPhysicalBookAndExercisePageCertified,false)
 assert.equal(r.humanIndependentAcademicReviewerSignatures,0)
 assert.equal(r.originalExerciseQuestionMappingsIndependentlyVerified,0)
})
test('changing original Biology candidate source page fails closed',()=>{
 const x=fresh();get(x,'IX-BIO-2025-C01-T0101-M01').source.page=11
 assert.throws(()=>gate.build(x),/ALL875_MCQ_|FULL2581_|BIOLOGY9_VISUAL_PAGE_/)
})
test('changing original Biology long scientific stem fails source-bound revision freeze',()=>{
 const x=fresh();get(x,'IX-BIO-2025-C01-T0101-L01').content.en.stem+=' Unverified addition'
 assert.throws(()=>gate.build(x),/ALL875_MCQ_|FULL2581_|BIOLOGY9_VISUAL_PAGE_/)
})
test('in-memory forged qualified review or approval on source manifest does not survive full-file SHA',()=>{
 const x=fresh(),f=JSON.parse(fs.readFileSync('docs/question-bank/'+gate.NAME+'.json'))
 f.academicallyApproved=8
 assert.throws(()=>gate.assertFrozen(x,Buffer.from(JSON.stringify(f,null,2)+'\n')),
  /BIOLOGY9_VISUAL_PAGE_FROZEN_VISUAL_OBSERVATION_RAW_SHA_CHANGED/)
})
test('CLI cached PDF renderer must require explicit PDF and module paths, not silently assume cached page proof',async()=>{
 await assert.rejects(gate.verifyCachedPdf({}),/BIOLOGY9_VISUAL_PAGE_CACHED_PDF_AND_RENDERER_MODULE_PATHS_REQUIRED/)
})
test('fake cached PDF bytes cannot authenticate visual page evidence',async()=>{
 await assert.rejects(gate.verifyCachedPdf({
  pdfFile:'not-needed',
  pdfjsModuleFile:'missing-module',
  canvasModuleFile:'missing-canvas',
  readBytes:Buffer.from('fake academic PDF')}),/BIOLOGY9_VISUAL_PAGE_CACHED_BIOLOGY9_OFFICIAL_PDF_SHA_MISMATCH/)
})
test('inspection does not mutate any original research source document',()=>{
 const x=fresh(),original=JSON.stringify(x.documents)
 gate.build(x)
 assert.equal(JSON.stringify(x.documents),original)
})
test('existing cumulative proposal gate requires eight page source observation identities without approval',()=>{
 const x=aggregate.reconcile(aggregate.loadInputs())
 assert.equal(x.originalAuthoredQuestionCandidates,2581)
 assert.equal(x.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(x.academicallyApproved,0)
 assert.equal(x.verifiedPublished,0)
})
test('readable report truthfully separates actual PDF visuals and absent teacher-verified exercises',()=>{
 const md=gate.markdown(gate.build(fresh()))
 assert.match(md,/visually inspected/i)
 assert.match(md,/printed page numbers 7 and 11/i)
 assert.match(md,/not independently teacher-reviewed/i)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
