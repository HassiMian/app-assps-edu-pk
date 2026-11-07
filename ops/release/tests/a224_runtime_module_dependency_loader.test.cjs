'use strict'
// Full module import graph evaluated under inert mocked dependencies; never opens a DB or network connection.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto')
const {AsyncLocalStorage}=require('node:async_hooks')
const ROOT=path.resolve(__dirname,'../../../al-siddique-backend/src')
function fixture(envPatch={}){
 const cache=new Map(),routes=new Map();let connects=0,network=0,queries=0
 const env={NODE_ENV:'test',DB_STARTUP_PROBE:'false',DB_SIGNED_TENANT_RLS_ENABLED:'false',...envPatch}
 class Pool {
  constructor(opts){this.options=opts}
  connect(){connects++;throw Error('live DB connections prohibited')}
  query(){queries++;throw Error('live DB queries prohibited')}
  on(){}
 }
 const external={
  'dotenv':{config:()=>({parsed:{}})},'pg':{Pool},'async_hooks':{AsyncLocalStorage},
  'node:crypto':crypto,'crypto':crypto,
  'jsonwebtoken':{verify:()=>{throw Error('No real JWT')},decode:()=>null},
  'express':{Router:()=>({
   get:(url,...fn)=>routes.set('GET '+url,fn),
   post:(url,...fn)=>routes.set('POST '+url,fn),
   put:(url,...fn)=>routes.set('PUT '+url,fn),
   patch:(url,...fn)=>routes.set('PATCH '+url,fn),
   use:()=>{}
  })},
  'twilio':()=>({messages:{create:async()=>{network++;throw Error('Outbound blocked')}}})
 }
 const load=(name)=>{
  let full=path.resolve(ROOT,name);if(!path.extname(full))full+='.js'
  assert.ok(full.startsWith(ROOT+path.sep),'module path escaped')
  if(cache.has(full))return cache.get(full).exports
  const text=fs.readFileSync(full,'utf8'),mod={exports:{}};cache.set(full,mod)
  const fakeRequire=(dep)=>{
   if(dep.startsWith('.'))return load(path.relative(ROOT,path.resolve(path.dirname(full),dep)))
   if(Object.hasOwn(external,dep))return external[dep]
   throw Error('unexpected import '+dep)
  }
  const sandbox={module:mod,exports:mod.exports,require:fakeRequire,
   console:{log(){},error(){},warn(){}},process:{env},
   __dirname:path.dirname(full),__filename:full,Buffer,URL,Date,Map,Set,
   setTimeout:()=>{throw Error('unexpected timer')},clearTimeout:()=>{},
   fetch:()=>{network++;throw Error('network blocked')},
   setInterval:()=>{throw Error('background timer blocked')},clearInterval:()=>{}}
  vm.runInNewContext(text,sandbox,{filename:full,timeout:1200})
  return mod.exports
 }
 return {load,cache,routes,status:()=>({connects,network,queries})}
}
test('all live route dependency modules import without network or DB side effects',()=>{
 const v=fixture();v.load('routes/attendanceRoutes.js')
 assert.equal(v.status().connects,0);assert.equal(v.status().network,0)
 assert.equal(v.status().queries,0);assert.equal(v.cache.size,11)
})
test('exact complete 11-module candidate import closure',()=>{
 const v=fixture();v.load('routes/attendanceRoutes.js')
 const names=[...v.cache.keys()].map(f=>path.relative(ROOT,f))
 for(const name of [
  'routes/attendanceRoutes.js','routes/attendanceMarkerIdentity.js',
  'config/database.js','middleware/auth.js','middleware/tenant.js',
  'services/teacherAssignmentService.js','services/academicClassKey.js',
  'services/security/coreSignedTenantContext.js','services/security/strictSchoolIdentity.js',
  'services/whatsapp/whatsappSender.js','services/twilioSettings.js']){
  assert.ok(names.includes(name),'missing runtime module '+name)
 }
})
test('live backend still registers all 9 attendance route URLs',()=>{
 const v=fixture();v.load('routes/attendanceRoutes.js')
 for(const name of ['GET /','GET /monthly','GET /monthly-class-summary','POST /mark',
  'POST /mark-by-gr','GET /history','GET /history/:studentId','GET /analytics','GET /report'])
  assert.ok(v.routes.has(name),'missing route '+name)
})
test('bulk attendance has auth and role middleware',()=>{
 const v=fixture();v.load('routes/attendanceRoutes.js')
 assert.ok(v.routes.get('POST /mark').length>=3)
})
test('signed tenant startup mode fails without its required security parameters',()=>{
 const v=fixture({DB_SIGNED_TENANT_RLS_ENABLED:'true'})
 assert.throws(()=>v.load('config/database.js'),/DB_SIGNED_TENANT_DEPENDENCY_REQUIRED/)
})
test('forged school query does not override signed teacher school',()=>{
 const v=fixture();const tenant=v.load('middleware/tenant.js')
 assert.equal(tenant.currentSchoolId({user:{id:17,role:'teacher',school_id:1},
  query:{school_id:999},headers:{'x-school-id':'999'}}),1)
})
test('teacher class guard includes exact teacher, class, school, section',()=>{
 const v=fixture();const teacher=v.load('services/teacherAssignmentService.js')
 const r=teacher.teacherStudentScopeClause({user:{id:17,role:'teacher',school_id:1}},'s',2)
 assert.match(r.clause,/tca\.section/);assert.match(r.clause,/tca\.class_name/)
 assert.match(r.clause,/tca\.school_id/);assert.deepEqual(Array.from(r.params),[17])
})
test('Pre Nine does not equal Nine',()=>{
 const v=fixture(),cls=v.load('services/academicClassKey.js')
 assert.notEqual(cls.normalizeClassKey('Pre Nine'),cls.normalizeClassKey('Nine'))
})
test('audit marked_by comes only from authenticated actor',()=>{
 const v=fixture(),marker=v.load('routes/attendanceMarkerIdentity.js')
 assert.equal(marker.resolveAuthenticatedAttendanceMarker({id:17,marked_by:889}),17)
})
test('running attendance route review candidate SHA locked',()=>{
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'routes/attendanceRoutes.js'))).digest('hex')
 assert.equal(actual,'9ea239d871a735283858e63d2b36f4fa5743ff5b98818caf0a8cd22fd1fd1f27')
})
test('missing unexpected imports fail, not substituted',()=>{
 const v=fixture();assert.throws(()=>v.load('missing/not-found.js'),/ENOENT/)
})
