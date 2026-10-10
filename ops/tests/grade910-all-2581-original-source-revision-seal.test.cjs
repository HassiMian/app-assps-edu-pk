'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const all=require('../qbank/attest-grade910-all-original-candidate-revisions.cjs')
const prior=require('../qbank/attest-grade910-all-mcq-source-revisions.cjs')
const cumulative=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
function input(){return all.loadInputs()}
const urdu='urdu9LiteratureStarter2026.json'
function mutateDocument(x,file,mutation){
 const d=x.documents.find(z=>z.file===file)
 assert.ok(d)
 mutation(d.data.drafts)
}
test('reproduces RED: former 875-MCQ check allowed source-independent mutation of a real Urdu Literature short-answer candidate',()=>{
 const x=input()
 const original=prior.assertFrozen({documents:x.documents})
 mutateDocument(x,urdu,d=>{d[0].content.ur.stem+=' اضافی غیر منظور شدہ الفاظ'})
 assert.deepEqual(prior.assertFrozen({documents:x.documents}),original)
 assert.throws(()=>all.build(x),/FULL2581_ORIGINAL_SOURCE_OR_IN_MEMORY_REVISION_DRIFT/)
})
test('all 2,581 original question IDs frozen across exactly 73 source files, no approvals',()=>{
 const d=all.assertFrozen(input())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.distinctOriginalIds,2581)
 assert.equal(d.originalAuthoredFiles,73)
 assert.equal(d.filesPreviouslyMcqSourceFrozen,71)
 assert.equal(d.newlyFrozenUrduLiteratureFiles,2)
 assert.equal(d.newlyFrozenUrduLiteratureQuestionRevisions,117)
 assert.equal(d.sourceByteIntegrity,true)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.productionImportApproved,false)
 assert.equal(d.releaseDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('each original question revision and source byte fingerprint present; no copyrighted question content duplicated',()=>{
 const d=all.build(input()),questions=d.files.flatMap(f=>f.originalQuestionRevisions)
 assert.equal(questions.length,2581)
 assert.equal(new Set(questions.map(q=>q.originalQuestionId)).size,2581)
 assert.equal(new Set(d.files.map(f=>f.originalAuthoredFile)).size,73)
 for(const f of d.files){
  assert.match(f.originalFileSha256,/^[0-9a-f]{64}$/)
  assert.equal(f.originalQuestionCount,f.originalQuestionRevisions.length)
  for(const q of f.originalQuestionRevisions){
   assert.match(q.originalQuestionRevisionSha256,/^[0-9a-f]{64}$/)
   assert.ok(q.originalQuestionId)
   assert.equal(q.academicallyApproved,false)
   assert.equal(q.published,false)
   assert.equal(q.independentAcademicQuestionReviewVerified,false)
   assert.equal(q.originalEditionExercisePageSchoolAdoptionVerified,false)
   assert.ok(!Object.hasOwn(q,'stem')&&!Object.hasOwn(q,'answer')&&!Object.hasOwn(q,'options'))
  }
 }
})
test('the only two previously uncovered source files are Grade IX and X Urdu Literature with exactly 117 originals',()=>{
 const d=all.build(input())
 const uncovered=d.files.filter(f=>!f.inherited875McqFileFreeze)
 assert.deepEqual(uncovered.map(f=>f.originalAuthoredFile),[
  'urdu10LiteratureStarter2026.json','urdu9LiteratureStarter2026.json'])
 assert.equal(uncovered.reduce((s,f)=>s+f.originalQuestionCount,0),117)
 assert.equal(uncovered.find(f=>f.originalAuthoredFile===urdu).originalQuestionCount,57)
})
test('in-memory Urdu Literature long-answer explanation cannot inherit verified source revision',()=>{
 const x=input()
 mutateDocument(x,'urdu10LiteratureStarter2026.json',a=>{
  const q=a.find(q=>q.type==='long')
  assert.ok(q)
  q.content.ur.answer+=' اضافی متن'
 })
 assert.throws(()=>all.build(x),/FULL2581_ORIGINAL_SOURCE_OR_IN_MEMORY_REVISION_DRIFT/)
})
test('raw Urdu Literature original file content tamper fails source identity without disk changes',()=>{
 const x=input(),file=urdu
 const actual=path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging',file)
 const altered=Buffer.from(fs.readFileSync(actual))
 altered[0]^=1;x.rawOverrides[file]=altered
 assert.throws(()=>all.build(x),/FULL2581_ORIGINAL_SOURCE_JSON_INVALID/)
})
test('raw whitespace-only source byte change is a revision and fails its known SHA',()=>{
 const x=input(),file=urdu
 const actual=path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging',file)
 x.rawOverrides[file]=Buffer.concat([fs.readFileSync(actual),Buffer.from(' ')])
 assert.throws(()=>all.build(x),/FULL2581_PREVIOUSLY_UNSEALED_ORIGINAL_SOURCE_HASH_DRIFT/)
})
test('in-memory replacement of Urdu Grade X original question ID cannot inflate or silently replace original corpus',()=>{
 const x=input()
 mutateDocument(x,'urdu10LiteratureStarter2026.json',a=>{a[0].id='X-URDU-LIT-FABRICATED'})
 assert.throws(()=>all.build(x),/FULL2581_ORIGINAL_SOURCE_OR_IN_MEMORY_REVISION_DRIFT/)
})
test('authored file enabling production import is never silently accepted',()=>{
 const x=input()
 x.documents.find(d=>d.file===urdu).data.liveImportAllowed=true
 assert.throws(()=>all.build(x),/FULL2581_ORIGINAL_CANDIDATES_INCORRECTLY_PUBLICATION_ENABLED/)
})
test('the predecessor 875-MCQ SHA gate still rejects even a changed option in an already frozen MCQ-bearing source',()=>{
 const x=input(),d=x.documents.find(y=>y.file==='chemistry9Chapter11EnglishDrafts2026.json')
 const q=d.data.drafts.find(q=>q.type==='mcq')
 q.content.en.options[0].text+=' change'
 assert.throws(()=>all.build(x),/MCQ_EDITORIAL_|ALL875_MCQ_/)
})
test('saved 2,581-question source roster rejects changed original metadata even without touching input',()=>{
 const b=fs.readFileSync('docs/question-bank/'+all.NAME+'.json'),changed=Buffer.from(b)
 changed[140]^=1
 assert.throws(()=>all.assertFrozen(input(),changed),/FULL2581_FROZEN_MANIFEST_RAW_SHA_DRIFT/)
})
test('all original records and approval-only published counts are preserved exactly',()=>{
 const x=input(),before=JSON.stringify(x.documents)
 all.assertFrozen(x)
 assert.equal(JSON.stringify(x.documents),before)
 assert.equal(all.build(x).qualifiedIndependentReviewerSignatures,0)
 assert.equal(all.build(x).independentAdoptedTextbookAndPrintedPageCertification,false)
})
test('the four Urdu Biology proposals remain separate and cannot become original approved seed records',()=>{
 const d=all.build(input()),bio=d.files.find(x=>x.originalAuthoredFile==='biology9TopicResearchDrafts.json')
 assert.ok(bio)
 assert.equal(bio.originalQuestionCount,6)
 assert.equal(bio.originalQuestionRevisions.length,6)
})
test('existing grade IX-X 161-answer reconciliation now requires complete original corpus preservation',()=>{
 const d=cumulative.reconcile(cumulative.loadInputs())
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('faculty-readable version includes original 43 historical papers as nonblocking content, and release hold',()=>{
 const md=all.markdown(all.build(input()))
 assert.match(md,/43 historical papers/)
 assert.match(md,/Paper Workspace/)
 assert.match(md,/117/)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
