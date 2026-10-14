'use strict'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test'),assert=require('node:assert/strict')
const dbPath=require.resolve('../../al-siddique-backend/src/config/database')
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{pool:null}}
const migration=require('../../al-siddique-backend/migrations/030_grade910_signed_human_evidence')
function fixture({guard=true,bypass=false,policy=true}={}){
 const sql=[],client={
  async query(s,p){sql.push(s)
   if(s.includes('to_regprocedure'))return {rows:[{f:guard?'core_security.signed_school_allowed(integer)':null}]}
   if(s.includes('FROM pg_roles'))return {rows:[{rolname:p[0],rolbypassrls:bypass,rolsuper:false}]}
   if(s.includes('FROM pg_class c'))return {rows:policy?[{relrowsecurity:true,relforcerowsecurity:true,polname:'grade910_signoff_signed_school'}]:[]}
   return {rows:[]}
  },async release(){}
 }
 return{db:{connect:async()=>client},sql}
}
test('migration enforces signed-school RLS, private role grants, and immutable pending status',async()=>{
 const f=fixture()
 const r=await migration.up({pool:f.db,runtimeRole:'assps_grade910_restricted'})
 assert.equal(r.signedRlsEnforced,true);assert.equal(r.releaseAllowed,false)
 const s=f.sql.join('\n')
 assert.match(s,/FORCE ROW LEVEL SECURITY/)
 assert.match(s,/core_security\.signed_school_allowed\(school_id\)/)
 assert.match(s,/rolbypassrls/)
 assert.match(s,/AES|image_ciphertext|image_nonce/)
 assert.match(s,/PENDING_SCHOOL_IDENTITY_VERIFICATION/)
 assert.match(s,/COMMIT/)
})
test('migration fails closed when Core signed-school guard missing',async()=>{
 const f=fixture({guard:false})
 await assert.rejects(migration.up({pool:f.db,runtimeRole:'assps_grade910_restricted'}),/SIGNED_RLS_GUARD_NOT_INSTALLED/)
 assert.ok(f.sql.some(x=>x==='ROLLBACK'))
})
test('migration refuses BYPASSRLS runtime identity',async()=>{
 const f=fixture({bypass:true})
 await assert.rejects(migration.up({pool:f.db,runtimeRole:'assps_grade910_restricted'}),/RUNTIME_ROLE_MUST_BE_NOBYPASS/)
})
test('migration refuses unsigned missing DB_RUNTIME_ROLE',async()=>{
 const f=fixture()
 await assert.rejects(migration.up({pool:f.db,runtimeRole:'unsafe-role;'}),/RESTRICTED_ROLE_REQUIRED/)
})
test('migration cannot report ready without FORCE RLS policy evidence',async()=>{
 const f=fixture({policy:false})
 await assert.rejects(migration.up({pool:f.db,runtimeRole:'assps_grade910_restricted'}),/POLICY_NOT_ENFORCED/)
})
