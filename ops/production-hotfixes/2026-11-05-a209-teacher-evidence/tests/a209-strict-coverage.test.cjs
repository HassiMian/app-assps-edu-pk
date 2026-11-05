'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path')
const candidate=path.resolve(__dirname,'../../2026-11-05-a208-assessment-completeness/schoolAcademicCatalogRoutes.review-candidate.js')
const s=fs.readFileSync(candidate,'utf8')
const captured={get:{}};const router={get:(p,...f)=>captured.get[p]=f.at(-1),post:()=>{}}
let actorValid=true
let schoolValue=1
const queryLog=[]
let scopeRows=[]
const cohorts=[['Starter','Blue',56,false],['Mover','Purple',42,false],['Flyer','Pink',25,false],['One','Yellow',38,false],['Two','Orange',31,false],['Three','Red',28,false],['Four','Blue',17,true],['Five','Blue',23,true],['Six','Blue',20,true],['Seven','Blue',22,true],['Pre Nine','Blue',12,true],['Nine','Fatima',6,true],['Nine','Usman',9,true]]
const db={async query(sql,params=[]){sql=String(sql);queryLog.push({sql,params})
 if(sql==='BEGIN READ ONLY'||sql==='ROLLBACK'||sql==='COMMIT')return{rows:[],rowCount:0}
 if(sql.includes('SELECT id FROM users WHERE'))return actorValid?{rows:[{id:5}],rowCount:1}:{rows:[],rowCount:0}
 if(sql.includes('SELECT s.class AS class_name,s.section,COUNT(*)::int AS active_students')){
  return{rows:scopeRows.length?scopeRows:cohorts.map(([class_name,section,active_students,has_subject_assignment])=>({class_name,section,active_students,has_subject_assignment})),rowCount:cohorts.length}
 }
 throw Error('Unmocked read-only SQL: '+sql.slice(0,100))
},release(){}}
const imports={
 './schoolAcademicApprovalCore':{protect:()=>{},id:x=>Number(x)||0,withApproval:()=>{},audit:()=>{}},
 express:{Router:()=>router},'../config/database':{pool:{connect:async()=>db},applyTenantContext:async()=>{}},
 '../middleware/auth':{requireRoles:()=>()=>{}},
 '../services/academicClassKey':{sqlCanonicalClass:x=>`CANON(${x})`},
 '../services/lessonOriginalSourceReview':{reviewOriginalLessonSources:()=>{}},
 '../services/academicWriterReadinessService':{inspectSignedAcademicWriter:()=>{}},
 '../services/gradeDiscrepancyReview':{parseFilters:()=>{},expectedGradeSQL:()=>{},summaryRows:()=>{},mismatchHint:()=>{},summarizeMismatchHints:()=>{}}
}
const ctx={require:k=>{if(k in imports)return imports[k];throw Error('Unapproved import '+k)},module:{exports:{}},console}
vm.runInNewContext(s,ctx,{filename:'a209-source',timeout:3000})
const handler=captured.get['/assessment-catalog/cohort-coverage']
const res=()=>({statusCode:200,status(n){this.statusCode=n;return this},json(data){this.data=data;return this}})
const req=()=>({user:{id:5,school_id:schoolValue,role:'principal'},school_id:1})
const sql=()=>queryLog.find(q=>q.sql.includes('SELECT s.class AS class_name,s.section,COUNT(*)::int AS active_students'))?.sql||''
const reset=()=>{queryLog.length=0;scopeRows=[];actorValid=true;schoolValue=1}
test('coverage uses real active teacher account, not only assignment row',async()=>{reset();await handler(req(),res());assert.match(sql(),/JOIN users u/);assert.match(sql(),/u.role='teacher' AND u.is_active=true/)})
test('coverage requires independently active employee tied to teacher account',async()=>{reset();await handler(req(),res());assert.match(sql(),/JOIN employees ep/);assert.match(sql(),/ep.id=a.employee_id AND ep.is_active=true/)})
test('coverage requires reviewed timetable and exact teacher identity',async()=>{reset();await handler(req(),res());assert.match(sql(),/FROM timetable t/);assert.match(sql(),/t.staff_identity_reviewed=true/);assert.match(sql(),/t.teacher_id=a.teacher_user_id/)})
test('coverage requires exact class and section and subject; no cross Nine roster',async()=>{reset();await handler(req(),res());assert.match(sql(),/CANON\(a.class_name\)=CANON\(s.class\)/);assert.match(sql(),/LOWER\(BTRIM\(a.section\)\)=LOWER\(BTRIM\(s.section\)\)/);assert.match(sql(),/t.subject/);assert.match(sql(),/a.subject/)})
test('read-only coverage returns 13 cohorts, 329 students and 220 uncovered',async()=>{reset();const result=res();await handler(req(),result);assert.equal(result.data.success,true);assert.equal(result.data.data.cohorts.length,13);assert.equal(result.data.data.totalActiveStudents,329);assert.equal(result.data.data.uncoveredStudents,220);assert.equal(result.data.data.coveredCohorts,7);assert.equal(result.data.data.uncoveredCohorts,6);assert.equal(result.data.data.stagingReady,false);assert.equal(result.data.data.academicApprovalsCreated,false)})
test('principal identity required before database read',async()=>{reset();schoolValue=2;const result=res();await handler(req(),result);assert.equal(result.statusCode,403);assert.equal(result.data.code,'SCHOOL_IDENTITY_REQUIRED');assert.equal(queryLog.length,0)})
test('inactive principal account rejected before cohort query',async()=>{reset();actorValid=false;const result=res();await handler(req(),result);assert.equal(result.statusCode,403);assert.equal(result.data.code,'ACTIVE_SCHOOL_PRINCIPAL_REQUIRED');assert.ok(!sql())})
test('untrusted client never has insert/update/delete path in coverage route',async()=>{reset();await handler(req(),res());assert.equal(queryLog.filter(x=>/\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/.test(x.sql)).length,0);assert.ok(queryLog.some(x=>x.sql==='BEGIN READ ONLY'))})
test('school scoping uses parameter binding and active roster, not literal school id',async()=>{reset();await handler(req(),res());const item=queryLog.find(x=>x.sql===sql());assert.match(item.sql,/s.school_id=\$1 AND s.is_active=true/);assert.equal(item.params[0],1)})
