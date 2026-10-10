'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const writer=require('../qbank/author-biology9-four-urdu-parity-drafts.cjs')
const preview=require('../qbank/attest-biology9-urdu-four-preview.cjs')
const audit=require('../qbank/audit-bilingual-structural-parity.cjs')
const corpus=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
function inputs(){return preview.loadInputs()}
test('four genuine missing-Urdu Grade IX Biology original IDs receive separately authored unreviewed drafts',()=>{
 const d=writer.build(writer.loadInputs())
 assert.equal(d.newlyDraftedSeparateUrduCandidateRevisions,4)
 assert.equal(d.originalQuestionRecordsRetained,6)
 assert.equal(d.originalEmptyUrduFieldsRetained,4)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(new Set(d.rows.map(x=>x.originalQuestionId)).size,4)
 assert.deepEqual(d.rows.map(x=>x.originalQuestionId),['IX-BIO-EM-RESEARCH-C01-T0101-S01','IX-BIO-EM-RESEARCH-C01-T0101-S02','IX-BIO-EM-RESEARCH-C01-T0101-S03','IX-BIO-EM-RESEARCH-C01-T0101-S04'])
})
test('all Urdu drafts have original revision hashes and no forged qualified reviewer approval',()=>{
 const d=writer.build(writer.loadInputs())
 for(const row of d.rows){
  assert.match(row.sourceOriginalQuestionRevisionSha256,/^[a-f0-9]{64}$/)
  assert.match(row.sourceEnglishStemAnswerSha256,/^[a-f0-9]{64}$/)
  assert.match(row.proposedUrduRevisionSha256,/^[a-f0-9]{64}$/)
  assert.ok(row.unreviewedUrduStem.length>30)
  assert.ok(row.unreviewedUrduAnswer.length>30)
  assert.equal(row.qualifiedIndependentBiologyReviewed,false)
  assert.equal(row.qualifiedIndependentUrduReviewed,false)
  assert.equal(row.englishUrduMeaningParityIndependentlyReviewed,false)
  assert.equal(row.actualTextbookEditionSchoolAdoptionVerified,false)
  assert.equal(row.independentReviewerId,null)
  assert.equal(row.approvalRevisionId,null)
  assert.equal(row.academicallyApproved,false)
  assert.equal(row.published,false)
 }
})
test('original 54 bilingual source records unchanged while IN-MEMORY preview structurally passes all 54',()=>{
 const x=inputs()
 const before=JSON.stringify(x.documents)
 const originalAudit=audit.audit(x.documents)
 assert.equal(originalAudit.structuralPass,50)
 assert.equal(originalAudit.structuralFail,4)
 const d=preview.attest(x)
 assert.equal(d.structurallyCompleteOnlyInMemoryPreview,54)
 assert.equal(d.inheritedOriginalMissingUrduStemAnswerRecords,4)
 assert.equal(d.originalBilingualSourceUnchanged,true)
 assert.equal(d.originalUnreviewedUrduFieldsStillEmpty,4)
 assert.equal(d.grammarScientificAndTranslationParityHumanValidated,false)
 assert.equal(d.academicallyApproved,0)
 assert.equal(JSON.stringify(x.documents),before)
})
test('original research seed English and blank Urdu are still exact source-locked raw bytes',()=>{
 const x=inputs()
 assert.equal(writer.sha(x.original.bytes),'d7afb8f8feda76162600ff7b8e3c09cb38e4dc51d9862dd321898f8e5749372a')
 const records=x.original.original.drafts.filter(q=>q.content?.ur?.stem==='')
 assert.equal(records.length,4)
 assert.ok(records.every(q=>q.content.ur.answer===''))
})
test('changed original English answer invalidates the source revision and preview',()=>{
 const x=inputs()
 x.original.original.drafts[0].content.en.answer+=' forged academic result'
 assert.throws(()=>preview.attest(x),/BIO9_URDU_PARITY_ORIGINAL_PARSED_SOURCE_DRIFT/)
})
test('tampered original source bytes invalidates ALL translations',()=>{
 const x=inputs();x.original.bytes=Buffer.from(x.original.bytes);x.original.bytes[41]^=1
 assert.throws(()=>preview.attest(x),/BIO9_URDU_PARITY_ORIGINAL_SOURCE_SHA_DRIFT/)
})
test('changed proposed Urdu stem is rejected by the immutable manifest SHA',()=>{
 const x=inputs(),f=JSON.parse(x.manifestBytes)
 f.rows[0].unreviewedUrduStem+=' غیر مصدقہ اضافہ'
 x.manifestBytes=Buffer.from(JSON.stringify(f,null,2)+'\n')
 assert.throws(()=>preview.attest(x),/BIO9_URDU_PREVIEW_PROPOSED_URDU_REVISION_CHANGED/)
})
test('invented academic reviewer/approved flags do not bypass manifest pin',()=>{
 const x=inputs(),f=JSON.parse(x.manifestBytes)
 f.rows[0].academicallyApproved=true
 x.manifestBytes=Buffer.from(JSON.stringify(f,null,2)+'\n')
 assert.throws(()=>preview.attest(x),/BIO9_URDU_PREVIEW_PROPOSED_URDU_REVISION_CHANGED/)
})
test('original missing-Urdu or model answer changes cannot be passed off as approved source',()=>{
 const x=inputs()
 const doc=x.documents.find(d=>d.file==='biology9TopicResearchDrafts.json')
 doc.data.drafts[0].content.ur.answer='پہلے سے جائزہ شدہ جواب'
 assert.throws(()=>preview.attest(x),/BIO9_URDU_PREVIEW_MISSING_OR_CHANGED_ORIGINAL_DOCUMENT/)
})
test('drop one of the real bilingual original records rejects metadata-only completion',()=>{
 const x=inputs()
 const doc=x.documents.find(d=>d.file==='biology9TopicResearchDrafts.json')
 doc.data.drafts.splice(0,1)
 assert.throws(()=>preview.attest(x),/BIO9_URDU_PREVIEW_PREVIEW_ORIGINAL_BILINGUAL_RESEARCH_BASE_DRIFT/)
})
test('new Urdu candidates stay separate, while printed-page and edition adoption remain unverified',()=>{
 const d=writer.build(writer.loadInputs())
 assert.ok(d.rows.every(q=>Number.isInteger(q.sourcePageClaimNotPhysicallyVerified)))
 assert.equal(d.schoolSourcePageVerified,0)
 assert.equal(d.qualifiedIndependentReviewed,0)
 assert.equal(d.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('full Academic cumulative research audit remains zero academic approval and unchanged 161 original IDs',()=>{
 const d=corpus.reconcile(corpus.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('Urdu reviewer docket includes all four authorship revisions and explicit review warning',()=>{
 const d=writer.build(writer.loadInputs())
 const md=writer.markdown(d)
 assert.equal((md.match(/Unreviewed Urdu question/g)||[]).length,4)
 assert.match(md,/qualified Urdu teacher/i)
 assert.match(md,/Release DENY/)
})
