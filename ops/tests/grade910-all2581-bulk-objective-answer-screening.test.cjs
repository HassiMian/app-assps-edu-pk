'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto')
const qa=require('../qbank/audit-grade910-bulk-objective-answer-readiness-20261015.cjs')
const file=qa.OUTPUT
const saved=JSON.parse(fs.readFileSync(file))
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
const q=(answers,opts=['Alpha','Bravo','Charlie','Delta'],key='A')=>({
 type:'mcq',correctOptionId:key,
 content:{en:{stem:'Safe synthetic test?',answer:answers,options:opts.map((text,i)=>({id:'ABCD'[i],text}))}}
})
test('all 2581 source revisions, types and grade/subject cohorts are unchanged by bulk objective QA',()=>{
 assert.equal(saved.originalResearchQuestions,2581)
 assert.equal(saved.mcqQuestions,875)
 assert.equal(saved.sourceFiles,73)
 assert.equal(saved.groups.length,56)
 assert.equal(saved.rows.length,2581)
 assert.equal(new Set(saved.rows.map(r=>r.originalQuestionId)).size,2581)
 assert.equal(saved.QA.originalSourceQuestionRevisionMatches,2581)
 assert.equal(saved.QA.types.mcq,875)
 assert.equal(saved.QA.types.long,564)
 assert.equal(saved.QA.types.short,908)
 assert.equal(saved.QA.types.numerical,91)
 assert.equal(saved.QA.missingPrintedPageClaim,1188)
 assert.equal(saved.QA.longRubricHeuristic,166)
 assert.equal(saved.QA.placeholderHi,16)
 assert.equal(saved.QA.nearStemSuspects,15)
 assert.equal(saved.QA.originalMcqTextualKeyInferred,24)
})
test('all 875 MCQ source stored answer-option relationships are structurally consistent NOT scientifically verified',()=>{
 assert.equal(saved.QA.mcqStructurallyConsistent,875)
 assert.equal(saved.QA.mcqMechanicallyIncomplete,0)
 assert.deepEqual(saved.QA.mechanicalMcqByLanguage,{
  en:{checked:560,consistent:560},ur:{checked:309,consistent:309},
  flat:{checked:24,consistent:24}})
 assert.equal(saved.independentScientificCorrectnessConfirmed,0)
 assert.equal(saved.academicallyApproved,0)
 assert.equal(saved.published,0)
 assert.match(saved.releaseDecision,/HOLD/)
})
test('deterministic checker rejects key disagreement, absent answer, duplicate options and false label',()=>{
 for(const [item,signal] of [
  [q('Bravo',['Alpha','Bravo','Charlie','Delta'],'A'),'DEFINITE_ANSWER_VS_CANONICAL_KEY_CONFLICT'],
  [q('Echo'),'DEFINITE_ANSWER_NOT_AN_OPTION'],
  [q(''),'DEFINITE_EMPTY_STORED_ANSWER'],
  [q('Alpha',['Alpha','Alpha','Charlie','Delta']),'DEFINITE_DUPLICATE_OPTION_TEXT'],
  [q('Alpha',['Alpha','Bravo','Charlie','Delta'],'D'),'DEFINITE_ANSWER_VS_CANONICAL_KEY_CONFLICT']
 ]){
  const v=qa.optionFacts(item)
  assert.ok(v.flags.includes(signal),JSON.stringify({signal,result:v}))
 }
})
test('Hindi empty placeholder is excluded from real bilingual option validation and flagged not renderable',()=>{
 const item=q('Alpha')
 item.content.hi={stem:'',answer:'',options:['','','',''].map((text,i)=>({id:'ABCD'[i],text}))}
 const v=qa.optionFacts(item)
 assert.ok(v.flags.includes('EMPTY_HINDI_PLACEHOLDER_NOT_TO_RENDER'))
 assert.equal(v.checks.length,1)
 assert.equal(v.checks[0].mechanicalOptionConsistency,true)
})
test('publication wall, content privacy and held original remain frozen',()=>{
 const held=saved.rows.filter(x=>x.originalQuestionId==='X-CHEM-C23-L01')
 assert.equal(held.length,1)
 assert.equal(held[0].academicallyApproved,false)
 assert.equal(held[0].published,false)
 assert.equal(held[0].paperStudioSelectable,false)
 assert.ok(saved.rows.every(x=>x.independentlyAuthenticatedSubjectAccuracyReview===false))
 assert.ok(saved.rows.every(x=>x.authenticatedPrintedPageAndBookAdoption===false))
 for(const r of saved.rows)for(const forbidden of ['question','answer','stem','options','staffName','studentName'])
  assert.equal(Object.hasOwn(r,forbidden),false)
})
test('comprehensive saved bulk audit must match exact original-source rescan at current Git HEAD',()=>{
 assert.equal(JSON.stringify(qa.audit()),JSON.stringify(saved))
 assert.match(sha(fs.readFileSync(file)),/^[a-f0-9]{64}$/)
})
