'use strict'
// Run only on a disposable PostgreSQL clone, as the non-bypass OS/DB peer user.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const test = require('node:test')
assert.match(String(process.env.DB_NAME || ''), /^assps_archv1_rls_/)
assert.equal(process.env.NODE_ENV, 'test')
assert.equal(process.env.PAPER_RESTRICTED_DB_ENABLED, 'true')
assert.notEqual(process.env.PAPER_RESTRICTED_DB_USER,process.env.DB_USER)
assert.notEqual(process.env.PAPER_RESTRICTED_DB_USER, 'postgres')
const fixtureFile = process.env.ASSPS_PAPER_TEST_SIGNING_FIXTURE
assert.ok(fixtureFile && fs.existsSync(fixtureFile), 'Provide clone-only fixture, never production credentials')
const sample = fs.readFileSync(fixtureFile, 'utf8').match(/^\\set PAPER_HMAC_KEY (\S+)$/m)?.[1]
assert.ok(sample && sample.length > 32)
process.env.PAPER_RESTRICTED_SIGNING_KEY = sample
const { pool, query, tenantContext } = require('../config/database')
const { Client } = require('pg')
const fixtureActors = {}
test.before(async()=>{
 const client = new Client({host:process.env.DB_HOST || '/var/run/postgresql',database:process.env.DB_NAME,user:process.env.DB_USER})
 await client.connect()
 try {
  const r=await client.query('SELECT id,email FROM users WHERE email=ANY($1::text[])',[[
    'archv1-teacher-a@invalid.example','archv1-teacher-c@invalid.example','archv1-principal@invalid.example'
  ]])
  for(const row of r.rows) fixtureActors[row.email]=Number(row.id)
  assert.equal(Object.keys(fixtureActors).length,3,'Clone-only synthetic actor fixture missing')
 } finally { await client.end() }
})
function scoped(schoolId, fn) {
 const actorId=schoolId===5?fixtureActors['archv1-teacher-c@invalid.example']:fixtureActors['archv1-teacher-a@invalid.example']
 return tenantContext.run({rlsEnabled:true,paperRestricted:true,isSuperAdmin:false,tenantId:schoolId,paperActorId:actorId,paperActorRole:'teacher'},fn)
}

test('actual non-BYPASS database login and signed RLS isolate two schools', async () => {
 for (const tenantId of [1,5]) {
  const result = await scoped(tenantId,()=>query(
   `SELECT current_database() AS db, session_user AS login, current_user AS active_role,
           row_security_active('public.question_bank'::regclass) AS active,
           COUNT(*)::int own, COUNT(*) FILTER (WHERE school_id<>$1)::int foreign
      FROM question_bank`,[tenantId]))
  const x = result.rows[0]
  assert.equal(x.db,process.env.DB_NAME)
  assert.equal(x.login,process.env.PAPER_RESTRICTED_DB_USER)
  assert.equal(x.active_role,'apex_paper_runtime')
  assert.equal(x.active,true)
  assert.ok(x.own > 0)
  assert.equal(x.foreign,0)
 }
})

test('GUC school, signature and elevated role spoof attempts fail closed', async () => {
 await scoped(1,async()=>{
  const client=await pool.connect()
  try {
   assert.ok(Number((await client.query('SELECT count(*) AS n FROM question_bank')).rows[0].n)>0)
   await client.query("SELECT set_config('app.tenant_id','5',true)")
   assert.equal(Number((await client.query('SELECT count(*) AS n FROM question_bank')).rows[0].n),0)
   await client.query("SELECT set_config('app.tenant_id','1',true)")
   await client.query("SELECT set_config('app.paper_actor_role','principal',true)")
   assert.equal(Number((await client.query('SELECT count(*) AS n FROM question_bank')).rows[0].n),0)
   await client.query("SELECT set_config('app.paper_actor_role','teacher',true)")
   await client.query("SELECT set_config('app.paper_rls_sig',repeat('f',64),true)")
   assert.equal(Number((await client.query('SELECT count(*) AS n FROM question_bank')).rows[0].n),0)
   await assert.rejects(()=>client.query('SET LOCAL ROLE apexos_user'),e=>e.code==='42501')
  } finally { await client.release() }
 })
})

test('signed teacher role cannot govern Question Bank or read peer drafts',async()=>{
 await scoped(1,async()=>{
  const c=await pool.connect()
  try {
    const own=(await c.query('SELECT id FROM question_bank ORDER BY id LIMIT 1')).rows[0]?.id
    assert.ok(own)
    const write=await c.query('UPDATE question_bank SET question_text=question_text WHERE id=$1',[own])
    assert.equal(write.rowCount,0)
    const peers=await c.query('SELECT id FROM paper_vault WHERE owner_user_id<>$1',[fixtureActors['archv1-teacher-a@invalid.example']])
    assert.equal(peers.rowCount,0)
  }finally{await c.release()}
 })
})

