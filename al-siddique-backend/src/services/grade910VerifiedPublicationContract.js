'use strict'
// Same stable canonical JSON algorithm as Academic Master detached Ed25519 attestation.
const crypto=require('node:crypto')
const HASH=/^[0-9a-f]{64}$/
function canonical(v){
 if(v===null)return 'null'
 if(typeof v==='string'||typeof v==='boolean')return JSON.stringify(v)
 if(typeof v==='number'){
  if(!Number.isFinite(v))throw Error('NONFINITE_PUBLICATION_VALUE')
  return JSON.stringify(v)
 }
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']'
 if(v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype){
  const keys=Object.keys(v).sort()
  if(keys.some(x=>['__proto__','constructor','prototype'].includes(x)))throw Error('UNSAFE_PUBLICATION_KEY')
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'
 }
 throw Error('INVALID_PUBLICATION_PAYLOAD')
}
const sha=x=>crypto.createHash('sha256').update(canonical(x),'utf8').digest('hex')
function eligible(r){
 if(!r||r.academic_approval_verified!==true||
    r.paper_studio_acceptance_verified!==true||r.core_restricted_release_verified!==true||
    !r.published_at||r.revoked_at||
    ![9,10].includes(Number(r.grade))||
    !Number.isSafeInteger(Number(r.question_revision))||Number(r.question_revision)<1||
    !r.paper_payload||typeof r.paper_payload!=='object'||Array.isArray(r.paper_payload)||
    !r.paper_payload.finalQuestion||!r.paper_payload.finalAnswer||
    typeof r.original_question_id!=='string'||!r.original_question_id)
  return false
 const hashes=[r.question_sha,r.answer_sha,r.original_source_pdf_sha,
  r.verified_review_packet_sha,r.qualified_faculty_receipt_sha,
  r.school_book_certificate_sha,r.principal_approval_sha,r.publication_grant_sha]
 if(!hashes.every(x=>HASH.test(String(x||''))))return false
 try{
  if(sha(r.paper_payload.finalQuestion)!==r.question_sha||
     sha(r.paper_payload.finalAnswer)!==r.answer_sha)return false
  if(r.paper_payload.originalQuestionId!==r.original_question_id||
     Number(r.paper_payload.questionRevision)!==Number(r.question_revision))return false
 }catch(_){return false}
 return true
}
module.exports={canonical,sha,eligible}
