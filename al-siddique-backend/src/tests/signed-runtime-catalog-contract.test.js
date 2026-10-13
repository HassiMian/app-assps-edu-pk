'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'../config/database.js'),'utf8')
test('signed runtime cannot enter tenant setup before verifying RLS ENABLE plus FORCE plus restrictive signature',()=>{
 const start=source.indexOf('if (signedTenantGate) {',source.indexOf('async function connectForContext'))
 const prepare=source.indexOf('const prepared = await prepareRuntimeClient(client)',start)
 assert.ok(start>0 && prepare>start)
 const gate=source.slice(start,prepare)
 for(const marker of ['c.relforcerowsecurity','c.relrowsecurity',"p.policyname='core_signed_tenant_guard'","p.permissive='RESTRICTIVE'","$1::name=ANY(p.roles)", 'state.forced !== 77','state.enabled !== 77','state.signed !== 77','DB_SIGNED_RLS_CATALOG_INCOMPLETE']) assert.ok(gate.includes(marker),marker)
 assert.match(gate, /`\s*, \[configuredRuntimeRole\(\)\]\)/)
 assert.match(source.slice(prepare),/await client\.release\(error\)/)
})
test('signed mode rejects same-name RLS policies whose actual predicates or write checks are unsafe',()=>{
 const begin=source.indexOf('if (signedTenantGate) {',source.indexOf('async function connectForContext'))
 const finish=source.indexOf('const prepared = await prepareRuntimeClient(client)',begin)
 const gate=source.slice(begin,finish)
 for(const marker of [
  'p.qual=p.with_check',
  'core_security.signed_school_allowed(id)',
  'core_security.signed_school_allowed(school_id)',
  'core_security.signed_tenant_key_allowed((tenant_id)::text)',
  'AS signed_school','AS signed_tenant',
  'state.signed_school !== 73','state.signed_tenant !== 4'
 ]) assert.ok(gate.includes(marker),'fail-closed exact signed policy predicate '+marker)
 assert.match(gate,/p\.permissive='RESTRICTIVE'/)
 assert.match(gate,/DB_SIGNED_RLS_CATALOG_INCOMPLETE/)
})
