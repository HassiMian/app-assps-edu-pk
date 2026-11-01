'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module')
const ts=require('/var/www/apex-connect/node_modules/typescript')
const path=require('node:path').join(__dirname,'source/officialAssessmentGrade.ts')
const raw=fs.readFileSync(path,'utf8')
const result=ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}})
const m=new Module(path);m.filename=path;m.paths=Module._nodeModulePaths(require('node:path').dirname(path));m._compile(result.outputText,path)
const {officialGrade,verifiedBands,approvedAssessmentSubjects}=m.exports
const ok=verifiedBands({success:true,configured:true,data:[
 {label:'A+',from:90,to:100},{label:'A',from:80,to:89},{label:'B',from:70,to:79},
 {label:'C',from:60,to:69},{label:'D',from:40,to:59},{label:'F',from:0,to:39}]})
test('school grade policy accepts exactly all percentage points',()=>assert.equal(ok.length,6))
test('previous 33% / E grading error is removed',()=>{
 assert.equal(officialGrade(33,100,ok),'F')
 assert.equal(officialGrade(40,100,ok),'D')
 assert.equal(officialGrade(50,100,ok),'D')
 assert.equal(officialGrade(20,50,ok),'D')
 assert.equal(officialGrade(45,50,ok),'A+')
 assert.equal(officialGrade(1,50,ok),'F')
})
test('fractional percentages floor as backend helper',()=>{
 assert.equal(officialGrade(39.99,100,ok),'F')
 assert.equal(officialGrade(79.99,100,ok),'B')
 assert.equal(officialGrade(80,100,ok),'A')
})
test('invalid or absent grade configuration fails closed rather than defaulting to legacy bands',()=>{
 assert.deepEqual(verifiedBands({success:true,configured:false,data:ok}),[])
 assert.deepEqual(verifiedBands({success:false,configured:true,data:ok}),[])
 assert.deepEqual(verifiedBands({success:true,configured:true,data:[{label:'E',from:33,to:59}]}),[])
 assert.equal(officialGrade(55,100,[]),'')
 assert.equal(officialGrade(55,0,ok),'')
 assert.equal(officialGrade(105,100,ok),'')
})
const assigned=['English','Math','Science']
const exam={type:'AS',subject_offerings:[{class_name:'One',section:'Yellow',subject:'Math'},
 {class_name:'Two',section:'Blue',subject:'Science'}]}
test('assessment subject picker intersects teacher assignment and approved school subject',()=>{
 assert.deepEqual(approvedAssessmentSubjects(exam,'1','Yellow',assigned),['Math'])
 assert.deepEqual(approvedAssessmentSubjects(exam,'2','Blue',assigned),['Science'])
 assert.deepEqual(approvedAssessmentSubjects(exam,'1','Blue',assigned),[])
 assert.deepEqual(approvedAssessmentSubjects({type:'AS',subject_offerings:[]},'1','Yellow',assigned),[])
})
test('historical non-assessment exams preserve assigned subjects',()=>{
 assert.deepEqual(approvedAssessmentSubjects({type:'FT'},'One','Yellow',assigned),assigned)
 assert.deepEqual(approvedAssessmentSubjects(null,'One','Yellow',assigned),assigned)
})
test('unsectioned academic offering must not impersonate a signed section approval',()=>{
  const emptySection={type:'AS',subject_offerings:[{class_name:'One',section:'',subject:'Math'}]}
  assert.deepEqual(approvedAssessmentSubjects(emptySection,'One','Yellow',assigned),[])
  assert.deepEqual(approvedAssessmentSubjects(emptySection,'One','',assigned),['Math'])
})
