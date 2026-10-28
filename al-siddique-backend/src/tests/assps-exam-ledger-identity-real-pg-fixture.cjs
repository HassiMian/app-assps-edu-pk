'use strict';
/** Real PG16 source migration fixture, isolated Unix socket only, no production account. */
const assert=require('node:assert/strict');
const {Pool}=require('/var/www/apex-backend/node_modules/pg');
const {up}=require('../../migrations/034_exam_marks_revision_history');
(async()=>{
 const host=process.env.PGHOST,port=Number(process.env.PGPORT);
 assert(host?.startsWith('/tmp/assps-ledger-binding-')&&port===55485,'DISPOSABLE_SOCKET_REQUIRED');
 const pool=new Pool({host,port,user:'postgres',database:'postgres',max:1});
 let passed=0;const check=async(name,f)=>{await f();passed++;console.log('PASS',name)};
 const attempt=async({actor=11,exam=31,student=42,subject='Science',commit=false}={})=>{
  const client=await pool.connect();
  try{
   await client.query('BEGIN');await client.query('SET LOCAL ROLE apex_app_runtime');
   await client.query("SELECT set_config('app.school_id','1',true)");
   try{
    await client.query("INSERT INTO public.exam_marks_revision_history(school_id,exam_result_id,exam_id,student_id,subject,old_marks,new_marks,total_marks,actor_user_id,reason) VALUES(1,101,$1,$2,$3,0,7,20,$4,'Synthetic unapproved review fixture')",[exam,student,subject,actor]);
    await client.query(commit?'COMMIT':'ROLLBACK');return 'ACCEPTED';
   }catch(e){await client.query('ROLLBACK');return e.code||e.message}
  }finally{client.release()}
 };
 try{
  await check('source_migration_integrates_unique_keys_and_composite_fks',async()=>{
   const r=await up({pool,runtimeRole:'apex_app_runtime'});assert.equal(r.existingMarksChanged,false);
   const q=await pool.query("SELECT conname FROM pg_constraint WHERE conrelid='public.exam_marks_revision_history'::regclass AND conname IN ('exam_marks_revision_source_identity_fk','exam_marks_revision_actor_school_fk')");assert.equal(q.rowCount,2);
  });
  await check('repeated_source_migration_is_idempotent',async()=>{const r=await up({pool,runtimeRole:'apex_app_runtime'});assert.equal(r.existingMarksChanged,false)});
  await check('forged_school2_actor_rejected_by_principal_trigger',async()=>{assert.equal(await attempt({actor:22}),'42501')});
  await check('wrong_exam_student_subject_rejected',async()=>{assert.equal(await attempt({exam:999,student:888,subject:'Wrong Subject'}),'23503')});
  await check('genuine_matching_school1_fixture_allowed',async()=>{assert.equal(await attempt({actor:11,commit:true}),'ACCEPTED')});
  await check('same_school_teacher_rejected_at_database_trigger',async()=>{
   assert.equal(await attempt({actor:12}),'42501');
  });
  await check('inactive_same_school_principal_denied',async()=>{
   await pool.query('UPDATE public.users SET is_active=false WHERE id=11');
   try{assert.equal(await attempt({actor:11}),'42501')}
   finally{await pool.query('UPDATE public.users SET is_active=true WHERE id=11')}
  });
  await check('demoted_same_school_principal_denied',async()=>{
   await pool.query("UPDATE public.users SET role='admin' WHERE id=11");
   try{assert.equal(await attempt({actor:11}),'42501')}
   finally{await pool.query("UPDATE public.users SET role='principal' WHERE id=11")}
  });
  await check('append_only_trigger_refuses_audit_mutation',async()=>{
   let err;try{await pool.query('UPDATE public.exam_marks_revision_history SET new_marks=8 WHERE exam_result_id=101')}catch(e){err=e}assert.match(err?.message||'',/MARKS_AUDIT_APPEND_ONLY/)
  });
  await check('production_marks_fixture_unmodified',async()=>{const r=await pool.query('SELECT marks_obtained FROM exam_results WHERE school_id=1 AND id=101');assert.equal(Number(r.rows[0].marks_obtained),0)});
  console.log('FIXTURE_RESULT',JSON.stringify({passed,total:10,scope:'SYNTHETIC_POSTGRESQL16_UNIX_SOCKET_ONLY',actor_principal_signoff_verified:false,database_role_eligibility_enforced:true,production_mutations:0}));
 }finally{await pool.end()}
})().catch(e=>{console.error('FAIL',e?.stack||String(e));process.exitCode=1});
