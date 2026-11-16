import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeGradeBands,gradeForPercentage,passingThreshold,gradeDisagreesWithPolicy,mayPrintUnderGradePolicy} from '../gradePolicy.mjs'
const school40=[
 {label:'A+',from:90,to:100},{label:'A',from:80,to:89},
 {label:'B',from:70,to:79},{label:'C',from:60,to:69},
 {label:'D',from:40,to:59},{label:'F',from:0,to:39}
]
const school50=[
 {label:'A+',from:90,to:100},{label:'A',from:80,to:89},
 {label:'B',from:70,to:79},{label:'C',from:60,to:69},
 {label:'D',from:50,to:59},{label:'F',from:0,to:49}
]
test('School 1 40 percent is D/pass and 39 percent F',()=>{
 assert.equal(passingThreshold(school40),40)
 assert.equal(gradeForPercentage(40,school40),'D')
 assert.equal(gradeForPercentage(49,school40),'D')
 assert.equal(gradeForPercentage(39,school40),'F')
})
test('different tenant 50 percent policy must not be silently changed to 40',()=>{
 assert.equal(passingThreshold(school50),50)
 assert.equal(gradeForPercentage(45,school50),'F')
})
test('preserves decimal percentage with floor-compatible classification',()=>{
 assert.equal(gradeForPercentage(89.99,school40),'A')
 assert.equal(gradeForPercentage(40.5,school40),'D')
})
test('detects stale existing grade versus authoritative configured band',()=>{
 assert.equal(gradeDisagreesWithPolicy('F',45,school40),true)
 assert.equal(gradeDisagreesWithPolicy('D',45,school40),false)
 assert.equal(gradeDisagreesWithPolicy(null,45,school40),null)
})
test('unknown or malformed academic policy refuses to claim a pass',()=>{
 for(const bands of [[],null,[{label:'D',from:40,to:59}],[
   {label:'F',from:0,to:39},{label:'D',from:41,to:100}
 ],[
   {label:'F',from:0,to:49},{label:'D',from:40,to:100}
 ]]){
   assert.equal(passingThreshold(bands),null)
   assert.equal(gradeForPercentage(45,bands),null)
 }
})
test('SQL snake-case school grade settings may be normalized',()=>{
 const raw=school40.map(x=>({label:x.label,min_percentage:x.from,max_percentage:x.to}))
 assert.equal(passingThreshold(raw),40)
 assert.equal(normalizeGradeBands(raw).length,6)
})
test('invalid percentages do not produce a grade',()=>{
 for(const n of [-1,101,NaN,Infinity,'invalid'])assert.equal(gradeForPercentage(n,school40),null)
})

test('official grade-policy preflight rejects malformed policy or stale grades',()=>{
 const valid={gradePolicyVerified:true,gradeBands:school40}
 const good=[{result:{gradePolicyVerified:true,gradeMismatchCount:0,totalMarks:25,obtainedMarks:20}}]
 assert.equal(mayPrintUnderGradePolicy(good,valid),true)
 assert.equal(mayPrintUnderGradePolicy(good,{gradePolicyVerified:false,gradeBands:school40}),false)
 assert.equal(mayPrintUnderGradePolicy(good,{gradePolicyVerified:true,gradeBands:[]}),false)
 assert.equal(mayPrintUnderGradePolicy([],valid),false)
 assert.equal(mayPrintUnderGradePolicy([{result:{...good[0].result,gradeMismatchCount:1}}],valid),false)
 assert.equal(mayPrintUnderGradePolicy([{result:{...good[0].result,totalMarks:0}}],valid),false)
})
test('null and missing maxima do not silently become zero',()=>{
 for(const p of [null,undefined,''])assert.equal(gradeForPercentage(p,school40),null)
 for(const altered of [
   school40.map((x,i)=>i===0?{label:x.label,to:x.to}:x),
   school40.map((x,i)=>i===0?{label:x.label,from:null,to:x.to}:x)
 ])assert.equal(passingThreshold(altered),null)
})
test('cannot print negative or over-maximum totals even with valid policy',()=>{
 const policy={gradePolicyVerified:true,gradeBands:school40}
 for(const obtainedMarks of [-2,27,null,undefined,'text']){
  assert.equal(mayPrintUnderGradePolicy([{result:{
   gradePolicyVerified:true,gradeMismatchCount:0,totalMarks:25,obtainedMarks
  }}],policy),false)
 }
})
