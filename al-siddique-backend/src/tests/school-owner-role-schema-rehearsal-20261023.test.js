'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {up,ALLOWED}=require('../../migrations/036_add_school_owner_role_restricted')
const original="CHECK ((role)::text = ANY ('super_admin' 'school_admin' 'admin' 'principal' 'teacher' 'accountant' 'parent' 'student'))"
function fake({db='assps_p23_owner_test',previous=original,certified=true}={}){
 let changed=false
 const calls=[]
 const client={query:async sql=>{
  sql=String(sql);calls.push(sql)
  if(sql.includes('current_database()'))return {rows:[{db}]}
  if(sql.includes('pg_get_constraintdef')&&!changed)return {rows:[{definition:previous}]}
  if(sql.includes('ADD CONSTRAINT users_role_check'))changed=true
  if(sql.includes('pg_get_constraintdef')&&changed)return {rows:[{definition:previous+"'owner'",verified:certified}]}
  return {rows:[]}
 },release:()=>{}}
 return {calls,pool:{connect:async()=>client}}
}
test('owner schema cannot be deployed without hardened generic account routes',async()=>{
 const m=fake();await assert.rejects(()=>up({pool:m.pool}),/RELEASE_GUARD/)
 assert.equal(m.calls.length,0)
})
test('owner migration only changes role CHECK; no account records created',async()=>{
 const m=fake()
 const result=await up({pool:m.pool,isolatedRehearsal:true,authEndpointsHardened:true})
 assert.equal(result.ownerCreated,false)
 assert.equal(result.existingUsersModified,false)
 assert.ok(m.calls.some(c=>c.includes('VALIDATE CONSTRAINT users_role_check')))
 assert.ok(m.calls.some(c=>c.includes('DROP CONSTRAINT users_role_check')))
 assert.equal(m.calls.some(c=>/INSERT INTO users|UPDATE users/i.test(c)),false)
 assert.ok(ALLOWED.includes('owner'))
})
test('unrelated database is not an eligible isolated rehearsal',async()=>{
 const m=fake({db:'apexos'})
 await assert.rejects(()=>up({pool:m.pool,isolatedRehearsal:true,authEndpointsHardened:true}),/NOT_ISOLATED/)
 assert.ok(m.calls.includes('ROLLBACK'))
 assert.ok(!m.calls.includes('COMMIT'))
})
test('unexpected historical role schema cannot be rewritten',async()=>{
 const m=fake({previous:"CHECK (role IN ('teacher'))"})
 await assert.rejects(()=>up({pool:m.pool,isolatedRehearsal:true,authEndpointsHardened:true}),/ORIGINAL_CONSTRAINT_CHANGED/)
 assert.ok(!m.calls.includes('COMMIT'))
})
test('unverified database constraint rolls back',async()=>{
 const m=fake({certified:false})
 await assert.rejects(()=>up({pool:m.pool,isolatedRehearsal:true,authEndpointsHardened:true}),/FINAL_VERIFICATION_FAILED/)
 assert.ok(!m.calls.includes('COMMIT'))
})
test('Owner account school portal alias is separated from platform authorization',()=>{
 const fs=require('node:fs'),path=require('node:path')
 const s=fs.readFileSync(path.join(__dirname,'../routes/authRoutes.js'),'utf8')
 assert.ok(s.includes("owner: '/admin'"))
 assert.ok(s.includes("['super_admin', 'saas_admin', 'owner'].includes(user.role)"))
 assert.ok(s.includes("['admin', 'owner', 'teacher', 'student', 'parent', 'super_admin'].includes(requestedRole)"))
 assert.ok(s.includes('PRIVILEGED_ACCOUNT_PROVISIONING_DENIED'))
})
