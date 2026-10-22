'use strict'
// School-owner capability inheritance WITHOUT impersonation or platform privileges.
// Identity and the school binding must already be established by protect() from
// a signed token plus active user/tenant DB membership.
const INHERITABLE = new Set(['admin','principal'])
function canUseSchoolRole(actorRole, allowedRoles){
 const actor=String(actorRole||'').trim().toLowerCase()
 if (!actor || !Array.isArray(allowedRoles))return false
 if (allowedRoles.includes(actor))return true
 return actor==='owner' && allowedRoles.some(role=>INHERITABLE.has(role))
}
module.exports={canUseSchoolRole}
