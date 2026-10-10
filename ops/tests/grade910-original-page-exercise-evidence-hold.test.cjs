'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const gate=require('../qbank/attest-grade910-original-page-exercise-evidence.cjs')
const cumulative=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const fresh=()=>gate.loadInputs()
function find(x,id){for(const d of x.documents)for(const q of [...(d.data?.drafts||[]),...(d.data?.items||[])])if(q.id===id)return q;throw Error('MISSING_'+id)}
test('all 2581 source revision linked page claims are research-only and release denied',()=>{
 const a=gate.assertFrozen(fresh())
 assert.equal(a.originalCandidateRevisions,2581)
 assert.equal(a.sourceFiles,73)
 assert.equal(a.positiveSourcePdfPageClaims,1393)
 assert.equal(a.missingOriginalSourcePageClaims,1188)
 assert.equal(a.originalExerciseReferencesClaimed,0)
 assert.equal(a.originalExerciseReferencesMissing,2581)
 assert.equal(a.bilingualPageSourcePairsChecked,48)
 assert.equal(a.independentPrintedPageEvidencePairs,0)
 assert.equal(a.independentExerciseEvidencePairs,0)
 assert.equal(a.actualSchoolEditionPageCertification,false)
 assert.equal(a.academicallyApproved,0)
 assert.equal(a.verifiedPublished,0)
 assert.equal(a.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('source PDF page numbers are not physical printed page or textbook exercise approval',()=>{
 const a=gate.build(fresh())
 const found=a.originalSourcePageAndExerciseResearchQueue.filter(x=>x.claimedPdfPage>0)
 assert.equal(found.length,1393)
 for(const q of found){
  assert.equal(q.independentlyPhysicallyVerified,false)
  assert.equal(q.actualExerciseVerified,false)
  assert.equal(q.printedBookPageEvidence,null)
  assert.equal(q.physicalPageReviewer,null)
  assert.equal(q.revisionApproved,false)
  assert.equal(q.schoolAdoptedEditionVerified,false)
 }
})
test('every original ID and exact source SHA pinned without reproducing original book text',()=>{
 const a=gate.build(fresh()),ids=new Set()
 for(const q of a.originalSourcePageAndExerciseResearchQueue){
  assert.ok(!ids.has(q.originalQuestionId));ids.add(q.originalQuestionId)
  assert.match(q.originalQuestionSha256,/^[a-f0-9]{64}$/)
  assert.match(q.originalSourceFileSha256,/^[a-f0-9]{64}$/)
  for(const forbidden of ['questionText','stem','answer','options','exerciseText','explanation'])
   assert.equal(Object.hasOwn(q,forbidden),false)
 }
 assert.equal(ids.size,2581)
})
test('48 English and Urdu source page pairs have consistent original page/page-list claims',()=>{
 const d=gate.build(fresh())
 const bilingual=d.originalSourcePageAndExerciseResearchQueue.filter(x=>x.languagePages.length)
 assert.equal(bilingual.length,48)
 for(const x of bilingual){
  assert.deepEqual(x.languagePages.map(y=>y.medium),['en','ur'])
  assert.ok(x.languagePages.every(y=>Number.isInteger(y.claimedPdfPage)&&y.claimedPdfPage>0))
  assert.ok(x.languagePages.every(y=>/^[a-f0-9]{64}$/.test(y.claimedPageListSha256)))
  assert.equal(x.claimedPdfPage,x.languagePages[0].claimedPdfPage)
 }
})
test('no source page must be represented as missing, never invented page 1',()=>{
 const a=gate.build(fresh())
 const missing=a.originalSourcePageAndExerciseResearchQueue.filter(q=>q.pageState==='ORIGINAL_PAGE_NOT_CLAIMED')
 assert.equal(missing.length,1188)
 assert.ok(missing.every(q=>q.claimedPdfPage===null))
})
test('negative, zero, fractional and string page numbers are rejected',()=>{
 for(const value of [-1,0,0.5,'12']){
  const q={id:'negative-test',source:{page:value,exerciseRef:null}}
  assert.throws(()=>gate.evaluate(q),/GRADE910_PAGE_INVALID_NONPOSITIVE_OR_NONINTEGER_PAGE_CLAIM/)
 }
})
test('made-up textbook exercise without a claimed PDF source page is rejected',()=>{
 const q={id:'fake-exercise',source:{page:null,exerciseRef:'Exercise 2'}}
 assert.throws(()=>gate.evaluate(q),/GRADE910_PAGE_EXERCISE_WITHOUT_SOURCE_PAGE/)
})
test('bilingual missing second page, fake PDF page list and inconsistent primary page rejected',()=>{
 const q={id:'q',source:{page:3,exerciseRef:null,languages:{en:{page:3,pages:[3],catalogRecordId:'a',pdfSha256:'a'},ur:{page:4,pages:[4],catalogRecordId:'b',pdfSha256:'b'}}}}
 assert.equal(gate.evaluate(q).languagePages.length,2)
 q.source.languages.ur.pages=[1,2]
 assert.throws(()=>gate.evaluate(q),/GRADE910_PAGE_BILINGUAL_PAGE_ARRAY_NOT_CONSISTENT/)
 q.source.languages.ur.pages=[4];q.source.page=9
 assert.throws(()=>gate.evaluate(q),/GRADE910_PAGE_PRIMARY_SOURCE_PAGE_NOT_ENGLISH_CLAIM/)
 delete q.source.languages.ur
 assert.throws(()=>gate.evaluate(q),/GRADE910_PAGE_BILINGUAL_PAGE_SOURCE_INCOMPLETE/)
})
test('original question source-page mutation cannot inherit signed revision identity',()=>{
 const x=fresh(),q=find(x,'IX-BIO-2025-C01-T0101-M01')
 q.source.page=999
 assert.throws(()=>gate.build(x),/ALL875_MCQ_|FULL2581_|GRADE910_PAGE_/)
})
test('original source exercise claim mutation is source-frozen, not automatically textbook verified',()=>{
 const x=fresh(),q=find(x,'IX-BIO-2025-C01-T0101-M01')
 q.source.exerciseRef='Exercise Q1'
 assert.throws(()=>gate.build(x),/ALL875_MCQ_|FULL2581_|GRADE910_PAGE_/)
})
test('forged physical evidence certification is rejected through separate source raw-byte pin',()=>{
 const x=fresh(),obj=JSON.parse(x.physicalBytes)
 obj.academicPageEvidenceCertified=true
 x.physicalBytes=Buffer.from(JSON.stringify(obj,null,2)+'\n')
 assert.throws(()=>gate.build(x),/GRADE910_PAGE_SIGNED_PHYSICAL_PAGE_REGISTRY_RAW_SHA_DRIFT/)
})
test('forged review approval status on frozen file fails exact whole-file manifest SHA',()=>{
 const x=fresh(),j=JSON.parse(fs.readFileSync('docs/question-bank/'+gate.NAME+'.json'))
 j.academicallyApproved=2581
 assert.throws(()=>gate.assertFrozen(x,Buffer.from(JSON.stringify(j,null,2)+'\n')),
   /GRADE910_PAGE_FROZEN_PAGE_EVIDENCE_MANIFEST_CHANGED/)
})
test('all original source documents stay byte-identical after review-intake computation',()=>{
 const x=fresh(),before=JSON.stringify(x.documents)
 gate.build(x)
 assert.equal(JSON.stringify(x.documents),before)
})
test('cumulative original answer draft reconciliation requires physical-page unverified gate',()=>{
 const d=cumulative.reconcile(cumulative.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('faculty reviewer Markdown retains explicit NOT verified page and exercise warnings',()=>{
 const md=gate.markdown(gate.build(fresh()))
 assert.match(md,/1,393/)
 assert.match(md,/1,188/)
 assert.match(md,/source PDF page CLAIMS/i)
 assert.match(md,/0 of 2,581/)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
