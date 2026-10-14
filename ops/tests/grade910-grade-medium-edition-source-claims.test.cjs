'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const gate=require('../qbank/attest-grade910-grade-medium-edition-claims.cjs')
const cumulative=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const read=()=>gate.loadInputs()
const specimen=(x,id)=>{
 for(const d of x.documents)for(const q of [...(d.data.drafts||[]),...(d.data.items||[])])
  if(q.id===id)return q
 throw Error('NOT_FOUND_'+id)
}
const record=(x,id)=>JSON.parse(x.registryBytes).entries.find(q=>q.recordId===id)
test('source pinned all 2581 originals and exactly 1135 source-eligibility reviews, no human approvals',()=>{
 const d=gate.assertFrozen(read())
 assert.equal(d.originalQuestionResearchCandidates,2581)
 assert.equal(d.originalSourceFiles,73)
 assert.equal(d.originalQuestionRevisionsNeedingEvidenceReview,1135)
 assert.equal(d.noClaimedApplicabilityDefectsInCatalogComparison,1446)
 assert.equal(d.observedFlagsCanOverlap,true)
 assert.equal(d.academicallyApproved,undefined)
 assert.equal(d.independentlyReviewedAndApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('honest source grade, medium, edition categories separate causes without double-counting question IDs',()=>{
 const d=gate.build(read())
 assert.equal(d.gradeUnresolved,114)
 assert.equal(d.mediumUnresolved,408)
 assert.equal(d.mediumDualReview,48)
 assert.equal(d.mediumWithoutOriginalClaim,50)
 assert.equal(d.mediumCatalogUnspecified,310)
 assert.equal(d.editionDisagreement,477)
 assert.equal(d.editionCatalogNonExplicit,877)
 assert.equal(d.preexistingGradeEnglishMissing,44)
 assert.equal(d.sharedGradeZeroUrduGrammarOriginals,70)
 assert.equal(new Set(d.candidateReviewQueue.map(q=>q.originalQuestionId)).size,1135)
})
test('70 shared Urdu grammar originals are grade-0 source scope, NOT grade 9 or grade 10 certified',()=>{
 const d=gate.build(read())
 const shared=d.candidateReviewQueue.filter(x=>x.originalCatalogRecordId==='pectaa-catalog-107')
 assert.equal(shared.length,70)
 assert.ok(shared.every(x=>x.catalogGradeLabel===0))
 assert.ok(shared.every(x=>x.independentReviewFlags.includes('REGISTERED_SOURCE_GRADE_UNSPECIFIED_SHARED_SCOPE')))
 assert.equal(new Set(shared.map(x=>x.originalGradeClaim)).size,2)
})
test('44 English practice original questions do not inherit a fictitious grade 9 certification',()=>{
 const d=gate.build(read())
 const english=d.candidateReviewQueue.filter(x=>x.originalFile==='english9CompetencyOriginals2026.json')
 assert.equal(english.length,44)
 assert.ok(english.every(q=>q.originalGradeClaim===null))
 assert.ok(english.every(q=>q.independentReviewFlags.includes('MISSING_OR_INVALID_QUESTION_GRADE')))
 assert.ok(english.every(q=>q.independentReviewFlags.includes('ORIGINAL_QUESTION_MEDIUM_MISSING')))
})
test('48 original bilingual Biology questions have separately hashed source-language claims, NOT teacher parity approval',()=>{
 const x=read(),d=gate.build(x)
 const bilingual=d.candidateReviewQueue.filter(x=>x.independentReviewFlags.includes('BOTH_LANGUAGE_CATALOG_CLAIMS_PRESENT_INDEPENDENT_PARITY_UNREVIEWED'))
 assert.equal(bilingual.length,48)
 const q=specimen(x,bilingual[0].originalQuestionId)
 const src=record(x,q.source.catalogRecordId)
 assert.equal(gate.classify(q,src,new Map(JSON.parse(x.registryBytes).entries.map(s=>[s.recordId,s]))).medium,
  'BOTH_LANGUAGE_CATALOG_CLAIMS_PRESENT_INDEPENDENT_PARITY_UNREVIEWED')
 assert.equal(d.independentlyReviewedAndApproved,0)
})
test('catalog unspecified medium labels are NOT a verified Urdu or English edition',()=>{
 const d=gate.build(read())
 const unresolved=d.candidateReviewQueue.filter(q=>q.independentReviewFlags.includes('CATALOG_LABEL_MEDIUM_UNSPECIFIED'))
 assert.equal(unresolved.length,310)
 assert.ok(unresolved.every(q=>q.catalogMediumLabel==='UNSPECIFIED_BY_CATALOG_LABEL'))
})
test('explicit Grade IX candidate against Grade X textbook catalog is denied fail closed',()=>{
 const q={id:'synthetic-grade',curriculum:{grade:9,edition:'2026-27'},medium:'english'}
 const src={recordId:'example',grade:10,medium:'English',subject:'Mathematics',edition:'2026-27'}
 assert.throws(()=>gate.classify(q,src,new Map()),/GRADE910_APPLICABILITY_EXPLICIT_GRADE_CONTRADICTION/)
})
test('explicit Urdu candidate against English-only catalog record cannot be silently accepted',()=>{
 const q={id:'synthetic-medium',curriculum:{grade:9,edition:'2026-27'},medium:'urdu'}
 const src={recordId:'example',grade:9,medium:'English',subject:'Chemistry',edition:'2026-27'}
 assert.throws(()=>gate.classify(q,src,new Map()),/GRADE910_APPLICABILITY_EXPLICIT_SOURCE_MEDIUM_CONTRADICTION/)
})
test('missing or invalid separate bilingual catalog identities reject language certification',()=>{
 const x=read(),q=structuredClone(specimen(x,'IX-BIO-2025-C01-T0101-M01'))
 const registry=new Map(JSON.parse(x.registryBytes).entries.map(s=>[s.recordId,s]))
 const src=registry.get(q.source.catalogRecordId)
 delete q.source.languages.ur
 assert.throws(()=>gate.classify(q,src,registry),/GRADE910_APPLICABILITY_DUAL_ORIGINAL_WITHOUT_SEPARATE_LANGUAGE_CLAIMS/)
 q.source.languages.ur={catalogRecordId:'pectaa-catalog-009',pdfSha256:src.pdfSha256}
 assert.throws(()=>gate.classify(q,src,registry),/GRADE910_APPLICABILITY_INVALID_DUAL_LANGUAGE_SOURCE_CLAIMS/)
})
test('catalog edition disagreement is research quarantine, not approval or auto-rewrite',()=>{
 const q={id:'test',curriculum:{grade:9,edition:'2025-26'},medium:'english'}
 const source={recordId:'public',grade:9,medium:'English',subject:'Mathematics',edition:'2026-27'}
 const a=gate.classify(q,source,new Map())
 assert.equal(a.edition,'DRAFT_AND_CATALOG_EDITION_LABEL_DISAGREE')
 assert.equal(a.catalogEditionSessionExplicit,true)
 assert.equal(a.draftEditionMatchesCatalogLabel,false)
})
test('legacy non-session catalog edition labels never certify 2026-27 textbook adoption',()=>{
 const q={id:'test',curriculum:{grade:9,edition:'CURRENT_CATALOG_LABEL_NO_SESSION'},medium:'english'}
 const source={grade:9,medium:'English',edition:'CURRENT_CATALOG_LABEL_NO_SESSION'}
 const a=gate.classify(q,source,new Map())
 assert.equal(a.edition,'CATALOG_EDITION_NOT_SESSION_EXPLICIT')
 assert.equal(a.catalogEditionSessionExplicit,false)
})
test('individual 1135 review IDs remain exactly bound to original source and question hashes',()=>{
 const x=read(),d=gate.build(x)
 for(const row of d.candidateReviewQueue){
  assert.match(row.originalQuestionSha256,/^[a-f0-9]{64}$/)
  assert.match(row.originalFileSha256,/^[a-f0-9]{64}$/)
  assert.match(row.originalCatalogSourceSha256,/^[a-f0-9]{64}$/)
  assert.ok(row.independentReviewFlags.length>=1)
  assert.equal(row.signedSchoolTextbookAdoptionVerified,false)
  assert.equal(row.actualPhysicalExercisePageVerified,false)
  assert.equal(row.independentQualifiedReviewerId,null)
  assert.equal(row.approvedQuestionRevisionId,null)
  assert.equal(row.academicallyApproved,false)
  assert.equal(row.verifiedPublished,false)
  for(const key of ['stem','options','questionText','answer','explanation'])
   assert.equal(Object.hasOwn(row,key),false)
 }
})
test('attempted source grade, edition or medium mutation cannot inherit original source hashes',()=>{
 for(const change of [
  q=>{q.curriculum.grade=10},
  q=>{q.curriculum.edition='FICTITIOUS_ADOPTED_2027'},
  q=>{q.medium='urdu'}
 ]){
  const x=read()
  const q=specimen(x,'IX-CHEM-2025-C05-T01-M01')
  change(q)
  assert.throws(()=>gate.build(x),/FULL2581_|ALL875_MCQ_|GRADE910_APPLICABILITY_/)
 }
})
test('registry byte modifications and fabricated source metadata fail pinned trusted catalog gate',()=>{
 const x=read(),bytes=Buffer.from(x.registryBytes)
 bytes[130]^=1;x.registryBytes=bytes
 assert.throws(()=>gate.build(x),/GRADE910_APPLICABILITY_PUBLIC_CATALOG_RAW_BYTES_CHANGED/)
})
test('serialized review queue metadata cannot be changed to forge teacher approval',()=>{
 const x=read(),b=Buffer.from(fs.readFileSync('docs/question-bank/'+gate.NAME+'.json'))
 b[180]^=1
 assert.throws(()=>gate.assertFrozen(x,b),/GRADE910_APPLICABILITY_FROZEN_REVIEW_QUEUE_RAW_SHA_DRIFT/)
})
test('checking all original metadata never changes any of the source candidates',()=>{
 const x=read(),before=JSON.stringify(x.documents)
 gate.build(x)
 assert.equal(JSON.stringify(x.documents),before)
})
test('current cumulative Academic Answer QA denies verified publication regardless of source catalog matching',()=>{
 const report=cumulative.reconcile(cumulative.loadInputs())
 assert.equal(report.originalAuthoredQuestionCandidates,2581)
 assert.equal(report.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(report.academicallyApproved,0)
 assert.equal(report.verifiedPublished,0)
})
test('reviewer readable report states counts overlap and requires actual school evidence',()=>{
 const md=gate.markdown(gate.build(read()))
 assert.match(md,/1,135/)
 assert.match(md,/114/)
 assert.match(md,/408/)
 assert.match(md,/477/)
 assert.match(md,/877/)
 assert.match(md,/overlap/i)
 assert.match(md,/school/i)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
