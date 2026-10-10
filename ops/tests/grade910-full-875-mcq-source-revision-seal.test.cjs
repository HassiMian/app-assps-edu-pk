'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const all=require('../qbank/attest-grade910-all-mcq-source-revisions.cjs')
const previous=require('../qbank/attest-grade910-mcq-editorial-hold.cjs')
const cumulative=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const fresh=()=>all.loadInputs()
const mcqs=q=>[...(q?.drafts||[]),...(q?.items||[])].filter(x=>x.type==='mcq')
function newUnflaggedFile(x){
 const r=previous.build({documents:x.documents})
 const flagged=new Set(r.sourceFileResearchRiskQueue.map(f=>f.originalFile))
 return x.documents.find(x=>mcqs(x.data).length&&!flagged.has(x.file))
}
test('historical RED: old 53-file seal accepts in-memory mutation to one OTHER MCQ with unchanged key',()=>{
 const x=fresh(),old=previous.build({documents:x.documents}),f=newUnflaggedFile(x)
 assert.ok(f)
 const q=mcqs(f.data)[0],part=q.content?.en||q.content?.ur
 part.stem+=' a formerly undetected editorial revision'
 assert.deepEqual(previous.build({documents:x.documents}),old)
 assert.throws(()=>all.build(x),/ALL875_MCQ_SOURCE_DATA_SILENT_IN_MEMORY_REVISION/)
})
test('new sealed roster protects 875 distinct MCQs across 71 source files, including 132 previously unsealed',()=>{
 const d=all.assertFrozen(fresh())
 assert.equal(d.countOfDistinctOriginalMcqResearchCandidates,875)
 assert.equal(d.originalMcqSourceFiles,71)
 assert.equal(d.previousFlaggedMcqSourceFiles,53)
 assert.equal(d.previouslyUnsealedNonflaggedMcqSourceFiles,18)
 assert.equal(d.previouslyUnsealedOriginalMcqQuestionRevisions,132)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('all 875 exact original IDs and revision hashes distinct, no wholesale textbook text in manifest',()=>{
 const d=all.build(fresh())
 const files=d.originalQuestionFiles
 const questions=files.flatMap(f=>f.originalQuestionRevisions)
 assert.equal(questions.length,875)
 assert.equal(new Set(questions.map(x=>x.questionId)).size,875)
 assert.equal(new Set(files.map(x=>x.sourceFile)).size,71)
 for(const f of files){
  assert.match(f.originalRawFileSha256,/^[a-f0-9]{64}$/)
  assert.equal(f.originalQuestionRevisions.length,f.originalCandidateMcqs)
  for(const q of f.originalQuestionRevisions){
   assert.match(q.originalQuestionSha256,/^[a-f0-9]{64}$/)
   assert.equal(q.humanAcademicReviewVerified,false)
   assert.equal(q.academicallyApproved,false)
   assert.equal(q.verifiedPublished,false)
   assert.ok(!Object.hasOwn(q,'stem')&&!Object.hasOwn(q,'options')&&!Object.hasOwn(q,'answer'))
  }
 }
})
test('18 previously unflagged files are verifiably present and have exactly 132 MCQs',()=>{
 const d=all.build(fresh()),rows=d.originalQuestionFiles.filter(f=>!f.originalFileHasPredictableKeyPatterns)
 assert.equal(rows.length,18)
 assert.equal(rows.reduce((n,x)=>n+x.originalCandidateMcqs,0),132)
 assert.ok(rows.some(x=>x.sourceFile==='art10emStarter2026.json'))
 assert.ok(rows.some(x=>x.sourceFile==='biology9Chapter1TopicDrafts.json'))
})
test('real unflagged option-content mutation with SAME answer key fails before reviewer handoff',()=>{
 const x=fresh(),f=newUnflaggedFile(x),q=mcqs(f.data)[0]
 const opts=(q.content?.en||q.content?.ur).options
 const key=q.correctOptionId
 opts.find(o=>o.id!==key).text+=' a silent option edit'
 assert.throws(()=>all.build(x),/ALL875_MCQ_SOURCE_DATA_SILENT_IN_MEMORY_REVISION/)
})
test('real unflagged original answer edit cannot inherit source revision SHA',()=>{
 const x=fresh(),f=newUnflaggedFile(x),q=mcqs(f.data)[0],part=q.content?.en||q.content?.ur
 part.answer+=' another unauthorized correct answer'
 assert.throws(()=>all.build(x),/ALL875_MCQ_SOURCE_DATA_SILENT_IN_MEMORY_REVISION|MCQ_EDITORIAL_KNOWN_CANDIDATE_BASELINE_OR_RISK_DRIFT/)
})
test('unflagged source packet raw-byte tamper rejected without any real file writes',()=>{
 const x=fresh(),f=newUnflaggedFile(x)
 const src=path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
 const changed=Buffer.from(fs.readFileSync(path.join(src,f.file)));changed[0]^=1
 x.originalFileBytes[f.file]=changed
 assert.throws(()=>all.build(x),/ALL875_MCQ_ORIGINAL_SOURCE_JSON_INVALID/)
})
test('original unflagged source raw whitespace edit with unchanged in-memory content is still a NEW revision',()=>{
 const x=fresh(),f=newUnflaggedFile(x)
 const src=path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
 x.originalFileBytes[f.file]=Buffer.concat([fs.readFileSync(path.join(src,f.file)),Buffer.from(' ')])
 const current=all.build(x),saved=JSON.parse(fs.readFileSync('docs/question-bank/'+all.NAME+'.json'))
 assert.notDeepEqual(current,saved)
 assert.throws(()=>all.assertFrozen(x),/ALL875_MCQ_ORIGINAL_MCQ_REVISION_OR_SOURCE_BYTES_CHANGED/)
})
test('in-memory question ID duplicate in a previously unflagged source cannot be accepted',()=>{
 const x=fresh(),f=newUnflaggedFile(x),qs=mcqs(f.data)
 assert.ok(qs.length>=2)
 qs[1].id=qs[0].id
 assert.throws(()=>all.build(x),/ALL875_MCQ_SOURCE_DATA_SILENT_IN_MEMORY_REVISION/)
})
test('original flagged source option mutation still rejects by inherited source integrity',()=>{
 const x=fresh(),risk=previous.build({documents:x.documents})
 const f=x.documents.find(d=>d.file===risk.sourceFileResearchRiskQueue[0].originalFile)
 const q=mcqs(f.data)[0]
 const option=(q.content?.en||q.content?.ur).options[0]
 option.text+=' unexpected source revision'
 assert.throws(()=>all.build(x),/MCQ_EDITORIAL_SOURCE_AND_AUDIT_SNAPSHOT_DISAGREE|MCQ_EDITORIAL_KNOWN_CANDIDATE_BASELINE_OR_RISK_DRIFT/)
})
test('source collection with repeated file identity is always rejected',()=>{
 const x=fresh();x.documents.push(x.documents[0])
 assert.throws(()=>all.build(x),/ALL875_MCQ_INVALID_OR_DUPLICATED_SOURCE_COLLECTION|MCQ_EDITORIAL_DUPLICATE_DOCUMENT_FILE/)
})
test('saved manifest cannot be edited even when all original source files are intact',()=>{
 const orig=fs.readFileSync('docs/question-bank/'+all.NAME+'.json')
 const bytes=Buffer.from(orig);bytes[60]^=1
 assert.throws(()=>all.assertFrozen(fresh(),{frozenBytes:bytes}),/ALL875_MCQ_FROZEN_SOURCE_ROSTER_RAW_SHA_DRIFT/)
})
test('original input documents stay byte-identical under read-only full-corpus attestation',()=>{
 const x=fresh(),original=JSON.stringify(x.documents)
 all.build(x)
 assert.equal(JSON.stringify(x.documents),original)
})
test('full Grade IX-X research reconciliation requires all 875 MCQ source revisions',()=>{
 const report=cumulative.reconcile(cumulative.loadInputs())
 assert.equal(report.originalAuthoredQuestionCandidates,2581)
 assert.equal(report.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(report.academicallyApproved,0)
 assert.equal(report.verifiedPublished,0)
})
test('human-readable report explicitly avoids equating hashes with teacher review',()=>{
 const md=all.markdown(all.build(fresh()))
 assert.match(md,/875/)
 assert.match(md,/132/)
 assert.match(md,/human review/i)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
