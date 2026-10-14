'use strict'
// Fail closed until SaaS Core has issued an actual transaction-bound signed school envelope.
async function requireSignedSchool(schoolId, queryFn){
 if(!Number.isSafeInteger(Number(schoolId))||Number(schoolId)<1){
  const e=Error('SIGNED_SCHOOL_SCOPE_REQUIRED');e.status=403;e.code='SIGNED_SCHOOL_SCOPE_REQUIRED';throw e
 }
 let result
 try{
  result=await queryFn('SELECT core_security.signed_school_allowed($1::integer) AS allowed',[schoolId])
 }catch(_){
  const e=Error('CORE_SIGNED_SCHOOL_RUNTIME_NOT_CERTIFIED');e.status=503;e.code='CORE_SIGNED_SCHOOL_RUNTIME_NOT_CERTIFIED';throw e
 }
 if(result?.rows?.[0]?.allowed!==true){
  const e=Error('CORE_SIGNED_SCHOOL_CONTEXT_REQUIRED');e.status=503;e.code='CORE_SIGNED_SCHOOL_CONTEXT_REQUIRED';throw e
 }
 return true
}
module.exports={requireSignedSchool}
