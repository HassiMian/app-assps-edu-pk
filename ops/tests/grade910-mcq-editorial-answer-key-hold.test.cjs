'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const risk=require('../qbank/attest-grade910-mcq-editorial-hold.cjs')
const original=require('../qbank/audit-mcq-authoring-structure.cjs')
const reconcile=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const input=()=>risk.loadInputs()
const question=(id,key)=>({id,type:'mcq',correctOptionId:key,content:{en:{
 stem:'A distinct test question '+id+'?',answer:'Option '+key,
 options:['A','B','C','D'].map(k=>({id:k,text:'Option '+k}))}}})
test('875 real authored MCQs now expose 53 key patterns as first-class aggregate flags',()=>{
 const d=original.auditMcqs(input().documents)
 assert.equal(d.totalMcqs,875)
 assert.deepEqual('ABCD'.split('').map(k=>d.optionKeyDistribution[k]),[785,50,33,7])
 assert.equal(d.predictablePatternFileCount,53)
 assert.equal(d.predictableKeyPatternCount,53)
 assert.equal(d.flagCount,54)
 assert.equal(d.globalCorrectKeyConcentrationRequiresReview,true)
 assert.equal(d.independentMcqEditorialReviewRequired,true)
 assert.equal(d.academicallyVerifiedMcqSelectionReady,false)
 assert.equal(d.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('53 sequential pattern warnings and one global concentration warning appear in aggregate samples',()=>{
 const r=original.auditMcqs(input().documents)
 assert.equal(r.flagSamples.length,54)
 assert.equal(r.flagSamples.filter(x=>x.code==='PREDICTABLE_MCQ_KEY_SEQUENCE').length,53)
 assert.equal(r.flagSamples.filter(x=>x.code==='EXCESSIVE_GLOBAL_CORRECT_OPTION_CONCENTRATION').length,1)
})
test('immutable source-bound risk manifest reports research-only status and no approvals',()=>{
 const d=risk.assertFrozen(input())
 assert.equal(d.originalMcqCandidateCount,875)
 assert.equal(d.sourceFilesWithPatternConcern,53)
 assert.equal(d.identifiedPredictableKeySequences,53)
 assert.equal(d.totalEditorialReviewFlags,54)
 assert.equal(d.academicallyVerifiedMcqsApproved,0)
 assert.equal(d.publishedMcqs,0)
 assert.equal(d.schoolTextbookAdoptionAndOriginalExercisePageVerified,false)
 assert.equal(d.noAutomaticOptionsReordered,true)
 assert.equal(d.noOriginalQuestionDataChanged,true)
 assert.equal(d.releaseDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('all 53 original affected sources carry individual raw file sha and unresolved reviewer status',()=>{
 const d=risk.build(input())
 assert.equal(new Set(d.sourceFileResearchRiskQueue.map(x=>x.originalFile)).size,53)
 for(const f of d.sourceFileResearchRiskQueue){
  assert.match(f.originalFileSha256,/^[a-f0-9]{64}$/)
  assert.ok(f.candidateMcqs>=8)
  assert.ok(f.editorialPatterns.length>=1)
  assert.equal(f.approved,false)
  assert.equal(f.published,false)
  for(const q of f.editorialPatterns){
   assert.ok(q.firstQuestionId&&q.lastQuestionId)
   assert.ok(q.length>=8)
   assert.equal(q.academicCorrectnessDetermined,false)
   assert.equal(q.qualifiedReviewerDecision,null)
  }
 }
})
test('read-only source inspector does not change original question keys, stems or options',()=>{
 const x=input(),before=JSON.stringify(x.documents.slice(0,20))
 risk.build(x)
 assert.equal(JSON.stringify(x.documents.slice(0,20)),before)
})
test('eight synthetic consecutive A keys become an explicit editorial risk',()=>{
 const docs=[{file:'synthetic.json',data:{drafts:Array.from({length:8},(_,i)=>question('Q'+i,'A'))}}]
 const d=original.auditMcqs(docs)
 assert.equal(d.totalMcqs,8)
 assert.equal(d.predictablePatternFileCount,1)
 assert.equal(d.predictableKeyPatternCount,1)
 assert.equal(d.flagCount,1)
 assert.equal(d.globalCorrectKeyConcentrationRequiresReview,false)
})
test('four balanced options do not create fictitious editorial findings or academic approval',()=>{
 const docs=[{file:'synthetic.json',data:{drafts:'ABCD'.split('').map((key,i)=>question('K'+i,key))}}]
 const d=original.auditMcqs(docs)
 assert.equal(d.flagCount,0)
 assert.equal(d.independentMcqEditorialReviewRequired,false)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.academicallyVerifiedMcqSelectionReady,false)
})
test('forty A keys correctly generate both a local sequence warning and a global concentration warning',()=>{
 const docs=[{file:'synthetic.json',data:{drafts:Array.from({length:40},(_,i)=>question('Q'+i,'A'))}}]
 const d=original.auditMcqs(docs)
 assert.equal(d.globalCorrectKeyConcentrationRequiresReview,true)
 assert.equal(d.predictableKeyPatternCount,1)
 assert.equal(d.flagCount,2)
})
test('in-memory source MCQ answer edit fails the exact editorial source snapshot gate',()=>{
 const x=input(),flagged=risk.build(x).sourceFileResearchRiskQueue[0]
 const d=x.documents.find(y=>y.file===flagged.originalFile)
 d.data.drafts[0].correctOptionId='D'
 assert.throws(()=>risk.build(x),/MCQ_EDITORIAL_KNOWN_CANDIDATE_BASELINE_OR_RISK_DRIFT|MCQ_EDITORIAL_SOURCE_AND_AUDIT_SNAPSHOT_DISAGREE/)
})
test('injected raw source byte edit rejected without touching real original files',()=>{
 const x=input(),flagged=risk.build(x).sourceFileResearchRiskQueue[0]
 const p=require('node:path'),dir=p.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
 const bytes=fs.readFileSync(p.join(dir,flagged.originalFile)),altered=Buffer.from(bytes)
 altered[0]^=1
 x.originalFileBytes={[flagged.originalFile]:altered}
 assert.throws(()=>risk.build(x),/MCQ_EDITORIAL_ORIGINAL_SOURCE_FILE_INVALID_JSON|MCQ_EDITORIAL_SOURCE_AND_AUDIT_SNAPSHOT_DISAGREE/)
})
test('tampered saved manifest is denied by its immutable byte SHA',()=>{
 const b=fs.readFileSync('docs/question-bank/'+risk.NAME+'.json'),changed=Buffer.from(b)
 changed[90]^=1
 assert.throws(()=>risk.assertFrozen(input(),{manifestBytes:changed}),/MCQ_EDITORIAL_FROZEN_MANIFEST_RAW_SHA_DRIFT/)
})
test('original risk source report does not reproduce copyrighted textbook or question text',()=>{
 const saved=JSON.parse(fs.readFileSync('docs/question-bank/'+risk.NAME+'.json'))
 assert.equal(saved.sourceFileResearchRiskQueue.length,53)
 for(const f of saved.sourceFileResearchRiskQueue)
  assert.ok(!Object.hasOwn(f,'stem')&&!Object.hasOwn(f,'answer')&&!Object.hasOwn(f,'options'))
})
test('cumulative 161-ID research reconciliation now requires the MCQ editorial safety HOLD',()=>{
 const d=reconcile.reconcile(reconcile.loadInputs())
 assert.equal(d.originalAuthoredQuestionCandidates,2581)
 assert.equal(d.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
})
test('readable editorial docket discloses observed real A key concentration and denies publication',()=>{
 const md=risk.markdown(risk.build(input()))
 assert.match(md,/875/)
 assert.match(md,/785/)
 assert.match(md,/89\.7%/)
 assert.match(md,/53/)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
