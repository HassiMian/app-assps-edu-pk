#!/usr/bin/env node
'use strict'
const { summarize } = require('./verify-source-evidence.cjs')
const SCHOOL_CODE=/^[a-z][a-z0-9-]{1,63}$/
function parseArgs(argv) {
  const args=Object.fromEntries(argv.filter((v,i)=>v.startsWith('--')&&i+1<argv.length && !argv[i+1].startsWith('--'))
     .map(k=>[k,argv[argv.indexOf(k)+1]]))
  const schoolId=Number(args['--school-id']),schoolCode=args['--school-code']
  if(!Number.isInteger(schoolId)||schoolId<1||!SCHOOL_CODE.test(schoolCode||'')) {
    throw Error('SCHOOL_ID_AND_EXACT_CODE_REQUIRED')
  }
  if(!process.env.DB_NAME||!process.env.DB_NAME.startsWith('assps_qbank_intake_stage_'))
    throw Error('AUDIT_REQUIRES_DISPOSABLE_DB_NAME_PREFIX')
  if(process.env.DB_RUNTIME_ROLE!=='apex_app_runtime')
    throw Error('AUDIT_REQUIRES_RESTRICTED_RUNTIME_ROLE')
  return {schoolId,schoolCode}
}
async function main(){
  const {schoolId,schoolCode}=parseArgs(process.argv.slice(2))
  const {pool,tenantContext}=require('../../al-siddique-backend/src/config/database')
  try {
    const result=await tenantContext.run({
      rlsEnabled:true,tenantId:schoolId,tenantKey:schoolCode,isSuperAdmin:false,
    },async()=>{
      const client=await pool.connect()
      try{
        await client.query('BEGIN READ ONLY')
        const state=(await client.query('select current_database() as db, current_user as role')).rows[0]
        if(state.db!==process.env.DB_NAME||state.role!=='apex_app_runtime')
          throw Error('DB_OR_EFFECTIVE_ROLE_MISMATCH')
        const school=(await client.query('select code from schools where id=$1',[schoolId])).rows[0]
        if(!school||school.code!==schoolCode)throw Error('SCHOOL_CONTEXT_IDENTITY_MISMATCH')
        const records=(await client.query(
          `SELECT id,class_level,subject,medium,question_type,correct_option,
                  is_approved,is_duplicate,source_page_no,metadata
             FROM question_bank WHERE school_id=$1 AND class_level = ANY($2::text[])
             ORDER BY class_level,subject,id`,
          [schoolId,['9th','10th']]
        )).rows
        await client.query('COMMIT')
        return {schoolId,schoolCode,database:state.db,role:state.role,...summarize(records)}
      }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
      finally{await client.release()}
    })
    console.log(JSON.stringify(result,null,2))
    if(result.academicallyReady===0)process.exitCode=2
  } finally{await pool.end()}
}
if(require.main===module)main().catch(e=>{
 console.error('TENANT_CATALOG_AUDIT_FAIL',e.message);process.exitCode=2
})
module.exports={parseArgs}
