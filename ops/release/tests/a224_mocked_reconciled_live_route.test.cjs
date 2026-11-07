'use strict'
/*
  Harmless in-memory route execution. Never loads the real Express server,
  Postgres, WhatsApp, network service, or student records.
  Route source must first be SHA-pinned by A223 source forward-port.
*/
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const targetPath = process.env.A223_REVIEW_ROUTE_PATH
if (!targetPath || !fs.existsSync(targetPath)) {
  throw Error('A223_REVIEW_ROUTE_PATH must be a generated private review candidate')
}
const code = fs.readFileSync(targetPath, 'utf8')
assert.match(code, /resolveAuthenticatedAttendanceMarker\(req\.user\)/)
assert.match(code, /skippedInactiveIds/)
assert.match(code, /teacherStudentScopeClause/)
const helper = require(path.resolve(__dirname, '../../../al-siddique-backend/src/routes/attendanceMarkerIdentity.js'))

function fixture(options={}) {
 const actions=[]
 const routes=new Map()
 const students=[
  { id:501,name:'Synthetic Student A',father_name:'',parent_phone:null,class:'Nine',section:'Fatima',
    school_id:1,tenant_id:'fake-school-one',is_active:true },
  { id:502,name:'Synthetic Student B',father_name:'',parent_phone:null,class:'Pre Nine',section:'Blue',
    school_id:1,tenant_id:'fake-school-one',is_active:true },
 ]
 const inactive=[
  {id:503,is_active:false,school_id:1,tenant_id:'fake-school-one'}
 ]
 const client={
  query:async(sql,params=[])=>{
   actions.push({sql,params})
   if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(sql))return {rows:[],rowCount:0}
   if (sql.includes('FROM students WHERE id = ANY')&&sql.includes('is_active = true')) {
    const ids=params[0] || []
    return {rows:students.filter(s=>ids.includes(s.id) && (options.acceptForeignTenant || s.school_id===(options.schoolId||1))),
       rowCount:students.filter(s=>ids.includes(s.id)).length}
   }
   if (sql.includes('is_active = false')) {
    const ids=params[0] || []
    return {rows:inactive.filter(s=>ids.includes(s.id)),rowCount:ids.length}
   }
   if (sql.includes('INSERT INTO attendance'))return {rows:[{id:9990}],rowCount:1}
   throw Error('Unexpected mocked DB route: '+sql.slice(0,70))
  },
  release:()=>{actions.push({sql:'RELEASE',params:[]})}
 }
 const fakeRouter={
  get:(url,...handlers)=>routes.set('GET '+url,handlers),
  post:(url,...handlers)=>routes.set('POST '+url,handlers)
 }
 const connect=async()=>client
 let assignmentCalls=0
 let teacherScopeCalls=0
 const fakeRequire=(which)=>{
  if(which==='dotenv')return {config:()=>({})}
  if(which==='express')return {Router:()=>fakeRouter}
  if(which==='../config/database')return {pool:{connect},query:async(sql,params)=>{
   actions.push({sql:'SCHOOL_NAME_QUERY',params})
   return {rows:[{school_name:'Synthetic School'}],rowCount:1}
  },applyTenantContext:async(client)=>{actions.push({sql:'APPLY_TENANT_CTX',params:[]})}}
  if(which==='../middleware/auth')return {
   protect:()=>{},
   requireRoles:()=>()=>{},
   requireScopeForServiceOnly:()=>()=>{},
   hasServiceScope:()=>false}
  if(which==='../middleware/tenant')return {
   tenantClause:async()=>({clause:'',params:[],nextIndex:1}),
   currentSchoolId:req=>req.schoolId,
   currentTenantId:req=>req.tenantId,
   hasColumn:async()=>true}
  if(which==='../services/teacherAssignmentService')return {
   teacherStudentScopeClause:(req,alias,idx)=>{
    teacherScopeCalls+=1
    return {clause:' AND teacher_scope = true',params:[],nextIndex:idx}
   },
   getTeacherAssignments:async()=>{
    assignmentCalls+=1
    return options.teacherAssigned===false?[]:[{class:'Nine',section:'Fatima'}]
   }
  }
  if(which==='../services/twilioSettings')return {
   getTwilioConfigForSchool:async()=>({enabled:false}),
   buildTwilioClient:()=>({})}
  if(which==='../services/whatsapp/whatsappSender')return {sendWhatsAppMessage:async()=>({status:'skipped'})}
  if(which==='./attendanceMarkerIdentity')return helper
  throw Error('Unexpected require in sandbox: '+which)
 }
 const mod={exports:{}}
 const context={require:fakeRequire,module:mod,exports:mod.exports,
  console:{log:()=>{},warn:()=>{},error:()=>{}},
  process:{env:{NODE_ENV:'test'}},Buffer,setTimeout,clearTimeout}
 vm.runInNewContext(code,context,{filename:'A223_REVIEW_ONLY_ATTENDANCE_ROUTE.js',timeout:1500})
 const registered=routes.get('POST /mark')
 assert.ok(registered && registered.length>0,'missing registered route')
 const handler=registered.at(-1)
 async function issue({role='principal',id=42,marked_by=898,studentIds=[501],invalidStatus=false,
                       schoolId=1,tenantId='fake-school-one'}={}) {
  const req={
   user:{id,role},schoolId,tenantId,
   body:{marked_by,records:studentIds.map(sid=>({
     student_id:sid,status:invalidStatus?'evil':'present',date:'2026-11-07'
   }))}
  }
  const res={statusCode:200,body:null,
   status(value){this.statusCode=value;return this},
   json(value){this.body=value;return this}}
  await handler(req,res)
  return {status:res.statusCode,body:res.body,actions,assignmentCalls,teacherScopeCalls}
 }
 return {issue,actions,registered,students}
}
function inserted(result) {
 return result.actions.filter(action=>action.sql.includes('INSERT INTO attendance'))
}
function valueMarkedBy(result) {
 const inserts=inserted(result)
 assert.equal(inserts.length,1)
 const params=inserts[0].params
 // Verified generated SQL includes a note column at the end after marker.
 assert.ok(inserts[0].sql.includes('marked_by'))
 assert.ok(inserts[0].sql.includes('note'))
 return params.at(-2)
}
test('registered bulk route is reachable in isolated JS sandbox',()=>assert.equal(typeof fixture().registered.at(-1),'function'))
test('principal client-spoofed marked_by is ignored, real marker persists',async()=>{
 const r=await fixture().issue({role:'principal',id:42,marked_by:898})
 assert.equal(r.status,200)
 assert.equal(r.body.savedCount,1)
 assert.equal(valueMarkedBy(r),42)
 assert.ok(!inserted(r)[0].params.includes(898))
})
test('admin client-spoofed marked_by ignored',async()=>{
 const r=await fixture().issue({role:'admin',id:43,marked_by:899})
 assert.equal(r.status,200);assert.equal(valueMarkedBy(r),43)
})
test('teacher attribution comes from the authenticated teacher',async()=>{
 const r=await fixture().issue({role:'teacher',id:44,marked_by:898})
 assert.equal(r.status,200);assert.equal(valueMarkedBy(r),44)
 assert.equal(r.assignmentCalls,1)
 assert.ok(r.teacherScopeCalls>0)
})
test('missing authenticated user ID returns 403 with atomic rollback',async()=>{
 const r=await fixture().issue({id:null,marked_by:898})
 assert.equal(r.status,403);assert.equal(r.body.error,'ATTENDANCE_MARKER_NOT_AUTHENTICATED')
 assert.equal(inserted(r).length,0)
 assert.ok(r.actions.some(q=>q.sql==='ROLLBACK'))
})
test('client marker is never replacement for missing user ID',async()=>{
 const r=await fixture().issue({id:null,marked_by:12})
 assert.equal(r.status,403)
 assert.equal(inserted(r).length,0)
})
test('invalid fractional actor ID returns 403',async()=>{
 const r=await fixture().issue({id:1.5})
 assert.equal(r.status,403);assert.equal(inserted(r).length,0)
})
test('invalid user ID whitespace string returns 403',async()=>{
 const r=await fixture().issue({id:' 42'})
 assert.equal(r.status,403);assert.equal(inserted(r).length,0)
})
test('teacher without assignments receives 409 and no insertion',async()=>{
 const f=fixture({teacherAssigned:false});const r=await f.issue({role:'teacher',id:44})
 assert.equal(r.status,409);assert.equal(inserted(r).length,0)
})
test('unknown student ID is rejected without any attendance insert',async()=>{
 const r=await fixture().issue({studentIds:[999]})
 assert.equal(r.status,400);assert.equal(r.body.error,'INVALID_STUDENT_IDS')
 assert.equal(inserted(r).length,0)
})
test('bulk with one foreign student does not partially insert',async()=>{
 const r=await fixture().issue({studentIds:[501,999]})
 assert.equal(r.status,400);assert.equal(inserted(r).length,0)
})
test('duplicate student ID rejected before insertion',async()=>{
 const r=await fixture().issue({studentIds:[501,501]})
 assert.equal(r.status,400);assert.equal(inserted(r).length,0)
})
test('invalid attendance status rejected before any DB connection',async()=>{
 const r=await fixture().issue({invalidStatus:true})
 assert.equal(r.status,400);assert.equal(inserted(r).length,0)
})
test('authorized school inactive student skipped while active saved',async()=>{
 const r=await fixture().issue({studentIds:[501,503]})
 assert.equal(r.status,200)
 assert.equal(r.body.savedCount,1)
 assert.equal(r.body.skippedInactiveCount,1)
 assert.equal(valueMarkedBy(r),42)
})
test('only inactive school member batch does not write an active mark',async()=>{
 const r=await fixture().issue({studentIds:[503]})
 assert.equal(r.status,200)
 assert.equal(r.body.savedCount,0)
 assert.equal(inserted(r).length,0)
})
test('empty user school context rejected with 403',async()=>{
 const r=await fixture().issue({schoolId:null,tenantId:null,role:'principal'})
 assert.equal(r.status,403);assert.equal(inserted(r).length,0)
})
test('commit is reached for valid principal mark',async()=>{
 const r=await fixture().issue()
 assert.ok(r.actions.some(q=>q.sql==='COMMIT'))
})
test('invalid batch never commits',async()=>{
 const r=await fixture().issue({studentIds:[999]})
 assert.ok(!r.actions.some(q=>q.sql==='COMMIT'))
})
test('fake DB in sandbox never targets real production network',()=>{
 const text=fs.readFileSync(__filename,'utf8')
 assert.doesNotMatch(text,/require\(['"](?:pg|axios|express)['"]\)/)
 assert.doesNotMatch(text,/https:\/\/app\.assps\.edu\.pk/)
})
