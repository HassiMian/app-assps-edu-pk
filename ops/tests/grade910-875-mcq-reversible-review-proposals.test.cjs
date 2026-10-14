'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const p=require('../qbank/propose-grade910-mcq-reversible-key-balance.cjs')
const cumulative=require('../qbank/reconcile-grade910-answer-coverage-161.cjs')
const {collectDocuments}=require('../qbank/audit-authoring-crossfile-qa.cjs')
const fresh=()=>p.inputs()
const options=q=>q.content&&Object.keys(q.content).some(k=>['en','ur'].includes(k))?Object.entries(q.content).filter(([lang,c])=>['en','ur'].includes(lang)&&Array.isArray(c?.options)).map(([lang,c])=>({language:lang,values:c.options.map(x=>x.text),answer:c.answer})):
 [{language:'en',values:q.options,answer:q.answer}]
function findQuestion(documents,id){
 for(const d of documents){
  for(const q of [...(d.data.drafts||[]),...(d.data.items||[])])
   if(q.id===id)return q
 }
 throw Error('MISSING_QUESTION_'+id)
}
test('all 875 source-pinned original revisions get a reversible, NOT PUBLISHED review proposal',()=>{
 const d=p.assertFrozen(fresh())
 assert.equal(d.sourceOriginalMcqCandidates,875)
 assert.equal(d.structuredOriginalMcqs,851)
 assert.equal(d.legacyOriginalMcqs,24)
 assert.deepEqual(d.originalCorrectKeyCounts,{A:785,B:50,C:33,D:7})
 assert.deepEqual(d.proposedCorrectKeyCounts,{A:219,B:219,C:219,D:218})
 assert.equal(d.allOriginalSourceFilesAndQuestionRevisionsUnchanged,true)
 assert.equal(d.noOriginalOptionOrderOrKeyWritten,true)
 assert.equal(d.onlyUnapprovedReversibleReviewProposals,true)
 assert.equal(d.independentlyReviewedOptionRevisions,0)
 assert.equal(d.academicallyApproved,0)
 assert.equal(d.verifiedPublished,0)
 assert.equal(d.publicationDecision,'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
})
test('ALL proposed 875 index maps are four-element bijections with the SAME original correct answer',()=>{
 const x=fresh(),d=p.build(x),labels=['A','B','C','D']
 const ids=new Set()
 for(const row of d.proposals){
  assert.ok(!ids.has(row.sourceId));ids.add(row.sourceId)
  assert.match(row.originalQuestionSha256,/^[0-9a-f]{64}$/)
  assert.match(row.originalSourceRawSha256,/^[0-9a-f]{64}$/)
  assert.match(row.proposedOptionOrderRevisionSha256,/^[0-9a-f]{64}$/)
  assert.deepEqual([...row.proposedOriginalOptionIndicesInNewLabelOrder].sort(),[0,1,2,3])
  const originalCorrectIndex=labels.indexOf(row.originalAnswerKeyLabel)
  const proposedCorrectIndex=labels.indexOf(row.proposedCorrectAnswerLabel)
  assert.equal(row.proposedOriginalOptionIndicesInNewLabelOrder[proposedCorrectIndex],originalCorrectIndex)
  const q=findQuestion(x.documents,row.sourceId)
  for(const item of options(q)){
   const proposed=item.values.filter((_,i)=>row.proposedOriginalOptionIndicesInNewLabelOrder.includes(i))
   assert.equal(proposed.length,4)
   const reordered=row.proposedOriginalOptionIndicesInNewLabelOrder.map(i=>item.values[i])
   assert.equal(p.normalize(reordered[proposedCorrectIndex]),p.normalize(item.answer))
  }
 }
 assert.equal(ids.size,875)
})
test('18 bilingual structured originals reuse SAME permutation on BOTH languages',()=>{
 const x=fresh(),d=p.build(x)
 const both=d.proposals.filter(q=>q.sourceAnswerAndOptions.length===2)
 assert.equal(both.length,18)
 for(const row of both){
  assert.deepEqual(row.sourceAnswerAndOptions.map(q=>q.language).sort(),['en','ur'])
  const q=findQuestion(x.documents,row.sourceId)
  for(const {values,answer} of options(q)){
   const proposed=row.proposedOriginalOptionIndicesInNewLabelOrder.map(i=>values[i])
   const correct=proposed['ABCD'.indexOf(row.proposedCorrectAnswerLabel)]
   assert.equal(p.normalize(correct),p.normalize(answer))
  }
  assert.equal(row.academicallyApproved,false)
 }
})
test('existing source-pattern QC reports ZERO period-1 to period-4 runs on review proposals',()=>{
 const inspect=require('../qbank/audit-mcq-key-patterns.cjs').inspectMcqs
 const d=p.build(fresh()),byFile=new Map()
 for(const row of d.proposals){
  if(!byFile.has(row.sourceFile))byFile.set(row.sourceFile,[])
  byFile.get(row.sourceFile).push({id:row.sourceId,type:'mcq',
    options:['alpha','beta','gamma','delta'],correctOption:row.proposedCorrectAnswerLabel})
 }
 assert.equal(byFile.size,71)
 assert.equal(d.proposedReviewerOnlyAssignmentSwaps,2)
 assert.equal(d.remainingProposedPerSourcePeriodicKeyPatterns,0)
 for(const questions of byFile.values())
  assert.equal(inspect(questions).findings.filter(f=>f.type==='PREDICTABLE_MCQ_KEY_SEQUENCE').length,0)
})
test('all 24 legacy English MCQs require explicitly approved conversion later, not assumed source key',()=>{
 const x=fresh(),d=p.build(x)
 const legacy=d.proposals.filter(row=>row.originalOptionsSchema==='LEGACY_ENGLISH_STRING_OPTIONS')
 assert.equal(legacy.length,24)
 for(const row of legacy){
  const q=findQuestion(x.documents,row.sourceId)
  assert.equal(q.correctOptionId,undefined)
  const matches=q.options.filter(o=>p.normalize(o)===p.normalize(q.answer))
  assert.equal(matches.length,1)
  assert.equal(row.finalOptionRevisionApproved,false)
  assert.equal(row.independentReviewerId,null)
 }
})
test('six harmless terminal-punctuation Chemistry differences are accepted without silent source edits',()=>{
 const x=fresh(),d=p.build(x),ids=d.proposals.filter(q=>q.sourceFile==='chemistry9Chapter5EnglishDrafts2026.json')
 assert.ok(ids.length>=6)
 const cases=ids.filter(row=>{const q=findQuestion(x.documents,row.sourceId);return q.content?.en?.answer!==q.content?.en?.options?.find(o=>o.id===q.correctOptionId)?.text})
 assert.equal(cases.length,6)
 assert.ok(cases.every(row=>row.academicallyApproved===false))
})
test('repeated generation is deterministic regardless of document order',()=>{
 const x=fresh(),a=p.build(x)
 x.documents.reverse()
 const b=p.build(x)
 assert.deepEqual(a.proposedCorrectKeyCounts,b.proposedCorrectKeyCounts)
 assert.deepEqual(new Map(a.proposals.map(q=>[q.sourceId,q.proposedCorrectAnswerLabel])),
  new Map(b.proposals.map(q=>[q.sourceId,q.proposedCorrectAnswerLabel])))
})
test('reordered editorial proposals do not alter original source document JSON or teacher approval status',()=>{
 const x=fresh(),before=JSON.stringify(x.documents)
 p.build(x)
 assert.equal(JSON.stringify(x.documents),before)
 assert.ok(p.build(x).proposals.every(r=>r.academicallyApproved===false&&
   r.verifiedPublished===false&&r.independentReviewerId===null&&
   r.proposedOptionOrderCheckedByIndependentReviewer===false))
})
test('fake change to in-memory selected correct option cannot inherit original source identity',()=>{
 const x=fresh(),q=findQuestion(x.documents,'IX-AGRI-TECH-ENGLISH-C01-I01')
 q.correctOptionId='D'
 assert.throws(()=>p.build(x),/MCQ_EDITORIAL_|ALL875_MCQ_|MCQ_ORDER_REVIEW_/)
})
test('fake correct answer option text cannot be changed without new revision signoff',()=>{
 const x=fresh(),q=findQuestion(x.documents,'IX-AGRI-TECH-ENGLISH-C01-I01')
 q.content.en.options[0].text='Incorrect silent replacement'
 assert.throws(()=>p.build(x),/MCQ_EDITORIAL_|ALL875_MCQ_|MCQ_ORDER_REVIEW_/)
})
test('duplicate normalized distractor options fail strict quality gate',()=>{
 const q={id:'synthetic',type:'mcq',marks:1,correctOptionId:'A',content:{en:{
  stem:'Test question',answer:'Yes',options:[{id:'A',text:'Yes'},{id:'B',text:'No'},
   {id:'C',text:' no.  '},{id:'D',text:'Maybe'}]}}}
 assert.throws(()=>p.validateQuestion(q),/MCQ_ORDER_REVIEW_ORIGINAL_DISTRACTOR_TEXT_COLLISION/)
})
test('invalid key or wrong correct answer is denied without correcting scientific text',()=>{
 const q={id:'synthetic',type:'mcq',marks:1,correctOptionId:'A',content:{en:{
  stem:'Test question',answer:'Actually NO',options:['Yes','No','Maybe','Unknown'].map((text,i)=>({id:'ABCD'[i],text}))}}}
 assert.throws(()=>p.validateQuestion(q),/MCQ_ORDER_REVIEW_ORIGINAL_ANSWER_AND_KEY_NOT_SEMANTICALLY_LINKED/)
 q.correctOptionId='Z'
 assert.throws(()=>p.validateQuestion(q),/MCQ_ORDER_REVIEW_ORIGINAL_STRUCTURED_KEY_INVALID/)
})
test('unmatched legacy answer and ambiguous legacy answer fail closed',()=>{
 const q={id:'synthetic',type:'mcq',marks:1,options:['One','Two','Three','Four'],answer:'Five'}
 assert.throws(()=>p.validateQuestion(q),/MCQ_ORDER_REVIEW_ORIGINAL_LEGACY_ANSWER_NOT_UNIQUE/)
 q.answer='one';q.options[1]='ONE.'
 assert.throws(()=>p.validateQuestion(q),/MCQ_ORDER_REVIEW_ORIGINAL_LEGACY_DISTRACTORS_NOT_DISTINCT/)
})
test('scientific charge signs are not collapsed by benign punctuation normalization',()=>{
 assert.notEqual(p.normalize('Fe2+'),p.normalize('Fe2-'))
 assert.notEqual(p.normalize('H+'),p.normalize('H'))
 assert.equal(p.normalize('Aerobic respiration.'),p.normalize('aerobic respiration'))
})
test('altered frozen research proposal is rejected by literal original JSON manifest SHA',()=>{
 const b=fs.readFileSync('docs/question-bank/'+p.NAME+'.json'),changed=Buffer.from(b)
 changed[250]^=1
 assert.throws(()=>p.assertFrozen(fresh(),changed),/MCQ_ORDER_REVIEW_FROZEN_TEACHER_REVIEW_PROPOSAL_SHA_CHANGED/)
})
test('publisher research reconciliation invokes full candidate and option review integrity without approval',()=>{
 const q=cumulative.reconcile(cumulative.loadInputs())
 assert.equal(q.distinctOriginalIdsWithSeparateAnswerDrafts,161)
 assert.equal(q.originalAuthoredQuestionCandidates,2581)
 assert.equal(q.academicallyApproved,0)
 assert.equal(q.verifiedPublished,0)
})
test('human-readable report separates proposed key balance and school teacher signoff',()=>{
 const md=p.markdown(p.build(fresh()))
 assert.match(md,/875/)
 assert.match(md,/851/)
 assert.match(md,/24/)
 assert.match(md,/785/)
 assert.match(md,/219/)
 assert.match(md,/teacher review/i)
 assert.match(md,/DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT/)
})
