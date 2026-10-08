'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {collectDocuments}=require('../qbank/audit-authoring-crossfile-qa.cjs')
const {assessRecord,auditMcqs}=require('../qbank/audit-mcq-authoring-structure.cjs')
const report=auditMcqs(collectDocuments())
test('real authored question set scans 875 MCQs; 24 legacy textual keys are reconciled, not fabricated',()=>{
 assert.equal(report.totalMcqs,875)
 assert.equal(report.exactTextDerivedLegacyKeys,24)
 assert.equal(report.optionKeyDistribution.A,785)
 assert.equal(report.optionKeyDistribution.B,50)
 assert.equal(report.optionKeyDistribution.C,33)
 assert.equal(report.optionKeyDistribution.D,7)
 assert.equal(Object.values(report.optionKeyDistribution).reduce((a,b)=>a+b,0),875)
})
test('pattern review catches at least one full 8-question same-key run; never silently rebalances or approves',()=>{
 assert.ok(report.predictablePatternFileCount>=1)
 assert.ok(report.filesWithPatterns.some(x=>x.editorialKeyPatterns.some(y=>y.period===1&&y.length>=8)))
 assert.equal(report.autoReorderedOptions,false)
 assert.equal(report.academicallyApproved,0)
 assert.equal(report.published,0)
})
test('flat legacy textbook-inspired grammar questions reconcile exact textual answer, not missing key',()=>{
 const q={type:'mcq',options:['are','was','were','had been'],answer:'were'}
 const x=assessRecord(q)
 assert.equal(x.key,'C')
 assert.equal(x.inferredFromAnswer,true)
 assert.deepEqual(x.flags,[])
})
test('missing, duplicated or contradictory MCQ options are review flags, not automatic approval',()=>{
 const bad={type:'mcq',correctOptionId:'A',content:{en:{answer:'False',options:[{id:'A',text:'True'},{id:'B',text:'True'},{id:'C',text:'Possibly'},{id:'D',text:'Never'}]}}}
 const out=assessRecord(bad)
 assert.ok(out.flags.includes('en:ANSWER_OPTION_TEXT_NOT_EXACT'))
 assert.ok(out.flags.includes('en:DUPLICATE_OR_EMPTY_OPTION'))
})
test('an answer with only terminal punctuation variation does not become a false semantic mismatch',()=>{
 const row={type:'mcq',correctOptionId:'B',content:{en:{answer:'Biochemistry.',options:[{id:'A',text:'Physics'},{id:'B',text:'Biochemistry'},{id:'C',text:'Math'},{id:'D',text:'Geology'}]}}}
 assert.deepEqual(assessRecord(row).flags,[])
})
test('bilingual option cardinality and fixed labels are checked without claiming translation equivalence',()=>{
 const q={type:'mcq',correctOptionId:'B',content:{en:{options:[{id:'A',text:'Sun'},{id:'B',text:'Rain'},{id:'C',text:'Snow'},{id:'D',text:'Wind'}]},ur:{options:[{id:'A',text:'سورج'},{id:'B',text:'بارش'},{id:'C',text:'برف'}]}}}
 const x=assessRecord(q)
 assert.equal(x.langCount,2)
 assert.ok(x.flags.includes('ur:INVALID_OPTION_LENGTH'))
})
