'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {canCreateSchoolUser,canResetSchoolUserPassword}=require('../services/schoolUserRoleProvisioningPolicy')
const auth=fs.readFileSync(path.join(__dirname,'../routes/authRoutes.js'),'utf8')
const forbidden=['owner','super_admin','saas_admin','platform_owner','Owner','Administrator','']
const staff=['teacher','parent','student','accountant']
const elevated=['admin','school_admin','principal']
for(const actorRole of ['admin','super_admin']){
 for(const role of forbidden){
  test(actorRole+' cannot provision/reset protected '+role,()=>{
   assert.equal(canCreateSchoolUser({actorRole,newRole:role}),false)
   assert.equal(canResetSchoolUserPassword({actorRole,targetRole:role}),false)
  })
 }
 for(const role of staff){
  test(actorRole+' may manage '+role,()=>{
   assert.equal(canCreateSchoolUser({actorRole,newRole:role}),true)
   assert.equal(canResetSchoolUserPassword({actorRole,targetRole:role}),true)
  })
 }
}
for(const role of elevated){
 test('school Admin cannot self-escalate to '+role,()=>{
  assert.equal(canCreateSchoolUser({actorRole:'admin',newRole:role}),false)
  assert.equal(canResetSchoolUserPassword({actorRole:'admin',targetRole:role}),false)
  assert.equal(canCreateSchoolUser({actorRole:'super_admin',newRole:role}),true)
 })
}
test('generic user route enforces role policy and real tenant-linked schema',()=>{
 assert.ok(auth.includes('canCreateSchoolUser({actorRole:req.user?.role,newRole:role})'))
 assert.ok(auth.includes('PRIVILEGED_ACCOUNT_PROVISIONING_DENIED'))
 assert.ok(auth.includes('SCHOOL_TENANT_SCHEMA_REQUIRED'))
 assert.ok(auth.includes('if (!supportsTenantId || !school.tenant_id)'))
})
test('generic password reset is scoped by target role and tenant school',()=>{
 assert.ok(auth.includes('AND role = ANY($3::text[])'))
 assert.ok(auth.includes("sql += ' AND school_id = $4'"))
 assert.ok(auth.includes("['teacher','parent','student','accountant']"))
 assert.ok(auth.includes("['teacher','parent','student','accountant','admin','school_admin','principal']"))
})
test('policy never permits owner or platform-owner at any case',()=>{
 for(const a of ['admin','super_admin','owner','']){
  for(const v of ['owner','OWNER','platform_owner','super_admin','saas_admin']){
   assert.equal(canCreateSchoolUser({actorRole:a,newRole:v}),false)
   assert.equal(canResetSchoolUserPassword({actorRole:a,targetRole:v}),false)
  }
 }
})
