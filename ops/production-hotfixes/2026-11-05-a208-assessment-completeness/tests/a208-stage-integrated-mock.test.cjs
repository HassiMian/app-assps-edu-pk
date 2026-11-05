'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const src=fs.readFileSync(require('node:path').join(__dirname,'../schoolAcademicCatalogRoutes.review-candidate.js'),'utf8')
const routes={},gets={};const router={get:(p,...args)=>gets[p]=args.at(-1),post:(p,...args)=>routes[p]=args.at(-1)}
const seen=[]
const roster=['Five|Blue','Flyer|Pink','Four|Blue','Mover|Purple','Nine|Fatima','Nine|Usman','One|Yellow','Pre Nine|Blue','Seven|Blue','Six|Blue','Starter|Blue','Three|Red','Two|Orange'].map(s=>{const [class_name,section]=s.split('|');return{class_name,section}})
const verified=['Five|Blue','Four|Blue','Nine|Fatima','Nine|Usman','Pre-Nine|Blue','Seven|Blue','Six|Blue'].map(s=>{const[class_name,section]=s.split('|');return{class_name,section,subject:'English'}})
const client={async query(sql){sql=String(sql);seen.push(sql)
 if(sql.includes('FROM exams WHERE id=$1'))return{rows:[{id:14,name:'Assessment 1',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8}],rowCount:1}
 if(sql.includes('FROM grade_settings'))return{rows:[{max_percentage:39}],rowCount:1}
 if(sql.includes('SELECT DISTINCT a.class_name'))return{rows:verified,rowCount:verified.length}
 if(sql.includes('SELECT DISTINCT s.class AS class_name'))return{rows:roster,rowCount:roster.length}
 if(sql.includes('SELECT id FROM users WHERE'))return{rows:[{id:5}],rowCount:1}
 if(sql.includes('SELECT approval_status,COUNT(*)'))return{rows:[],rowCount:0}
 if(/^(BEGIN|COMMIT|ROLLBACK)/.test(sql))return{rows:[],rowCount:0}
 if(sql.includes('pg_advisory_xact_lock'))return{rows:[{ok:1}],rowCount:1}
 throw Error('Unexpected mock-only SQL: '+sql.slice(0,75))
},release(){}}
const imports={
 './schoolAcademicApprovalCore':{protect:()=>{},id:v=>Number(v)||0,withApproval:(_req,_res,fn)=>fn(client,{school:1,uid:5}),audit:()=>{throw Error('WRITE_NOT_ALLOWED')}},
 express:{Router:()=>router},
 '../config/database':{pool:{connect:async()=>client},applyTenantContext:async()=>{}},
 '../middleware/auth':{requireRoles:()=>()=>{}},
 '../services/academicClassKey':{sqlCanonicalClass:s=>s},
 '../services/lessonOriginalSourceReview':{reviewOriginalLessonSources:()=>{}},
 '../services/academicWriterReadinessService':{inspectSignedAcademicWriter:()=>({})},
 '../services/gradeDiscrepancyReview':{parseFilters:()=>{},expectedGradeSQL:()=>{},summaryRows:()=>{},mismatchHint:()=>{},summarizeMismatchHints:()=>{}},
}
const scope={require:name=>{if(!Object.hasOwn(imports,name))throw Error('Unmocked import '+name);return imports[name]},module:{exports:{}},console}
vm.runInNewContext(src,scope,{timeout:2500})
const proposal=scope.module.exports.proposedCatalogForTests
const illegalWrites=()=>seen.filter(x=>/\b(INSERT|DELETE|UPDATE|ALTER|DROP|TRUNCATE)\b/i.test(x))
test('proposed catalog runtime finds exact six missed class-sections',async()=>{
 seen.length=0;const r=await proposal(client,1,14)
 assert.equal(r.cohorts,7);assert.equal(r.totalActiveCohorts,13);assert.equal(r.uncoveredCohorts.length,6)
 assert.equal(illegalWrites().length,0)
})
test('actual stage handler refuses incomplete catalog before any SQL write',async()=>{
 seen.length=0;const r=await routes['/assessment-catalog/:examId/stage']({params:{examId:14}},{})
 assert.equal(r.error,'ASSESSMENT_COHORT_COVERAGE_INCOMPLETE')
 assert.equal(r.status,409)
 assert.equal(illegalWrites().length,0)
})
test('authenticated preview describes six missing cohorts; no approval or write',async()=>{
 seen.length=0
 const reply={statusCode:200,status(code){this.statusCode=code;return this},json(data){this.response=data;return this}}
 await gets['/assessment-catalog/:examId/preview']({user:{id:5,school_id:1,role:'principal'},school_id:1,params:{examId:'14'}},reply)
 assert.equal(reply.response?.success,true)
 assert.equal(reply.response?.data?.uncoveredCohorts?.length,6)
 assert.equal(reply.response?.data?.canStageFullCoverage,false)
 assert.equal(reply.response?.data?.totalActiveStudentCohorts,13)
 assert.equal(illegalWrites().length,0)
})
