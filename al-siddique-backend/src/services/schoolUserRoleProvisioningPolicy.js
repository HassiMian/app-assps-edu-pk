'use strict'
// Generic staff creation must NEVER enroll a new Owner or elevate itself.
// The Owner requires its own separately verified signed identity flow.
const STAFF=new Set(['teacher','parent','student','accountant'])
const PLATFORM_ALLOWED=new Set(['teacher','parent','student','accountant','admin','school_admin','principal'])
const NEVER_GENERIC=new Set(['owner','super_admin','saas_admin','platform_owner'])
function canCreateSchoolUser({actorRole,newRole}={}){
 const actor=String(actorRole||'').trim().toLowerCase()
 const desired=String(newRole||'').trim().toLowerCase()
 if(!desired||NEVER_GENERIC.has(desired))return false
 if(actor==='super_admin')return PLATFORM_ALLOWED.has(desired)
 if(actor==='admin')return STAFF.has(desired)
 return false
}
function canResetSchoolUserPassword({actorRole,targetRole}={}){
 const actor=String(actorRole||'').trim().toLowerCase()
 const role=String(targetRole||'').trim().toLowerCase()
 if(!role||NEVER_GENERIC.has(role))return false
 if(actor==='super_admin')return PLATFORM_ALLOWED.has(role)
 if(actor==='admin')return STAFF.has(role)
 return false
}
module.exports={canCreateSchoolUser,canResetSchoolUserPassword}
