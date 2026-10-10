'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const subject=require('../qbank/attest-grade910-original-subject-provenance.cjs')
const adopt=require('../qbank/build-grade910-adoption-evidence-docket.cjs')
const cumulative=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
function clone(x){return structuredClone(x)}
function getQuestion(x,id){
 for(const d of x.documents)for(const q of [...(d.data?.drafts||[]),...(d.data?.items||[])])
  if(q.id===id)return {q,file:d}
 throw Error('NOT_FOUND_'+id)
}
const initial=()=>subject.loadInputs()
test('the entire original 2581 corpus is source-bound with 2537 subject matches and 44 unresolved',()=>{
 const d=subject.assertFrozen(initial())
 assert.equal(d.originalAuthoredCandidateQuestions,2581)
 assert.equal(d.originalSourceFilesChecked,73)
 assert.equal(d.sourceCatalogRegistryRecords,110)
 assert.equal(d.questionSubjectIdMatchesRegisteredCatalogLabel,2537)
 assert.equal(d.questionSubjectIdMissingFromOriginal,44)
 assert.equal(d.sourceSubjectContradictionsAllowed,0)
 assert.equal(d.missingSubjectIdFileCount,1)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('original 44 Grade IX English practice IDs have individual revision and catalog-identity hashes',()=>{
 const d=subject.build(initial()),ids=new Set()
 for(const q of d.missingQuestionLevelSubjectIdentityForTeacherClassification){
  assert.ok(!ids.has(q.originalQuestionId));ids.add(q.originalQuestionId)
  assert.match(q.originalQuestionId,/^IX-ENG-ORIG-20261008-/)
  assert.match(q.originalQuestionRevisionSha256,/^[a-f0-9]{64}$/)
  assert.match(q.originalSourceFileSha256,/^[a-f0-9]{64}$/)
  assert.match(q.registeredSourceRawCatalogSha256,/^[a-f0-9]{64}$/)
  assert.equal(q.claimedCatalogSubject,'English')
  assert.equal(q.proposedEditorialSubjectKeyForHumanVerification,'english')
  assert.equal(q.existingQuestionLevelSubjectId,null)
  assert.equal(q.independentSubjectTeacherId,null)
  assert.equal(q.qualifiedHumanTopicReviewerSigned,false)
  assert.equal(q.schoolAdoptedTextbookIndependentlyCertified,false)
  assert.equal(q.originalAuthoringQuestionModified,false)
  assert.equal(q.academicallyApproved,false)
  assert.equal(q.verifiedPublished,false)
 }
 assert.equal(ids.size,44)
})
test('REPRODUCED false-green: old adoption checker accepts Chemistry source with forged Physics subject ID; new checker rejects',()=>{
 const x=initial(),{q,file}=getQuestion(x,'IX-CHEM-2025-C05-T01-M01')
 const registry=JSON.parse(x.registryBytes)
 const src=registry.entries.find(s=>s.recordId===q.source.catalogRecordId)
 const mutated=clone(q);mutated.curriculum.subjectId='physics'
 const fileDoc={filename:file.file,data:{...file.data,drafts:[mutated]}}
 const old=adopt.analyze({
  documents:[fileDoc],registry,
  adoptions:{schoolBookAndExamYearApplicabilityCertified:false,verifiedAdoptions:[]},
  physical:{academicPageEvidenceCertified:false,verifiedChapterAnchors:[]}
 })
 assert.equal(old.totals.starterDraftQuestions,1)
 assert.throws(()=>subject.checkSubject(mutated,src,file.file),/GRADE910_SUBJECT_SOURCE_SUBJECT_CONTRADICTION/)
})
test('Grade IX Chemistry and a registered Urdu alternate title keep expected canonical subject keys',()=>{
 const x=initial(),registry=JSON.parse(x.registryBytes)
 const chemistry=registry.entries.find(s=>s.subject==='Chemistry')
 const urdu=registry.entries.find(s=>s.subject==='Urdu Quaid-e-Insha')
 assert.equal(subject.checkSubject({curriculum:{subjectId:'chemistry'}},chemistry,'test.json').status,
 'DRAFT_SUBJECT_ID_MATCHES_UNAPPROVED_CATALOG_LABEL')
 assert.equal(subject.checkSubject({curriculum:{subjectId:'urdu'}},urdu,'test.json').status,
 'DRAFT_SUBJECT_ID_MATCHES_UNAPPROVED_CATALOG_LABEL')
})
test('missing subject does not inherit an academic-approved subject; it remains unreviewed',()=>{
 const x=initial(),{q}=getQuestion(x,'IX-ENG-ORIG-20261008-M001')
 const src=JSON.parse(x.registryBytes).entries.find(s=>s.recordId==='pectaa-catalog-004')
 assert.equal(subject.checkSubject(q,src,'english9CompetencyOriginals2026.json').status,
 'QUESTION_LEVEL_SUBJECT_MISSING_NEEDS_QUALIFIED_REVIEW')
})
test('an unknown subject title or an invented subject slug fails closed',()=>{
 const q={id:'test',curriculum:{subjectId:'chemistry'}}
 assert.throws(()=>subject.checkSubject(q,{subject:'Chemistry-AI-FABRICATED'},'test.json'),/GRADE910_SUBJECT_UNKNOWN_UNMAPPED_PUBLISHED_SOURCE_SUBJECT/)
 q.curriculum.subjectId='chemistry-ai-made-up'
 assert.throws(()=>subject.checkSubject(q,{subject:'Chemistry'},'test.json'),/GRADE910_SUBJECT_SOURCE_SUBJECT_CONTRADICTION/)
})
test('mutating the original question-level subject value is rejected by the source revision lock',()=>{
 const x=initial(),{q}=getQuestion(x,'IX-CHEM-2025-C05-T01-M01')
 q.curriculum.subjectId='physics'
 assert.throws(()=>subject.build(x),/FULL2581_|ALL875_MCQ_|GRADE910_SUBJECT_/)
})
test('forged original missing English question subject without a new question revision is rejected',()=>{
 const x=initial(),{q}=getQuestion(x,'IX-ENG-ORIG-20261008-M001')
 q.curriculum={subjectId:'english'}
 assert.throws(()=>subject.build(x),/FULL2581_|ALL875_MCQ_|GRADE910_SUBJECT_/)
})
test('tampering original PDF hash or source record claim rejects provenance despite matching subject title',()=>{
 const x=initial(),{q}=getQuestion(x,'IX-CHEM-2025-C05-T01-M01')
 q.source.pdfSha256='0'.repeat(64)
 assert.throws(()=>subject.build(x),/FULL2581_|ALL875_MCQ_|GRADE910_SUBJECT_/)
})
test('raw published catalog registry changes cannot be silently accepted as verified school adoption',()=>{
 const x=initial();const reg=JSON.parse(x.registryBytes)
 reg.entries[0].subject='Physics';x.registryBytes=Buffer.from(JSON.stringify(reg,null,2)+'\n')
 assert.throws(()=>subject.build(x),/GRADE910_SUBJECT_OFFICIAL_CATALOG_REGISTRY_RAW_SHA_DRIFT/)
})
test('forged review and publication claims in the pinned subject queue fail raw SHA verification',()=>{
 const x=initial(),raw=fs.readFileSync('docs/question-bank/'+subject.NAME+'.json')
 const changed=JSON.parse(raw);changed.academicallyApproved=44
 assert.throws(()=>subject.assertFrozen(x,Buffer.from(JSON.stringify(changed,null,2)+'\n')),
  /GRADE910_SUBJECT_FROZEN_SUBJECT_REVIEW_MANIFEST_RAW_SHA_DRIFT/)
})
test('the evidence report contains question IDs and hashes, not original copyrighted question passages',()=>{
 const d=JSON.parse(fs.readFileSync('docs/question-bank/'+subject.NAME+'.json'))
 assert.equal(d.missingQuestionLevelSubjectIdentityForTeacherClassification.length,44)
 for(const q of d.missingQuestionLevelSubjectIdentityForTeacherClassification){
  for(const banned of ['stem','questionText','options','answer','text','explanation'])
   assert.equal(Object.hasOwn(q,banned),false)
 }
})
test('all inputs are still byte-identical after the read-only provenance attestation',()=>{
 const x=initial(),docs=JSON.stringify(x.documents),reg=Buffer.from(x.registryBytes)
 subject.build(x)
 assert.equal(JSON.stringify(x.documents),docs)
 assert.deepEqual(x.registryBytes,reg)
})
test('academic answer research reconciler requires original source subject queue without allowing verified publication',()=>{
 const d=cumulative.reconcile(cumulative.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('faculty-readable report warns source catalog is not proof of school adoption',()=>{
 const d=subject.build(initial()),md=subject.markdown(d)
 assert.match(md,/2,537/)
 assert.match(md,/44/)
 assert.match(md,/English/)
 assert.match(md,/signed school textbook adoption/i)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
