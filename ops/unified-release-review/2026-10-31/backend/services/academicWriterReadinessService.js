'use strict'
// Fail-closed capability check only. Must never grant roles, sign human approvals,
// execute a synthetic authorization or bypass academic RLS.
const REQUIRED_FLAGS=[
 'DB_SIGNED_TENANT_RLS_ENABLED',
 'DB_ENFORCE_LEAST_PRIVILEGE_LOGIN',
 'DB_AUTH_USE_SIGNED_TENANT_CONTEXT',
]
function gateFlags(env=process.env){
 return REQUIRED_FLAGS.every(k=>env[k]==='true')
   && String(env.DB_SIGNED_TENANT_HMAC_KEY||'').length>=32
}
async function inspectSignedAcademicWriter(client,env=process.env){
 const reply=await client.query(`
  SELECT has_table_privilege(current_user,
        'public.school_academic_approval_events','INSERT') AS audit_insert,
    COALESCE((SELECT NOT rolsuper AND NOT rolbypassrls
       FROM pg_roles WHERE rolname=current_user),false) AS non_bypass,
    COALESCE((SELECT relrowsecurity AND relforcerowsecurity
       FROM pg_class WHERE oid='public.school_academic_approval_events'::regclass),false) AS force_rls
 `)
 const role=reply.rows?.[0]||{}
 const signaturesConfigured=gateFlags(env)
 const technicalReady=signaturesConfigured&&role.audit_insert===true&&role.non_bypass===true&&role.force_rls===true
 return {
   technicalReady,
   status:technicalReady?'TECHNICAL_PREFLIGHT_ONLY_NEEDS_AUTHORIZED_REAL_WORLD_ACCEPTANCE':'SIGNED_ACADEMIC_WRITER_NOT_READY',
   policy:'DENY_UNLESS_SIGNED_NON_BYPASS_TENANT_WRITER',
   independentHumanAcceptanceConfirmed:false,
   signedSourceEvidenceStillRequired:true,
   wouldGrantAcademicApproval:false,
 }
}
module.exports={gateFlags,inspectSignedAcademicWriter}
