'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const routes=new Map(),middle=[]
const queries=[]
let schoolCounts={
  1:{scheduled_accounts:12,identity_verified_accounts:12,formally_assigned_accounts:0,
     active_teacher_accounts:19,saved_lesson_plans:3,shared_lesson_plans:0},
  2:{scheduled_accounts:1,identity_verified_accounts:1,formally_assigned_accounts:0,
     active_teacher_accounts:1,saved_lesson_plans:0,shared_lesson_plans:0}
}
const router={
 use(...middleware){middle.push(...middleware)},
 get(p,...handlers){routes.set('GET '+p,handlers)},
 post(p,...handlers){routes.set('POST '+p,handlers)},
 put(p,...handlers){routes.set('PUT '+p,handlers)},
 delete(p,...handlers){routes.set('DELETE '+p,handlers)}
}
const fakeDb={
 pool:{
  connect:async()=>({
   async query(sql,params){
    queries.push({sql:String(sql),params})
    if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[]}
    if(String(sql).includes('set_config'))return {rows:[]}
    if(String(sql).includes('to_regclass'))return {rows:[{table_name:'lesson_plans'}]}
    if(String(sql).includes('WITH scheduled AS'))return {
      rows:[schoolCounts[params[0]]||schoolCounts[2]]
    }
    throw Error('Unexpected SQL in synthetic-only test')
   },
   release(){}
  })
 },
 tenantContext:{getStore:()=>null},
 applyTenantContext:async()=>{}
}
const auth={
 protect(req,res,next){if(!req.user)return res.status(401).json({code:'NO_AUTH'});next()},
 requireRoles(...roles){
  return (req,res,next)=>{
   if(!roles.includes(req.user?.role))return res.status(403).json({code:'ROLE_DENIED'})
   next()
  }
 }
}
const original=Module._load
try {
 Module._load=function(request,parent,isMain){
  if(parent?.filename.endsWith('/routes/lessonPlanRoutes.js')){
   if(request==='express')return {Router:()=>router}
   if(request==='../config/database')return fakeDb
   if(request==='../middleware/auth')return auth
   if(request==='../middleware/tenant')return {currentSchoolId:req=>req.user?.school_id||null}
   if(request==='../services/teacherDocumentAccess')return {
    isSchoolDocumentManager:u=>['principal','admin','school_admin','super_admin'].includes(u?.role),
    canAccessAuthoredDocument:()=>false}
   if(request==='../services/lessonPlanningContext')return {loadPlanningContext:async()=>({})}
   if(request==='../services/lessonPlanningPublicationGuard')return {
    mustHoldLessonPublication:()=>true,privateLessonMutationAllowed:()=>false}
   if(request==='../services/lessonPlanningEngine')return {
    buildDeterministicPlan:()=>({}),enhancePlanWithAi:async()=>({}),
    parseSmartPlanningText:()=>({}),parseIsoDate:()=>null,MAX_RANGE_DAYS:90}
  }
  return original.apply(this,arguments)
 }
 require(path.join(__dirname,'../routes/lessonPlanRoutes.js'))
}finally {Module._load=original}
async function invoke(user){
 queries.length=0
 const req={user,query:{school_id:'1'},body:{school_id:1},params:{},headers:{},
  get:()=>null}
 const res={code:200,body:null,headers:{},
  status(c){this.code=c;return this},json(x){this.body=x;return this},
  set(name,value){this.headers[name.toLowerCase()]=value;return this}}
 const handlers=[...middle,...(routes.get('GET /planner/delivery-readiness')||[])]
 assert.ok(handlers.length>2)
 for(const fn of handlers){
  let next=false
  await fn(req,res,()=>{next=true})
  if(!next)break
 }
 return {res,queries:[...queries]}
}
test('unauthenticated readiness denied before any database request',async()=>{
 const {res,queries:sql}=await invoke(null)
 assert.equal(res.code,401)
 assert.equal(sql.length,0)
})
test('ordinary teacher denied readiness even with class module access',async()=>{
 const {res,queries:sql}=await invoke({id:11,school_id:1,role:'teacher'})
 assert.equal(res.code,403)
 assert.equal(sql.length,0)
})
test('authenticated principal gets only school-scoped read-only HOLD metrics',async()=>{
 const {res,queries:sql}=await invoke({id:41,school_id:1,role:'principal'})
 assert.equal(res.code,200)
 assert.equal(res.body.data.status,'HOLD')
 assert.equal(res.body.data.school_id,1)
 assert.equal(res.body.data.evidence.scheduled_accounts,12)
 assert.equal(res.body.data.publication_authorized,false)
 assert.equal(res.headers['cache-control'],'private, no-store')
 assert.ok(sql.some(q=>q.params?.[0]===1 && q.sql.includes('WITH scheduled AS')))
 assert.ok(!sql.some(q=>/INSERT INTO|UPDATE public.|DELETE FROM/i.test(q.sql)))
})
test('School2 principal with query/body School1 override cannot see School1 results',async()=>{
 const {res,queries:sql}=await invoke({id:42,school_id:2,role:'principal'})
 assert.equal(res.code,200)
 assert.equal(res.body.data.school_id,2)
 assert.equal(res.body.data.evidence.scheduled_accounts,1)
 assert.ok(sql.some(q=>q.params?.[0]===2&&q.sql.includes('WITH scheduled AS')))
 assert.ok(!sql.some(q=>q.sql.includes('WITH scheduled AS')&&q.params?.[0]===1))
})
test('invalid school context fails before database transaction',async()=>{
 const {res,queries:sql}=await invoke({id:43,school_id:null,role:'principal'})
 assert.equal(res.code,403)
 assert.equal(sql.length,0)
})
