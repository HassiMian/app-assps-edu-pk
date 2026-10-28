'use strict';
// Synthetic only: isolated Unix socket PostgreSQL16, no live school records.
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const {up}=require('../../migrations/034_exam_marks_revision_history');
const {applySignedTenantContext}=require('../services/security/coreSignedTenantContext');
const KEY='ASSPS_SYNTHETIC_PG16_TEST_SECRET_EXAMPLE_NOT_LIVE_20261028';
async function main(){
 const host=process.env.PGHOST,port=Number(process.env.PGPORT);
 assert(host?.startsWith('/tmp/assps-hmac-ledger-')&&port===55486,'DISPOSABLE_UNIX_SOCKET_REQUIRED');
 const pool=new Pool({host,port,user:'postgres',database:'postgres',max:1});
 let passed=0;
 async function check(name,fn){await fn();console.log('PASS',name);passed++}
 async function attempt({old=0,now=7,total=20,oldGrade=null,newGrade='D',commit=false}={}){
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SET LOCAL ROLE apex_app_runtime');
   await applySignedTenantContext(client,{
    tenantId:1,tenantKey:'',actorId:11,secret:KEY,expectedLogin:'postgres'
   });
   try{
    await client.query(`INSERT INTO public.exam_marks_revision_history
      (school_id,exam_result_id,exam_id,student_id,subject,old_marks,new_marks,
       total_marks,old_grade,new_grade,actor_user_id,reason)
      VALUES (1,101,31,42,'Science',$1,$2,$3,$4,$5,11,'Synthetic prior-value proof only')`,
     [old,now,total,oldGrade,newGrade]);
    await client.query(commit?'COMMIT':'ROLLBACK');
    return {accepted:true};
   }catch(e){
    await client.query('ROLLBACK');
    return {accepted:false,code:e.code};
   }
  }finally{client.release()}
 }
 try{
  await check('migration_idempotent',async()=>{
   const r=await up({pool,runtimeRole:'apex_app_runtime'});
   assert.equal(r.previousValueGuard,true);
  });
  await check('forged_previous_marks_rejected',async()=>{
   assert.deepEqual(await attempt({old:9}),{accepted:false,code:'23514'});
  });
  await check('wrong_original_total_rejected',async()=>{
   assert.deepEqual(await attempt({total:19}),{accepted:false,code:'23514'});
  });
  await check('wrong_original_grade_rejected',async()=>{
   assert.deepEqual(await attempt({oldGrade:'A'}),{accepted:false,code:'23514'});
  });
  await check('valid_first_revision_committed_synthetic_only',async()=>{
   assert.deepEqual(await attempt({commit:true}),{accepted:true});
  });
  await check('stale_original_marks_rejected',async()=>{
   assert.deepEqual(await attempt({old:0,now:8}),{accepted:false,code:'23514'});
  });
  await check('wrong_prior_grade_rejected',async()=>{
   assert.deepEqual(await attempt({old:7,now:10,oldGrade:'F'}),{accepted:false,code:'23514'});
  });
  await check('valid_second_revision_committed_synthetic_only',async()=>{
   assert.deepEqual(await attempt({old:7,now:10,oldGrade:'D',newGrade:'C',commit:true}),{accepted:true});
  });
  await check('stale_first_revision_rejected',async()=>{
   assert.deepEqual(await attempt({old:7,now:11,oldGrade:'D'}),{accepted:false,code:'23514'});
  });
  await check('original_marks_unchanged_and_ledger_chain',async()=>{
   const r=await pool.query(`SELECT e.marks_obtained,
     (SELECT COUNT(*)::int FROM public.exam_marks_revision_history) AS revisions
     FROM public.exam_results e WHERE e.id=101`);
   assert.equal(Number(r.rows[0].marks_obtained),0);
   assert.equal(r.rows[0].revisions,2);
  });
  console.log('FIXTURE_RESULT',JSON.stringify({passed,total:10,synthetic_only:true,production_mutations:0}));
 }finally{await pool.end()}
}
main().catch(e=>{console.error('FAIL',e.stack||e.message);process.exitCode=1});
