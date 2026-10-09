'use strict'
const {test,after}=require('node:test')
const assert=require('node:assert/strict')
process.env.DB_STARTUP_PROBE='false'
const {verifiedPaperContext}=require('../middleware/paperRestrictedDatabase')
const {pool}=require('../config/database')
const teacher=(patch={})=>({user:{id:999001,role:'teacher',school_id:900001,tenant_id:'synthetic-a'},school_id:900001,...patch})
after(async()=>pool.end())
test('verified canonical teacher and principal scope retains exact school/actor binding',()=>{
 const a=verifiedPaperContext(teacher())
 assert.deepEqual([a.tenantId,a.paperActorId,a.paperActorRole],[900001,999001,'teacher'])
 const b=verifiedPaperContext(teacher({user:{id:'999001',role:'principal',school_id:'900001',tenant_id:'synthetic-a'},school_id:'900001'}))
 assert.deepEqual([b.tenantId,b.paperActorId,b.paperActorRole],[900001,999001,'principal'])
})
test('untrusted selected school numeric-prefix is rejected before restricted Paper scope creation',()=>{
 for(const school_id of ['900001suffix','900001.5','900001e0','900001;DROP',true,[],{},'9e5']){
  assert.throws(()=>verifiedPaperContext(teacher({school_id})),{code:'PAPER_DB_CONTEXT_FORBIDDEN'},String(school_id))
 }
})
test('signed actor cannot be provided as exponent, hex, fraction or unsafe integer',()=>{
 for(const id of ['9.99001e5','0xF','999001.0',999001.5,Number.MAX_SAFE_INTEGER+1]){
  const req=teacher({user:{...teacher().user,id}})
  assert.throws(()=>verifiedPaperContext(req),{code:'PAPER_DB_CONTEXT_FORBIDDEN'},String(id))
 }
})
test('server-bound school and optional tenantSchoolId cannot accept noncanonical numeric tokens',()=>{
 for(const school_id of ['900001.0','9.00001e5','900001suffix',Number.MAX_SAFE_INTEGER+1]){
  const req=teacher({user:{...teacher().user,school_id}})
  assert.throws(()=>verifiedPaperContext(req),{code:'PAPER_DB_CONTEXT_FORBIDDEN'},String(school_id))
 }
 for(const tenantSchoolId of ['900001junk','900001.0','9.00001e5']){
  const req=teacher({school_id:undefined,tenantSchoolId})
  assert.throws(()=>verifiedPaperContext(req),{code:'PAPER_DB_CONTEXT_FORBIDDEN'},String(tenantSchoolId))
 }
})
test('super-admin requires explicit canonical selected school, not parsed prefix',()=>{
 for(const school_id of ['900001.0','9.00001e5','900001junk']){
  const req=teacher({school_id,user:{id:999001,role:'super_admin',school_id:null}})
  assert.throws(()=>verifiedPaperContext(req),{code:'PAPER_DB_CONTEXT_FORBIDDEN'},String(school_id))
 }
 const admin=verifiedPaperContext(teacher({school_id:'900001',user:{id:999001,role:'super_admin',school_id:null}}))
 assert.deepEqual([admin.isSuperAdmin,admin.tenantId],[false,900001])
})
test('cross-school identity mismatch remains forbidden',()=>{
 assert.throws(()=>verifiedPaperContext(teacher({school_id:900002})),{code:'PAPER_DB_CONTEXT_FORBIDDEN'})
})
