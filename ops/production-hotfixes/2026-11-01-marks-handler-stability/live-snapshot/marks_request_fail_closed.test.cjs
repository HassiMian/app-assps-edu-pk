'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const src=fs.readFileSync(__dirname+'/examRoutes.js','utf8')
function createRoute(){
 let handler
 const router={get:()=>{},put:()=>{},delete:()=>{},post:(path,...args)=>{if(path==='/results')handler=args.at(-1)}}
 const required={
  'express':{Router:()=>router},
  '../config/database':{pool:{connect:async()=>{throw Object.assign(new Error('synthetic database outage'),{code:'SYNTHETIC_OUTAGE'})}},query:async(sql)=>String(sql).includes('to_regclass')?{rows:[{table_name:'grade_settings'}],rowCount:1}:({rows:[{label:'D',min_percentage:40,max_percentage:59}],rowCount:1}),applyTenantContext:async()=>{}},
  '../middleware/auth':{protect:()=>{},requireRoles:()=>()=>{},requireScopeForServiceOnly:()=>()=>{},hasServiceScope:()=>false},
  '../middleware/tenant':{tenantClause:async()=>({clause:'',params:[],nextIndex:0}),currentSchoolId:()=>1,hasColumn:async()=>true},
  '../services/examMarksTeacherScope':{isTeacher:()=>false,validateTeacherMarksWrite:()=>{},teacherResultReadScope:()=>({})},
  '../services/assessmentMarksApprovalGate':{validateAssessmentMarksApproval:()=>{}},
  '../services/examMarksInputValidation':{parseExactMarksNumber:Number},
  '../services/examMarksSubjectMaximum':{validatePaperMaxima:()=>{}},
  '../services/examResultStatus':{validateResultState:()=>({status:'SCORED',marks:1})},
  '../services/gradeBandAssignment':{selectGradeBand:()=>{}},
  '../services/nextAssessmentProposal':{proposeNextAssessment:()=>{}},
  '../services/examMutationSafety':{isSequentialAllClassAssessment:()=>false,officialPassMarks:()=>{}},
 }
 const module={exports:{}}
 vm.runInNewContext(src,{module,exports:module.exports,require:(id)=>{assert.ok(id in required,'unknown import '+id);return required[id]},console,process:{env:{}},Number,String,Boolean,Array,Object,Promise,Math,JSON,Error,Set,Map,Date})
 assert.equal(typeof handler,'function')
 return handler
}
async function invoke(body){
 let status=200,reply
 const res={status(n){status=n;return this},json(x){reply=x;return this}}
 await createRoute()({body,user:{id:12,role:'teacher',school_id:1}},res)
 return {status,reply}
}
test('missing request body returns 400 without throwing',async()=>{
 const x=await invoke(undefined);assert.equal(x.status,400);assert.equal(x.reply.success,false)
})
test('JSON null request body returns 400 without throwing',async()=>{
 const x=await invoke(null);assert.equal(x.status,400)
})
test('empty mark submission rejected',async()=>{
 const x=await invoke({results:[]});assert.equal(x.status,400)
})
test('oversized 5001 row batch rejected before DB work',async()=>{
 const x=await invoke({results:Array(5001).fill({})})
 assert.equal(x.status,422);assert.equal(x.reply.code,'RESULT_BATCH_LIMIT_EXCEEDED')
})
test('normal all-class bulk within 5000 is not rejected by size boundary',async()=>{
 const x=await invoke({results:Array(1854).fill({})})
 assert.notEqual(x.reply.code,'RESULT_BATCH_LIMIT_EXCEEDED')
})
test('database pool outage returns controlled 503 without creating a mark',async()=>{
 const x=await invoke({results:[{exam_id:14,student_id:1,subject:'Math',marks_obtained:5,total_marks:20}]})
 assert.equal(x.status,503);assert.equal(x.reply.code,'MARKS_STORAGE_UNAVAILABLE')
})
test('no user id or raw marks debug logging remains',()=>{
 assert.doesNotMatch(src,/ENTERED POST \/results HANDLER/)
 assert.match(src,/MARKS_STORAGE_UNAVAILABLE/)
 assert.match(src,/client = await pool\.connect\(\)/)
})
