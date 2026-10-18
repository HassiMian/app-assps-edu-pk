'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {
  AGGREGATE_SQL,cleanCounts,getTeacherLessonDeliveryAudit
}=require('../services/teacherLessonDeliveryAudit')
const values={
  scheduled_accounts:12, identity_verified_accounts:12,
  formally_assigned_accounts:0,active_teacher_accounts:19,
  saved_lesson_plans:3,shared_lesson_plans:0
}
test('principal server audit reads only exact signed school scope',async()=>{
 const calls=[]
 const client={query:async(sql,args)=>{
  calls.push({sql,args})
  return {rows:[values],rowCount:1}
 }}
 const r=await getTeacherLessonDeliveryAudit(client,1)
 assert.equal(calls.length,1)
 assert.deepEqual(calls[0].args,[1])
 assert.equal(r.school_id,1)
 assert.equal(r.status,'HOLD')
 assert.equal(r.evidence.identity_verified_accounts,12)
 assert.equal(r.evidence.formally_assigned_accounts,0)
 assert.equal(r.permission_granted,false)
 assert.equal(r.delivery_certified,false)
 assert.equal(r.publication_authorized,false)
 assert.equal(r.academic_source_approval_required,true)
})
test('peer-school request is scoped to that authenticated school ID',async()=>{
 const calls=[]
 const client={query:async(sql,args)=>{calls.push(args);return{rows:[{
  scheduled_accounts:0,identity_verified_accounts:0,formally_assigned_accounts:0,
  active_teacher_accounts:1,saved_lesson_plans:0,shared_lesson_plans:0
 }]}}}
 const r=await getTeacherLessonDeliveryAudit(client,2)
 assert.deepEqual(calls,[[2]])
 assert.equal(r.school_id,2)
 assert.equal(r.evidence.scheduled_accounts,0)
})
test('missing or invalid school context denied before querying',async()=>{
 let queries=0
 for(const id of [null,0,-2,'1',1.4]){
  await assert.rejects(
   ()=>getTeacherLessonDeliveryAudit({query:async()=>{queries++}},id),
   /Verified school ID/)
 }
 assert.equal(queries,0)
})
test('numeric and malformed readiness counters must never be blindly trusted',()=>{
 assert.deepEqual(cleanCounts(values),values)
 for(const [key,val] of [['scheduled_accounts',-1],['active_teacher_accounts',null],
   ['shared_lesson_plans','NaN'],['saved_lesson_plans','-2']]){
  assert.throws(()=>cleanCounts({...values,[key]:val}),/Invalid tenant/)
 }
})
test('audit contains only aggregate SELECT and fixed school predicates',()=>{
 assert.match(AGGREGATE_SQL,/FROM public\.teacher_class_assignments/)
 assert.match(AGGREGATE_SQL,/e\.user_id=u\.id/)
 assert.match(AGGREGATE_SQL,/school_id=\$1/)
 assert.doesNotMatch(AGGREGATE_SQL,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP)\b/i)
 assert.doesNotMatch(AGGREGATE_SQL,/student_name|password|email|phone/i)
})
test('route requires management actor and never exposes member-level records',()=>{
 const routes=fs.readFileSync(path.join(__dirname,'../routes/lessonPlanRoutes.js'),'utf8')
 const key="router.get('/planner/delivery-readiness'"
 const loc=routes.indexOf(key)
 assert.ok(loc>0)
 const part=routes.slice(loc,loc+800)
 assert.match(part,/requireRoles\('super_admin','admin','school_admin','principal'\)/)
 assert.match(part,/withTenantTransaction\(req,schoolId/)
 assert.match(part,/getTeacherLessonDeliveryAudit\(client,schoolId\)/)
 assert.match(part,/private, no-store/)
 assert.doesNotMatch(part,/sent_to_portal\s*=\s*true|INSERT INTO|GRANT/)
})
test('all-green synthetic metrics are still evidence only, never permission to publish',async()=>{
 const v={scheduled_accounts:12,identity_verified_accounts:12,
  formally_assigned_accounts:12,active_teacher_accounts:12,
  saved_lesson_plans:12,shared_lesson_plans:12}
 const r=await getTeacherLessonDeliveryAudit({query:async()=>({rows:[v]})},1)
 assert.equal(r.status,'HOLD')
 assert.equal(r.permission_granted,false)
 assert.equal(r.delivery_certified,false)
 assert.equal(r.publication_authorized,false)
})