test('signed principal can govern one own-school Question Bank row in rollback transaction',async()=>{
 await tenantContext.run({rlsEnabled:true,paperRestricted:true,isSuperAdmin:false,tenantId:1,paperActorId:fixtureActors['archv1-principal@invalid.example'],paperActorRole:'principal'},async()=>{
  const c=await pool.connect()
  try {
    const own=(await c.query('SELECT id FROM question_bank ORDER BY id LIMIT 1')).rows[0]?.id
    assert.ok(own)
    const write=await c.query('UPDATE question_bank SET question_text=question_text WHERE id=$1',[own])
    assert.equal(write.rowCount,1)
    const foreign=await c.query('UPDATE question_bank SET question_text=question_text WHERE school_id=5')
    assert.equal(foreign.rowCount,0)
  }finally{await c.release()}
 })
})

test('teacher release writes are RLS blocked; principal is still subject to immutable release trigger',async()=>{
 await scoped(1,async()=>{
  const c=await pool.connect()
  try {
   const own=(await c.query('SELECT id FROM assessment_releases LIMIT 1')).rows[0]?.id
   assert.ok(own,'representative release fixture required')
   const blocked=await c.query('UPDATE assessment_releases SET content_hash=content_hash WHERE id=$1',[own])
   assert.equal(blocked.rowCount,0,'teacher must not approve or mutate assessment release')
  } finally { await c.release() }
 })
 await tenantContext.run({rlsEnabled:true,paperRestricted:true,isSuperAdmin:false,tenantId:1,paperActorId:fixtureActors['archv1-principal@invalid.example'],paperActorRole:'principal'},async()=>{
  const c=await pool.connect()
  try {
   const own=(await c.query('SELECT id FROM assessment_releases LIMIT 1')).rows[0]?.id
   assert.ok(own)
   await assert.rejects(
     ()=>c.query('UPDATE assessment_releases SET content_hash=content_hash WHERE id=$1',[own]),
     error=>error.code==='P0001' && /immutable assessment history/i.test(error.message),
     'principal must still respect immutable release history trigger'
   )
  } finally { await c.release() }
 })
})

test('signed tenant signature cannot be replayed in a new database transaction',async()=>{
 await scoped(1,async()=>{
  const original=await pool.connect()
  let proof
  try {
    const ctx=await original.query(`SELECT current_setting('app.tenant_id',true) AS t,
      current_setting('app.paper_rls_nonce',true) AS n,
      current_setting('app.paper_rls_exp',true) AS e,
      current_setting('app.paper_rls_sig',true) AS s`)
    proof=ctx.rows[0]
    assert.ok(proof.t && proof.n && proof.e && proof.s)
  } finally { await original.release() }
  const next=await pool.connect()
  try {
    const clean=(await next.query('SELECT count(*)::int AS n FROM question_bank')).rows[0].n
    assert.ok(clean>0)
    await next.query("SELECT set_config('app.paper_rls_nonce',$1,true),set_config('app.paper_rls_exp',$2,true),set_config('app.paper_rls_sig',$3,true)",[proof.n,proof.e,proof.s])
    const replayed=(await next.query('SELECT count(*)::int AS n FROM question_bank')).rows[0].n
    assert.equal(replayed,0,'old transaction signature must not authorize a later transaction')
  } finally { await next.release() }
 })
})

test('missing authenticated school is rejected before database access',async()=>{
 await assert.rejects(()=>scoped(null,()=>query('SELECT count(*) FROM question_bank')),e=>e.code==='TENANT_CONTEXT_REQUIRED' || e.code==='PAPER_TENANT_CONTEXT_REQUIRED')
})

test('role + school preflight rejects forged teacher school; allows authenticated teacher and reviewer',async()=>{
 const {paperRestrictedDatabase}=require('../middleware/paperRestrictedDatabase')
 const exec=(req)=>tenantContext.run({rlsEnabled:true,tenantId:1,isSuperAdmin:false},()=>new Promise(resolve=>{
  const res={status(code){this.code=code;return this},json(value){resolve({status:this.code,body:value})}}
  paperRestrictedDatabase(req,res,()=>resolve({status:200,scope:{...tenantContext.getStore()}}))
 }))
 assert.equal((await exec({user:{role:'teacher',id:fixtureActors['archv1-teacher-a@invalid.example'],school_id:1},school_id:5})).status,403)
 assert.equal((await exec({user:{role:'teacher',id:fixtureActors['archv1-teacher-a@invalid.example'],school_id:1},school_id:1})).scope.paperRestricted,true)
 assert.equal((await exec({user:{role:'principal',id:fixtureActors['archv1-principal@invalid.example'],school_id:1},school_id:1})).scope.paperRestricted,true)
 assert.equal((await exec({user:{role:'student',id:1,school_id:1},school_id:1})).status,403)
 assert.equal((await exec({user:{role:'super_admin',id:fixtureActors['archv1-principal@invalid.example'],school_id:null},school_id:null})).status,403)
 assert.equal((await exec({user:{role:'super_admin',id:fixtureActors['archv1-principal@invalid.example'],school_id:null},query:{school_id:'5'}})).status,403)
})

test.after(async()=>{await pool.end()})
