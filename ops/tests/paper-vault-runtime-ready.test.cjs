const { test } = require('node:test')
const assert = require('node:assert/strict')
const { assessVaultRuntime } = require('../check-paper-vault-runtime-ready.cjs')

const fixture = () => ({
  role:{rolbypassrls:false,rolsuper:false,rolcanlogin:false},
  canSetRole:true,
  appRuntimeActive:true,
  canAppRoleSetPaper:true,
  tables:[
    {relname:'paper_vault',relrowsecurity:true,relforcerowsecurity:true},
    {relname:'paper_vault_revision_history',relrowsecurity:true,relforcerowsecurity:true},
    {relname:'teacher_class_assignments',relrowsecurity:true,relforcerowsecurity:true},
  ],
  policies:['paper_vault','paper_vault_revision_history','teacher_class_assignments'].map(tablename=>({
    tablename,qual:"school_id = current_setting('app.tenant_id', true)::int",
    with_check:"school_id = current_setting('app.tenant_id', true)::int",
  })),
  tableGrants:{SELECT:true,INSERT:true,UPDATE:true,DELETE:true},
  sequenceGrants:{USAGE:true,SELECT:true},
  journalGrants:{SELECT:true,INSERT:true},
  teacherAssignmentGrant:true,
})

test('restricted runtime with both strict tenant policies passes',()=>{
  assert.deepEqual(assessVaultRuntime(fixture()),{ready:true,findings:[]})
})
test('role privilege bypass, login or missing membership fails',()=>{
  for(const variant of [
    {role:{...fixture().role,rolbypassrls:true}},
    {role:{...fixture().role,rolcanlogin:true}},
    {role:{...fixture().role,rolsuper:true}},
    {canSetRole:false},
    {canAppRoleSetPaper:false},
  ]) assert.equal(assessVaultRuntime({...fixture(),...variant}).ready,false)
})
test('missing context default-allow policy never counts as strict',()=>{
  const f=fixture()
  f.policies[0].qual="current_setting('app.rls_enabled', true) is distinct from 'true' OR school_id = current_setting('app.tenant_id',true)::int"
  assert.deepEqual(assessVaultRuntime(f).findings,['TENANT_POLICY_NOT_STRICT:paper_vault'])
})
test('missing protected history RLS or minimal privileges fails',()=>{
  const f=fixture()
  f.tables[1].relforcerowsecurity=false
  f.tableGrants.DELETE=false
  assert.ok(assessVaultRuntime(f).findings.includes('RLS_NOT_FORCED:paper_vault_revision_history'))
  assert.ok(assessVaultRuntime(f).findings.includes('VAULT_GRANT_MISSING:DELETE'))
})
