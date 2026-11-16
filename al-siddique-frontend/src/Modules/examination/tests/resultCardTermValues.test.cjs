'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const file=process.env.A315_RESULT_TEMPLATE_SOURCE || path.resolve(__dirname,'../resultCardTemplates.jsx')
const source=fs.readFileSync(file,'utf8')
function loadPureResultBuilder(){
 const a=source.indexOf('export const DEFAULT_RESULT_OPTIONS')
 const b=source.indexOf('function SchoolNameLines',a)
 const c=source.indexOf('export function buildResultCardData',b)
 const d=source.indexOf('export function ResultCardTemplateSelector',c)
 assert.ok(a>=0&&b>a&&c>b&&d>c,'pure React-free result builder boundaries must be intact')
 const pure=(source.slice(a,b)+'\n'+source.slice(c,d)).replace(/^export /gm,'')
 const gradeModule=fs.readFileSync(path.resolve(__dirname,'../gradePolicy.mjs'),'utf8').replace(/^export /gm,'')
 const ctx={Date}
 vm.createContext(ctx)
 vm.runInContext(gradeModule+'\n'+pure+'\nthis.buildResultCardData=buildResultCardData',ctx,{timeout:5000})
 return ctx.buildResultCardData
}
const build=loadPureResultBuilder()
function result(rows,term='First Term Exam',options={}){
 return build({student:{id:1,name:'Synthetic Academic Test'},exam:{name:term,total_marks:25,session:'2026'},
 studentMarks:rows,options,school:{gradePolicyVerified:true,gradeBands:[
 {label:'A+',from:90,to:100},{label:'A',from:80,to:89},{label:'B',from:70,to:79},
 {label:'C',from:60,to:69},{label:'D',from:40,to:59},{label:'F',from:0,to:39}
 ]}}).result
}
test('single First Term row keeps 20 out of 25, not zero out of 125',()=>{
 const x=result([{subject:'English Oral',marks_obtained:20,total_marks:25}])
 assert.equal(x.obtainedMarks,20)
 assert.equal(x.totalMarks,25)
 assert.equal(x.percentage,80)
 assert.equal(x.subjects[0].firstTermMarks,20)
 assert.equal(x.subjects[0].assessmentMarks,null)
})
test('fractional saved marks are not truncated by bitwise conversion',()=>{
 const x=result([{subject:'Science',marks_obtained:'23.5',total_marks:25}])
 assert.equal(x.obtainedMarks,23.5)
 assert.equal(x.totalMarks,25)
 assert.equal(x.percentage,94)
})
test('explicit camel-case zero is retained over conflicting snake-case alternate',()=>{
 const x=result([{subject:'Urdu Oral',firstTermMarks:0,first_term_marks:24,total_marks:25}])
 assert.equal(x.obtainedMarks,0)
 assert.equal(x.subjects[0].firstTermMarks,0)
 assert.equal(x.percentage,0)
})
test('snake_case first-term value is accepted without other selected term fabrication',()=>{
 const x=result([{subject:'Mathematics Written',first_term_marks:18,total_marks:20}])
 assert.equal(x.obtainedMarks,18)
 assert.equal(x.totalMarks,20)
 assert.equal(x.percentage,90)
})
test('assessment-only row maps to assessment slot with its own maximum',()=>{
 const x=result([{subject:'English',marks_obtained:15,total_marks:20}],'Monthly Assessment 1')
 assert.equal(x.subjects[0].assessmentMarks,15)
 assert.equal(x.totalMarks,20)
 assert.equal(x.percentage,75)
})
test('different subject maximum marks are summed by row rather than assuming 100 each',()=>{
 const x=result([{subject:'English Oral',marks_obtained:20,total_marks:25},{subject:'Science',marks_obtained:45,total_marks:50}])
 assert.equal(x.obtainedMarks,65)
 assert.equal(x.totalMarks,75)
 assert.equal(x.percentage,87)
})
test('multiple genuinely populated terms count only their actual maxima',()=>{
 const x=result([{subject:'English',assessmentMarks:18,firstTermMarks:20,total_marks:25}])
 assert.equal(x.obtainedMarks,38)
 assert.equal(x.totalMarks,50)
 assert.equal(x.percentage,76)
})
test('one absent term remains null, explicit zero remains zero',()=>{
 const x=result([{subject:'English',assessmentMarks:0,firstTermMarks:23,total_marks:25}])
 assert.equal(x.subjects[0].assessmentMarks,0)
 assert.equal(x.subjects[0].secondTermMarks,null)
 assert.equal(x.totalMarks,50)
 assert.equal(x.obtainedMarks,23)
})
test('source never uses bitwise OR to combine mark fields',()=>{
 for(const field of ['assessmentMarks','firstTermMarks','secondTermMarks','thirdTermMarks','finalTermMarks','marks_obtained'])
  assert.doesNotMatch(source,new RegExp('row\\.'+field+'\\s*\\|\\s*row\\.'))
})

test('tenant 40 percent policy yields D/pass instead of hardcoded 50 percent rule',()=>{
 const x=result([{subject:'Biology',marks_obtained:45,total_marks:100,grade:'D'}])
 assert.equal(x.subjects[0].grade,'D')
 assert.equal(x.grade,'D')
 assert.equal(x.passThreshold,40)
 assert.equal(x.gradePolicyVerified,true)
 assert.equal(x.gradeMismatchCount,0)
})
test('stale F recorded against an official D policy triggers manual grade review',()=>{
 const x=result([{subject:'Biology',marks_obtained:45,total_marks:100,grade:'F'}])
 assert.equal(x.subjects[0].grade,'D')
 assert.equal(x.subjects[0].gradeMismatch,true)
 assert.equal(x.gradeMismatchCount,1)
})
test('missing school academic grade bands cannot be treated as verified results',()=>{
 const x=build({student:{id:1},exam:{name:'First Term Exam'},
 studentMarks:[{subject:'English',marks_obtained:45,total_marks:100,grade:'F'}],options:{},school:{}}).result
 assert.equal(x.gradePolicyVerified,false)
 assert.equal(x.passThreshold,null)
 assert.equal(x.grade,'—')
})
