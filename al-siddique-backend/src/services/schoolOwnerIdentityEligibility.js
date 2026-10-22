'use strict'
// Gate for reviewing potential Owner account linkage ONLY.
// A matching name, a blank phone, an unchecked email or an Admin designation
// NEVER grants Owner access. Genuine multi-factor verification is external.
const normEmail=v=>String(v??'').trim().toLowerCase()
const normPhone=v=>String(v??'').replace(/\D/g,'')
const normalizeSchoolId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null
function evaluateOwnerClaimCandidate({school,user,proof}={}){
 const reason=[]
 const sid=normalizeSchoolId(school?.id),uid=normalizeSchoolId(user?.id)
 if(!sid||!uid||normalizeSchoolId(user?.school_id)!==sid)reason.push('SCHOOL_USER_MISMATCH')
 if(user?.is_active!==true)reason.push('ACTIVE_SCHOOL_ACCOUNT_REQUIRED')
 if(!['active','trial'].includes(String(school?.status||'').toLowerCase()))reason.push('SCHOOL_NOT_ACTIVE')
 const expectedEmail=normEmail(school?.owner_verified_email)
 const userEmail=normEmail(user?.email)
 const expectedPhone=normPhone(school?.owner_verified_phone)
 const userPhone=normPhone(user?.phone)
 const emailMatch=expectedEmail.includes('@')&&userEmail===expectedEmail
 const phoneMatch=expectedPhone.length>=10&&userPhone.length>=10&&
   expectedPhone.slice(-10)===userPhone.slice(-10)
 if(!emailMatch&&!phoneMatch)reason.push('VERIFIED_OWNER_CONTACT_MATCH_REQUIRED')
 if(proof?.freshSignedUserSession!==true)reason.push('FRESH_SIGNED_SCHOOL_SESSION_REQUIRED')
 if(proof?.independentOwnerContactChallenge!==true)reason.push('INDEPENDENT_OWNER_CHALLENGE_REQUIRED')
 if(proof?.institutionalOwnershipAttested!==true)reason.push('OWNERSHIP_ATTESTATION_REQUIRED')
 if(proof?.differentSchoolDenied!==true)reason.push('PEER_SCHOOL_DENIAL_REQUIRED')
 return Object.freeze({eligibleForHumanAuthorizedProvisioning:reason.length===0,
  automaticallyPromoted:false,sourceRole:String(user?.role||''),schoolId:sid,
  userId:uid,reasons:Object.freeze(reason)})
}
module.exports={evaluateOwnerClaimCandidate}
