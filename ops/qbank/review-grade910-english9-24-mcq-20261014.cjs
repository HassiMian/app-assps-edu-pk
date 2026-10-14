#!/usr/bin/env node
'use strict'
// 24 original English IX author-created MCQs: independent model-assisted
// semantic/rule analysis. This is not a qualified human/faculty signoff.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/english9CompetencyOriginals2026.json')
const V2=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ENGLISH9_24_MCQ_INDEPENDENT_AI_ANSWER_REVIEW_20261014.json')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const R=[
['B','Past perfect indicates completion before another past event.'],
['C','First conditional takes present simple in the condition and will plus base verb in the result.'],
['C','Look! describes an action occurring now, requiring present continuous.'],
['B','Past continuous describes the ongoing editing interrupted by lights going out.'],
['C','Since January and an unfinished period support present perfect.'],
['C','By next Friday denotes completion before a future deadline: future perfect.'],
['B','Resilience is the standard noun spelling for the capacity to recover.'],
['B','Relationship is the conventional spelling.'],
['B','Conservation is the correctly spelled noun for protecting nature.'],
['B','Opportunity is spelled with double p followed by ortunity.'],
['B','Fair in a decision means just and impartial, not colour or temporary.'],
['B','Practical guidance is useful or applicable in actual situations.'],
['B','Setbacks are difficulties that delay or obstruct progress.'],
['B','Sustainable means capable of continuing over time.'],
['B','Fragile means easily broken or damaged.'],
['B','Plural possession of several students is written students\' with the apostrophe after s.'],
['C','Reading functions as the subject noun formed from a verb, hence a gerund.'],
['B','Sara becomes she, and am preparing is backshifted to was preparing after said.'],
['B','A semicolon correctly links two complete closely related clauses.'],
['C','Quickly modifies spread and is an adverb.'],
['B','Each is singular, requiring has rather than have.'],
['B','First conditional pairs if+present with will+bare infinitive.'],
['B','Were planted is passive: the seedlings receive the planting action.'],
['C','However is a contrastive conjunctive adverb after the semicolon.']
]
function inspect(){
 const bytes=fs.readFileSync(INPUT),obj=JSON.parse(bytes),list=obj.drafts||obj.questions||obj.items||[]
 const ledger=JSON.parse(fs.readFileSync(V2)),ledgerIds=new Map(ledger.rows.filter(x=>x.signals.includes('MCQ_KEY_ID_NOT_EXPLICIT')).map(x=>[x.originalId,x]))
 const rows=[]
 for(let i=0;i<24;i++){
  const id='IX-ENG-ORIG-20261008-M'+String(i+1).padStart(3,'0')
  const question=list.find(q=>q.id===id),bound=ledgerIds.get(id)
  if(!question||!bound||!Array.isArray(question.options)||question.options.length!==4)throw Error('MISSING_ORIGINAL_OR_EDITION:'+id)
  if(hash(JSON.stringify(question))!==bound.originalRevisionSha256||hash(bytes)!==bound.sourceFileSha256)
   throw Error('ORIGINAL_BYTES_OR_QUESTION_REVISION_CHANGED:'+id)
  const [independentlySelected,reason]=R[i]
  const originalAnswer=String(question.answer||'').trim().toLowerCase()
  const matching=question.options.map((o,j)=>({letter:'ABCD'[j],text:String(o||'')}))
   .filter(o=>o.text.trim().toLowerCase()===originalAnswer)
  if(matching.length!==1||matching[0].letter!==independentlySelected)
   throw Error('INDEPENDENT_SEMANTIC_SELECTION_DISAGREES:'+id)
  rows.push({
   originalId:id,originalRevisionSha256:bound.originalRevisionSha256,originalSourceFileSha256:bound.sourceFileSha256,
   originalStem:question.stem,originalOptions:question.options,
   independentlySelectedOption:independentlySelected,originalAnswerText:question.answer,
   originalAnswerMatchesOneOption:true,explanation:reason,
   reviewerType:'MODEL_ASSISTED_LANGUAGE_RULE_REVIEW_NOT_QUALIFIED_TEACHER',
   textOriginalAndOptionsUnmodified:true,
   schoolTextbookEditionVerified:false,independentQualifiedFacultyReviewed:false,
   curricularSourcePageVerified:false,academicallyApproved:false,published:false
  })
 }
 const selected=rows.reduce((o,r)=>(o[r.independentlySelectedOption]++,o),{A:0,B:0,C:0,D:0})
 if(selected.B!==17||selected.C!==7)throw Error('EXPECTED_KEY_DISTRIBUTION_CHANGED')
 return{
  schemaVersion:'assps-grade910-english9-independent-model-grammar-24-v1',
  sourceSha256:hash(bytes),candidateCount:24,sourceRevisionBoundCount:rows.length,
  independentLanguageReasoningAgreementCount:rows.length,
  selectedKeyCounts:selected,
  qualificationNote:'Explanations and independently selected options are AI-written linguistic judgments. They do not substitute for a qualified teacher, school textbook adoption, publisher verification, original exercise evidence or authenticated signature.',
  qualifiedTeacherApproved:0,academicallyApproved:0,published:0,
  rows
 }
}
function write(){
 const x=inspect()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 return {reviewed:x.candidateCount,agree:x.independentLanguageReasoningAgreementCount,byKey:x.selectedKeyCounts,fileSha256:hash(fs.readFileSync(OUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={inspect,write,OUT}
