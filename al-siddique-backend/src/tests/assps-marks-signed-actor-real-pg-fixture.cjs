'use strict';
/** SHA-signed actor review: disposable PG16 Unix socket only, fake actor accounts. */
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const {up}=require('../../migrations/034_exam_marks_revision_history');
const {applySignedTenantContext}=require('../services/security/coreSignedTenantContext');
const KEY='ASSPS_SYNTHETIC_PG16_TEST_SECRET_EXAMPLE_NOT_LIVE_20261028';
async function run(){
 const host=process.env.PGHOST,port=Number(process.env.PGPORT);
 assert(host?.startsWith('/tmp/assps-hmac-ledger-')&&port===55486,'ISOLATED_SOCKET_REQUIRED');
 const pool=new Pool({host,port,user:'postgres',database:'postgres',max:1});
 let passed=0;const check=async(name,fn)=>{await fn();passed++;console.log('PASS',name)};
 const attempt=async({signedActor=11,auditActor=11,school=1,subject='Science',sign=true,spoofGuc=false,badSignature=false,expired=false}={})=>{
  const c=await pool.connect();
  try{
   await c.query('BEGIN');await c.query('SET LOCAL ROLE apex_app_runtime');
   if(sign){await applySignedTenantContext(c,{tenantId:school,tenantKey:'',actorId:signedActor,secret:KEY,expectedLogin:'postgres'});}
   else{await c.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id','1',true),set_config('app.tenant_key','',true),set_config('app.core_actor_id','11',true)");}
   if(spoofGuc)await c.query("SELECT set_config('app.core_actor_id',$1,true)",[String(auditActor)]);
   if(badSignature)await c.query("SELECT set_config('app.core_sig',repeat('0',64),true)");
   if(expired)await c.query("SELECT set_config('app.core_sig_exp','0000000000',true)");
   try{
    await c.query("INSERT INTO public.exam_marks_revision_history(school_id,exam_result_id,exam_id,student_id,subject,old_marks,new_marks,total_marks,actor_user_id,reason) VALUES (1,101,31,42,$1,0,7,20,$2,'Synthetic HMAC-bound actor case only')",[subject,auditActor]);
    await c.query('ROLLBACK');return {allowed:true};
   }catch(e){await c.query('ROLLBACK');return {allowed:false,code:e.code,message:e.message}}
  }finally{c.release()}
 };
 try{
  await check('real_migration_and_signed_HMAC_RLS',async()=>{
    const r=await up({pool,runtimeRole:'apex_app_runtime'});assert.equal(r.existingMarksChanged,false);
  });
  await check('same_signed_principal_and_audit_actor_allowed',async()=>{assert.equal((await attempt()).allowed,true)});
  await check('other_eligible_principal_named_without_matching_signature_rejected',async()=>{
    const r=await attempt({signedActor:11,auditActor:13});assert.equal(r.allowed,false);assert.equal(r.code,'42501');
  });
  await check('separate_authenticated_principal_13_claim_can_name_itself',async()=>{
    assert.equal((await attempt({signedActor:13,auditActor:13})).allowed,true)
  });
  await check('signed_teacher_cannot_be_audit_actor',async()=>{
    assert.equal((await attempt({signedActor:12,auditActor:12})).code,'42501')
  });
  await check('cross_school_claim_cannot_write_school1',async()=>{
    const r=await attempt({signedActor:22,auditActor:22,school:2});assert.equal(r.allowed,false)
  });
  await check('unsigned_tenant_and_actor_guc_cannot_insert',async()=>{
    const r=await attempt({sign:false});assert.equal(r.allowed,false)
  });
  await check('tampered_signed_actor_guc_invalidates_HMAC',async()=>{
    const r=await attempt({signedActor:11,auditActor:13,spoofGuc:true});assert.equal(r.allowed,false)
  });
  await check('tampered_signature_rejected',async()=>{
    assert.equal((await attempt({badSignature:true})).allowed,false)
  });
  await check('expired_signature_rejected',async()=>{
    assert.equal((await attempt({expired:true})).allowed,false)
  });
  await check('wrong_subject_from_same_signed_principal_rejected',async()=>{
    const r=await attempt({subject:'Wrong'});assert.equal(r.allowed,false)
  });
  await check('inactive_signed_principal_rejected',async()=>{
    await pool.query('UPDATE public.users SET is_active=false WHERE id=11');
    try{assert.equal((await attempt()).code,'42501')}
    finally{await pool.query('UPDATE public.users SET is_active=true WHERE id=11')}
  });
  await check('demoted_signed_principal_rejected',async()=>{
    await pool.query("UPDATE public.users SET role='admin' WHERE id=11");
    try{assert.equal((await attempt()).code,'42501')}
    finally{await pool.query("UPDATE public.users SET role='principal' WHERE id=11")}
  });
  await check('signing_secret_unreadable_to_runtime_role',async()=>{
    const c=await pool.connect();try{await c.query('BEGIN');await c.query('SET LOCAL ROLE apex_app_runtime');let e;try{await c.query('SELECT secret FROM core_security.signing_key')}catch(ex){e=ex}assert.equal(e?.code,'42501');await c.query('ROLLBACK')}finally{c.release()}
  });
  await check('original_results_marks_unchanged',async()=>{const r=await pool.query('SELECT marks_obtained FROM public.exam_results WHERE id=101');assert.equal(Number(r.rows[0].marks_obtained),0)});
  console.log('FIXTURE_RESULT',JSON.stringify({total:15,passed,fixture:'PG16 transaction-bound HMAC signer',actor_approval_proven:false,production_mutations:0}));
 }finally{await pool.end()}
}
run().catch(e=>{console.error('FAIL',e.stack||e.message);process.exitCode=1});
