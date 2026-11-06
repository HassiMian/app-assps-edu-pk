'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'../../2026-11-05-a208-assessment-completeness/schoolAcademicCatalogRoutes.review-candidate.js'),'utf8')
const routes={get:{},post:{}};const router={get:(p,...h)=>routes.get[p]=h.at(-1),post:(p,...h)=>routes.post[p]=h.at(-1)}
const live=[['Five','Blue',23,true],['Flyer','Pink',25,false],['Four','Blue',17,true],['Mover','Purple',42,false],['Nine','Fatima',6,true],['Nine','Usman',9,true],['One','Yellow',38,false],['Pre Nine','Blue',12,true],['Seven','Blue',22,true],['Six','Blue',20,true],['Starter','Blue',56,false],['Three','Red',28,false],['Two','Orange',31,false]].map(([class_name,section,students,reviewed_staffed])=>({class_name,section,students,reviewed_staffed}))
const queries=[];let principal=true;let brokenPaperStores=false
const client={async query(sql,params=[]){sql=String(sql);queries.push({sql,params})
 if(sql==='BEGIN READ ONLY'||sql==='COMMIT'||sql==='ROLLBACK')return{rows:[],rowCount:0}
 if(sql.includes('SELECT id FROM users WHERE'))return principal?{rows:[{id:5}],rowCount:1}:{rows:[],rowCount:0}
 if(sql.includes("SELECT id,name,type,class,total_marks,pass_marks,session FROM exams"))return{rows:[],rowCount:0}
 if(sql.includes('SELECT exam_id,approval_status,COUNT(*)::int AS total FROM exam_subjects'))return{rows:[],rowCount:0}
 if(sql.includes('SELECT s.class AS class_name,s.section,COUNT(*)::int AS students'))return{rows:live,rowCount:13}
 if(sql==='SELECT MOCK_GRADE_DISCREPANCIES')return{rows:[],rowCount:0}
 if(sql.includes('genuine_zeros FROM exam_results'))return{rows:[{n:1854,genuine_zeros:224}],rowCount:1}
 if(sql.includes('FROM lesson_plans WHERE school_id=$1'))return{rows:[{total:0}],rowCount:1}
 if(sql.includes('FROM paper_vault WHERE school_id=$1 AND deleted_at IS NULL'))return{rows:[{total:14}],rowCount:1}
 if(sql.includes('AS legacy_saved_rows')){
  if(brokenPaperStores)throw Error('STORAGE_UNAVAILABLE')
  return{rows:[{legacy_saved_rows:0,canonical_document_rows:0,assessment_paper_headers:4,assessment_revision_rows:2}],rowCount:1}
 }
 throw Error('UNEXPECTED_SQL '+sql.slice(0,110))
},release(){}}
const imports={
 express:{Router:()=>router},
 './schoolAcademicApprovalCore':{protect:()=>{},id:v=>Number(v)||0,withApproval:()=>{},audit:()=>{}},
 '../config/database':{pool:{connect:async()=>client},applyTenantContext:async()=>{}},
 '../middleware/auth':{requireRoles:()=>()=>{}},
 '../services/academicClassKey':{sqlCanonicalClass:e=>`CANON(${e})`},
 '../services/lessonOriginalSourceReview':{reviewOriginalLessonSources:()=>{}},
 '../services/academicWriterReadinessService':{inspectSignedAcademicWriter:()=>({})},
 '../services/gradeDiscrepancyReview':{parseFilters:()=>{},expectedGradeSQL:'SELECT MOCK_GRADE_DISCREPANCIES',summaryRows:()=>{},mismatchHint:()=>{},summarizeMismatchHints:()=>[]},
}
vm.runInNewContext(source,{require:key=>{if(!Object.hasOwn(imports,key))throw Error('UNKNOWN_IMPORT:'+key);return imports[key]},module:{exports:{}},console}, {filename:'A210_ReviewSource',timeout:4000})
const handler=routes.get['/assessment-catalog/readiness']
const request=(schoolId=1)=>({user:{id:5,school_id:schoolId,role:'principal'},school_id:1})
const response=()=>({code:200,headers:{},status(x){this.code=x;return this},set(k,v){this.headers[k]=v;return this},json(data){this.body=data;return this}})
const reset=()=>{queries.length=0;principal=true;brokenPaperStores=false}
const dbWrites=()=>queries.filter(x=>/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i.test(x.sql))
test('real A210 read-only readiness returns exact school1 cohort counts without signed approvals',async()=>{
 reset();const res=response();await handler(request(),res)
 assert.equal(res.code,200);assert.equal(res.body.success,true)
 const data=res.body.data
 assert.equal(data.activeStudents,329);assert.equal(data.unstaffedStudents,220)
 assert.equal(data.unstaffedCohorts.length,6)
 assert.equal(data.verifiedTeachingPolicy,'active_teacher_employee_and_reviewed_timetable')
 assert.equal(data.studentCoverageReportIsNotASignedAcademicApproval,true)
 assert.equal(data.academicApprovalCreated,false)
 assert.equal(res.headers['Cache-Control'],'private, no-store')
 assert.equal(dbWrites().length,0)
})
test('readiness uses school-scoped verified teacher, employee and reviewed timetable in same SQL',async()=>{
 reset();await handler(request(),response())
 const q=queries.find(x=>x.sql.includes('SELECT s.class AS class_name,s.section,COUNT(*)::int AS students'))
 assert.ok(q);assert.equal(q.params[0],1)
 for(const regex of [/JOIN users u/,/u.role='teacher' AND u.is_active=true/,/JOIN employees ep/,/ep.is_active=true/,/FROM timetable t/,/t.staff_identity_reviewed=true/,/t.teacher_id=a.teacher_user_id/,/LOWER\(BTRIM\(t.subject\)\)=LOWER\(BTRIM\(a.subject\)\)/,/s.school_id=\$1 AND s.is_active=true/])assert.match(q.sql,regex)
})
test('readiness returns four separate storage authorities, not a fictitious total Saved Papers count',async()=>{
 reset();const res=response();await handler(request(),res)
 const stores=res.body.data.savedPaperStorageReconciliation
 assert.equal(stores.activeVaultPapers,14)
 assert.equal(stores.legacySavedPapers,0)
 assert.equal(stores.canonicalPaperDocuments,0)
 assert.equal(stores.assessmentPaperHeaders,4)
 assert.equal(stores.assessmentRevisionRows,2)
 assert.equal(stores.sourcesNotDeduplicated,true)
 assert.equal(stores.paperContentRestorationVerified,false)
 assert.equal(stores.historicalMigrationCompleteness,'NOT_CERTIFIED')
})
test('storage sources are separately scoped by exact authenticated school ID',async()=>{
 reset();await handler(request(),response());const q=queries.find(x=>x.sql.includes('AS legacy_saved_rows'))
 assert.ok(q);assert.equal(q.params[0],1)
 for(const name of ['saved_papers','paper_documents','assessment_papers','assessment_paper_revisions'])assert.match(q.sql,new RegExp(`FROM ${name} WHERE school_id=\\$1`))
})
test('cross-school user denied before any SQL execution',async()=>{
 reset();const res=response();await handler(request(2),res)
 assert.equal(res.code,403);assert.equal(res.body.code,'SCHOOL_ADMIN_CONTEXT_REQUIRED')
 assert.equal(queries.length,0)
})
test('principal without active server-side user record denied before cohort query',async()=>{
 reset();principal=false;const res=response();await handler(request(),res)
 assert.equal(res.code,403);assert.equal(res.body.code,'ACTIVE_PRINCIPAL_REQUIRED')
 assert.ok(!queries.some(x=>x.sql.includes('AS legacy_saved_rows')))
})
test('storage source unavailable fails closed with no partial positive readiness',async()=>{
 reset();brokenPaperStores=true;const res=response();await handler(request(),res)
 assert.equal(res.code,503);assert.equal(res.body.success,false);assert.equal(res.body.code,'ACADEMIC_READINESS_UNAVAILABLE')
 assert.equal(dbWrites().length,0)
})
test('readiness does not claim 14 vault papers equal all historical saved papers',async()=>{
 reset();const res=response();await handler(request(),res)
 assert.equal(res.body.data.savedVaultPapers,14)
 assert.equal(res.body.data.savedPaperStorageReconciliation.sourcesNotDeduplicated,true)
 assert.notEqual(res.body.data.savedPaperStorageReconciliation.historicalMigrationCompleteness,'CERTIFIED')
})
