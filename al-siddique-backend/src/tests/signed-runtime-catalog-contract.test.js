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
 for(const marker of ['c.relforcerowsecurity','c.relrowsecurity',"p.policyname='core_signed_tenant_guard'","p.permissive='RESTRICTIVE'","'apex_app_runtime'=ANY(p.roles)", 'state.forced !== 77','state.enabled !== 77','state.signed !== 77','DB_SIGNED_RLS_CATALOG_INCOMPLETE']) assert.ok(gate.includes(marker),marker)
 assert.match(source.slice(prepare),/await client\.release\(error\)/)
})
