'use strict'
/*
  Isolated execution of the exact staged live source. No actual DB, network,
  production service boot, credentials, or student data.
*/
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const root=path.resolve(__dirname,'../../../al-siddique-backend/src')
const school=require(path.join(root,'services/security/strictSchoolIdentity.js'))
const academic=require(path.join(root,'services/academicClassKey.js'))
const core=require(path.join(root,'services/security/coreSignedTenantContext.js'))
function vmModule(filename, requireMock){
 const module={exports:{}}
 const script=fs.readFileSync(path.join(root,filename),'utf8')
 const context={module,exports:module.exports,require:requireMock,console:{log(){},error(){},warn(){}},
  process:{env:{NODE_ENV:'test'}},Buffer,Date,Set,Map,Error,Number,String,Promise}
 vm.runInNewContext(script,context,{timeout:1000,filename})
 return module.exports
}
function tenantFixture(columns=['school_id','tenant_id']){
 const calls=[]
 const query=async (_sql, params)=>{
  calls.push(params)
  return {rowCount:columns.includes(params[1])?1:0,rows:[]}
 }
 const lib=vmModule('middleware/tenant.js',(name)=>{
  if(name==='../config/database')return {tenantContext:{getStore:()=>null},query}
  if(name==='../services/security/strictSchoolIdentity')return school
  throw Error('Unexpected tenant require '+name)
 })
 return {lib,calls}
}
function teacherFixture(results=[]){
 const calls=[]
 const query=async(sql,params)=>{calls.push({sql,params});return {rowCount:results.length,rows:results}}
 const lib=vmModule('services/teacherAssignmentService.js',(name)=>{
  if(name==='../config/database')return {query}
  if(name==='./academicClassKey')return academic
  throw Error('Unexpected teacher require '+name)
 })
 return {lib,calls}
}
function scoped(role='teacher',school_id=1,tenant_id='a224-synthetic-tenant'){
 return {user:{id:41,role,school_id,tenant_id},query:{school_id:987},headers:{'x-school-id':'987'},school:{tenant_id}}
}
// Correct school IDs from authenticated JWT/database identity
test('strict school positive number',()=>assert.equal(school.strictPositiveSchoolId(12),12))
test('strict school positive string',()=>assert.equal(school.strictPositiveSchoolId('12'),12))
test('strict school whitespace digit string',()=>assert.equal(school.strictPositiveSchoolId(' 12 '),12))
test('strict rejects zero',()=>assert.equal(school.strictPositiveSchoolId(0),null))
test('strict rejects negative',()=>assert.equal(school.strictPositiveSchoolId(-4),null))
test('strict rejects fractional',()=>assert.equal(school.strictPositiveSchoolId(4.5),null))
test('strict rejects prefix string',()=>assert.equal(school.strictPositiveSchoolId('12x'),null))
test('strict rejects exponent',()=>assert.equal(school.strictPositiveSchoolId('1e3'),null))
test('strict rejects leading zeros',()=>assert.equal(school.strictPositiveSchoolId('0012'),null))
test('strict rejects huge number',()=>assert.equal(school.strictPositiveSchoolId(Number.MAX_SAFE_INTEGER+1),null))
test('strict rejects booleans',()=>assert.equal(school.strictPositiveSchoolId(true),null))
test('strict rejects object',()=>assert.equal(school.strictPositiveSchoolId({valueOf:()=>12}),null))
test('scoped teacher ignores forged URL/header school',()=>{
 const {lib}=tenantFixture();assert.equal(lib.currentSchoolId(scoped()),1)
})
test('scoped principal ignores forged URL/header school',()=>{
 const {lib}=tenantFixture();assert.equal(lib.currentSchoolId(scoped('principal',3)),3)
})
test('contradictory signed school claims fail closed',()=>{
 const {lib}=tenantFixture();const req=scoped();req.user.schoolId=2
 assert.equal(lib.currentSchoolId(req),null)
})
test('invalid signed school claim fails closed even if fallback exists',()=>{
 const {lib}=tenantFixture();const req=scoped();req.user.school_id='1wrong'
 assert.equal(lib.currentSchoolId(req),null)
})
test('platform admin may deliberately select explicit requested school',()=>{
 const {lib}=tenantFixture();const req=scoped('super_admin')
 req.school_id=7;assert.equal(lib.currentSchoolId(req),7)
})
test('scoped principal ignores injected tenant query',()=>{
 const {lib}=tenantFixture();const req=scoped('principal',2,'signed-tenant')
 req.query.tenant_id='forged';req.headers['x-tenant-id']='forged'
 assert.equal(lib.currentTenantId(req),'signed-tenant')
})
test('tenant clause AND-binds verified school and tenant columns',async()=>{
 const {lib}=tenantFixture();const r=await lib.tenantClause(scoped(),{table:'students',alias:'s',paramIndex:3})
 assert.match(r.clause,/s\.school_id = \$3/)
 assert.match(r.clause,/s\.tenant_id = \$4 OR s\.tenant_id IS NULL/)
 assert.match(r.clause,/s\.school_id = \$3 AND \(s\.tenant_id/)
 assert.deepEqual(Array.from(r.params),[1,'a224-synthetic-tenant'])
 assert.equal(r.nextIndex,5)
})
test('tenant clause school only still scoped',async()=>{
 const {lib}=tenantFixture(['school_id'])
 const r=await lib.tenantClause(scoped(),{table:'students',alias:'s'})
 assert.match(r.clause,/s\.school_id = \$1/)
 assert.deepEqual(Array.from(r.params),[1])
})
test('tenant clause tenant only is scoped for signed tenant',async()=>{
 const {lib}=tenantFixture(['tenant_id'])
 const r=await lib.tenantClause(scoped(),{table:'students',alias:'s'})
 assert.match(r.clause,/s\.tenant_id = \$1/)
 assert.deepEqual(Array.from(r.params),['a224-synthetic-tenant'])
})
test('tenant clause refuses school scope missing',async()=>{
 const {lib}=tenantFixture()
 await assert.rejects(lib.tenantClause(scoped('principal',null),{table:'students'}),
   e=>e.code==='TENANT_SCHOOL_CONTEXT_REQUIRED')
})
test('tenant clause refuses both columns missing',async()=>{
 const {lib}=tenantFixture([])
 await assert.rejects(lib.tenantClause(scoped(),{table:'students'}),
   e=>e.code==='TENANT_SCOPE_COLUMNS_MISSING')
})
test('tenant clause super admin does not silently imitate scoped staff',async()=>{
 const {lib}=tenantFixture()
 const r=await lib.tenantClause(scoped('super_admin'),{table:'students',paramIndex:5})
 assert.equal(r.clause,'');assert.equal(r.nextIndex,5)
})
test('tenant clause no table requires signed school but no SQL predicate',async()=>{
 const {lib}=tenantFixture()
 const r=await lib.tenantClause(scoped(),{})
 assert.equal(r.clause,'')
})
test('unknown school ID does not trust arbitrary URL on scoped staff',async()=>{
 const {lib}=tenantFixture()
 const req=scoped('teacher',null)
 await assert.rejects(lib.tenantClause(req,{table:'students'}))
})
test('tenant schema query failure does not turn into unrestricted access',async()=>{
 const lib=vmModule('middleware/tenant.js',(name)=>{
  if(name==='../config/database')return {tenantContext:{getStore:()=>null},query:async()=>{throw Error('DB unavailable')}}
  if(name==='../services/security/strictSchoolIdentity')return school
  throw Error('unknown')
 })
 await assert.rejects(lib.tenantClause(scoped(),{table:'students'}),e=>e.code==='TENANT_SCHEMA_LOOKUP_FAILED')
})
// Strict teacher authoring and grade identity
test('class key accepts Pre-Nine as Pre Nine',()=>assert.equal(academic.normalizeClassKey('Pre-Nine'),'pre nine'))
test('class key keeps Nine and Pre Nine separate',()=>assert.notEqual(academic.normalizeClassKey('Nine'),academic.normalizeClassKey('Pre Nine')))
test('class key is case/space insensitive',()=>assert.equal(academic.normalizeClassKey('  NINE  '),'nine'))
test('class SQL normalizes only explicit Pre-Nine alias',()=>assert.match(academic.sqlCanonicalClass('s.class'),/pre-nine/))
test('teacher student scope adds verified school teacher class and section',()=>{
 const {lib}=teacherFixture()
 const clause=lib.teacherStudentScopeClause(scoped(), 's', 3)
 assert.match(clause.clause,/tca\.school_id = s\.school_id/)
 assert.match(clause.clause,/tca\.teacher_user_id = \$3/)
 assert.match(clause.clause,/tca\.is_active = true/)
 assert.match(clause.clause,/tca\.section/)
 assert.deepEqual(Array.from(clause.params),[41])
 assert.equal(clause.nextIndex,4)
})
test('teacher scope does not apply to principal',()=>{
 const {lib}=teacherFixture()
 assert.equal(lib.teacherStudentScopeClause(scoped('principal'),'s',1),null)
})
test('teacher scope does not grant a wildcard blank section',()=>{
 const {lib}=teacherFixture()
 const clause=lib.teacherStudentScopeClause(scoped(),'students',1)
 assert.match(clause.clause,/NULLIF\(BTRIM\(COALESCE\(tca\.section,''\)\),''\) IS NOT NULL/)
})
test('teacher class authoring requires nonblank class',async()=>{
 const {lib,calls}=teacherFixture([{id:1}])
 assert.equal(await lib.teacherCanAccessClass({schoolId:1,teacherUserId:41,className:'',section:'Fatima',subject:'Science'}),false)
 assert.equal(calls.length,0)
})
test('teacher class authoring requires nonblank section',async()=>{
 const {lib,calls}=teacherFixture([{id:1}])
 assert.equal(await lib.teacherCanAccessClass({schoolId:1,teacherUserId:41,className:'Nine',section:'',subject:'Science'}),false)
 assert.equal(calls.length,0)
})
test('teacher class authoring requires nonblank subject',async()=>{
 const {lib,calls}=teacherFixture([{id:1}])
 assert.equal(await lib.teacherCanAccessClass({schoolId:1,teacherUserId:41,className:'Nine',section:'Fatima',subject:''}),false)
 assert.equal(calls.length,0)
})
test('teacher class authoring queries assignment scoped to signed teacher',async()=>{
 const {lib,calls}=teacherFixture([{id:1}])
 assert.equal(await lib.teacherCanAccessClass({schoolId:1,teacherUserId:41,className:'Nine',section:'Fatima',subject:'Science'}),true)
 assert.deepEqual(Array.from(calls[0].params),[1,41,'Nine','Fatima','Science'])
})
test('teacher class authoring unassigned fails',async()=>{
 const {lib}=teacherFixture([])
 assert.equal(await lib.teacherCanAccessClass({schoolId:1,teacherUserId:41,className:'Nine',section:'Fatima',subject:'Science'}),false)
})
test('teacher assignments query uses both school and staff',async()=>{
 const {lib,calls}=teacherFixture([])
 await lib.getTeacherAssignments({schoolId:1,teacherUserId:41})
 assert.deepEqual(Array.from(calls[0].params),[1,41])
})
// Signed tenancy context is tied to actual PostgreSQL login & transaction
test('signed envelope issues well-formed HMAC',()=>{
 const e=core.signedTenantEnvelope({tenantId:1,actorId:41,loginRole:'apexos_user',transactionId:12,secret:'q'.repeat(42),issuedAt:500})
 assert.equal(e.expires,'560');assert.match(e.signature,/^[a-f0-9]{64}$/)
})
test('signed envelope rejects short signing key',()=>{
 assert.throws(()=>core.signedTenantEnvelope({tenantId:1,actorId:41,loginRole:'apexos_user',transactionId:12,secret:'short'}),
 e=>e.code==='CORE_SIGNED_CONTEXT_REQUIRED')
})
test('signed envelope rejects bad tenant ID',()=>{
 assert.throws(()=>core.signedTenantEnvelope({tenantId:'1x',actorId:41,loginRole:'apexos_user',transactionId:12,secret:'q'.repeat(40)}))
})
test('signed envelope rejects invalid actor ID',()=>{
 assert.throws(()=>core.signedTenantEnvelope({tenantId:1,actorId:'0',loginRole:'apexos_user',transactionId:12,secret:'q'.repeat(40)}))
})
test('signed envelope rejects untrusted database role',()=>{
 assert.throws(()=>core.signedTenantEnvelope({tenantId:1,actorId:41,loginRole:'apexos_user;drop',transactionId:12,secret:'q'.repeat(40)}))
})
test('signed envelope rejects untrusted tx ID',()=>{
 assert.throws(()=>core.signedTenantEnvelope({tenantId:1,actorId:41,loginRole:'apexos_user',transactionId:'x',secret:'q'.repeat(40)}))
})
test('signed envelope rejects oversize key',()=>{
 assert.throws(()=>core.signedTenantEnvelope({tenantId:1,tenantKey:'a'.repeat(201),actorId:41,loginRole:'apexos_user',transactionId:12,secret:'q'.repeat(40)}))
})
test('signed context rejects fake DB login without session mutation',async()=>{
 const calls=[];const client={query:async(sql,params)=>{calls.push({sql,params});return {rows:[{login_name:'untrusted_user',transaction_id:'5'}]}}}
 await assert.rejects(core.applySignedTenantContext(client,{tenantId:1,actorId:41,secret:'z'.repeat(40),expectedLogin:'apexos_user'}),
  e=>e.code==='CORE_SIGNED_LOGIN_MISMATCH')
 assert.equal(calls.length,1)
})
test('signed context installs transaction-local limited RLS claims',async()=>{
 const calls=[];const client={query:async(sql,params)=>{
  calls.push({sql,params})
  if(calls.length===1)return {rows:[{login_name:'apexos_user',transaction_id:'5'}]}
  return {rows:[]}
 }}
 const out=await core.applySignedTenantContext(client,{tenantId:1,tenantKey:'school1',actorId:41,secret:'z'.repeat(40),expectedLogin:'apexos_user'})
 assert.equal(out.tenantId,'1');assert.equal(out.actorId,'41');assert.equal(calls.length,2)
 assert.match(calls[1].sql,/"?app\.is_super_admin'?,'false'/)
 assert.match(calls[1].sql,/app\.tenant_id/)
 assert.match(calls[1].sql,/app\.core_sig/)
 assert.deepEqual(Array.from(calls[1].params).slice(0,3),['1','school1','41'])
})
test('signed context rejects invalid expected login if actual differs',async()=>{
 const client={query:async()=>({rows:[{login_name:'apexos_user',transaction_id:'5'}]})}
 await assert.rejects(core.applySignedTenantContext(client,{tenantId:1,actorId:41,secret:'z'.repeat(40),expectedLogin:'wrong_user'}))
})
