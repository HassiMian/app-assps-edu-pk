#!/usr/bin/env node
'use strict'
/**
 * Read-only runtime RLS proof for Results tables introduced after the original
 * 2026-10-08 ASSPS app-runtime boundary. Never writes student or paper data.
 */
const {pool}=require('../al-siddique-backend/src/config/database')
const TABLES=['assessment_result_records','assessment_result_revisions']

async function verify(client) {
  const findings=[]
  const policies=(await client.query(
    `SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
             COUNT(p.policyname) FILTER (WHERE p.policyname='app_runtime_school_access'
                 AND p.roles::text LIKE '%apex_app_runtime%' AND p.permissive='PERMISSIVE') access_count,
             COUNT(p.policyname) FILTER (WHERE p.policyname='app_runtime_school_guard'
                 AND p.roles::text LIKE '%apex_app_runtime%' AND p.permissive='RESTRICTIVE') guard_count
      FROM pg_class c
      LEFT JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname
     WHERE c.relnamespace='public'::regnamespace
       AND c.relname=ANY($1::text[])
     GROUP BY c.relname,c.relrowsecurity,c.relforcerowsecurity
     ORDER BY c.relname`,[TABLES])).rows
  for(const name of TABLES){
    const policy=policies.find(p=>p.relname===name)
    if(!policy||!policy.relrowsecurity||!policy.relforcerowsecurity||
       Number(policy.access_count)!==1||Number(policy.guard_count)!==1)
      findings.push('MISSING_FORCED_RUNTIME_RLS:'+name)
  }
  const exposure={}
  await client.query('BEGIN READ ONLY')
  try {
    await client.query('SET LOCAL ROLE apex_app_runtime')
    const effective=(await client.query(
      'SELECT current_user AS role,(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS bypass'
    )).rows[0]
    if(effective.role!=='apex_app_runtime'||effective.bypass!==false)
      findings.push('RESTRICTED_RUNTIME_ROLE_NOT_EFFECTIVE')
    for(const [scope,tenant] of [['blank',''],['school1','1'],['school2','2']]){
      await client.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id',$1,true)",[tenant])
      for(const name of TABLES){
        const rows=(await client.query(
          'SELECT school_id,COUNT(*)::int AS count FROM public.'+name+' GROUP BY school_id'
        )).rows
        exposure[scope+':'+name]=rows.map(x=>({schoolId:x.school_id,count:x.count}))
        if(scope==='blank'&&rows.length) findings.push('BLANK_SCOPE_LEAK:'+name)
        if(tenant && rows.some(x=>String(x.school_id)!==tenant))
          findings.push('CROSS_TENANT_READ_LEAK:'+name+':'+scope)
      }
    }
    await client.query('ROLLBACK')
  } catch(err) {
    await client.query('ROLLBACK').catch(()=>{})
    findings.push('RUNTIME_RLS_QUERY_ERROR:'+(err.code||err.message))
  }
  return {gate:'ASSESSMENT_RESULTS_RUNTIME_RLS',safe:findings.length===0,
    testedTables:TABLES,policies:policies.map(p=>({name:p.relname,forced:p.relforcerowsecurity,
      access:Number(p.access_count),guard:Number(p.guard_count)})),
    exposure,findings}
}
async function main(){
  if(!String(process.env.DB_NAME||'').startsWith('assps_review_255_stage_'))
    throw Error('READ_ONLY_PROOF_REQUIRES_EXPLICIT_DISPOSABLE_STAGE_DB')
  const client=await pool.connect()
  try {
    const report=await verify(client)
    console.log(JSON.stringify(report,null,2))
    if(!report.safe)process.exitCode=2
  } finally {client.release();await pool.end()}
}
if(require.main===module)main().catch(async e=>{console.error('RESULTS_RLS_GATE_FAILED',e.message);process.exitCode=2;await pool.end()})
module.exports={verify,TABLES}
