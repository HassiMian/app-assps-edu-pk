'use strict'
// Verified original private evidence is NOT teacher/Principal sign-off.
// This service exposes only low-risk source metadata to authenticated school administrators.
const fs=require('node:fs')
const crypto=require('node:crypto')
const FILE='/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json'
const PIN='4d2ccdce5ec644750a530c890df5a0a41eaee5b76f1e4ba47d912617db5c0cda'
const INCLUDED=new Set(['starter','mover','flyer','one','two','three','four','five','six','seven'])
const canonical=value=>String(value||'').trim().toLowerCase()
function reviewOriginalLessonSources(schoolId){
 if(Number(schoolId)!==1)return {error:'ASSPS_SCHOOL_SCOPE_REQUIRED'}
 let content
 try{content=fs.readFileSync(FILE)}catch{return {error:'PRIVATE_ORIGINAL_SOURCE_UNAVAILABLE'}}
 const sha=crypto.createHash('sha256').update(content).digest('hex')
 if(sha!==PIN)return {error:'PRIVATE_SOURCE_PIN_MISMATCH'}
 let original
 try{original=JSON.parse(content.toString('utf8'))}catch{return {error:'PRIVATE_SOURCE_JSON_INVALID'}}
 if(!Array.isArray(original.candidates)||original.candidates.length!==59)return {error:'PRIVATE_SOURCE_CANDIDATE_COUNT_DRIFT'}
 const inScope=original.candidates.filter(x=>INCLUDED.has(canonical(x.class_display)))
 const outOfScope=original.candidates.filter(x=>!INCLUDED.has(canonical(x.class_display)))
 if(inScope.length!==57||outOfScope.length!==2)return {error:'ACADEMIC_TERM_CLASS_SCOPE_DRIFT'}
 if(inScope.some(x=>x.review_state!=='AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA'||x.publish_status!=='BLOCKED'||x.approval_signature)){
  return {error:'ACADEMIC_REVIEW_SOURCE_STATE_DRIFT'}
 }
 const candidates=inScope.map(x=>({
    evidenceId:String(x.candidate_key||'').slice(0,120),
    className:String(x.class_display||'').slice(0,50),
    subject:String(x.source_subject_label||'').slice(0,160),
    sourceReferences:(Array.isArray(x.source_submissions)?x.source_submissions:[]).map(v=>String(v).slice(0,100)),
    textbookTitle:x.textbook_title?String(x.textbook_title).slice(0,160):null,
    textbookEdition:x.textbook_edition?String(x.textbook_edition).slice(0,80):null,
    blockingReasons:(Array.isArray(x.blocking_reasons)?x.blocking_reasons:[]).map(v=>String(v).slice(0,120)),
    reviewedByAuthenticatedTeacher:false,
    principalApproval:false,
    publicationStatus:'BLOCKED_PENDING_OFFICIAL_TEXTBOOK_AND_SIGNED_REVIEW'
 }))
 const counts={}
 for(const c of candidates)counts[c.className]=(counts[c.className]||0)+1
 return {success:true,data:{
    schoolId:1,sourceSha256:sha,totalOriginalCandidates:59,inScopeCandidateCount:57,
    excludedClassEight:outOfScope.some(x=>canonical(x.class_display)==='eight')?1:0,
    deferredPreNine:outOfScope.some(x=>canonical(x.class_display)==='pre-nine')?1:0,
    inScopeCounts:counts,candidates,
    stagingWrites:0,academicApprovalsGranted:0,
    certification:'HOLD_AWAITING_ORIGINAL_PAGE_SOURCE_AND_SIGNED_PRINCIPAL_REVIEW'
 }}
}
module.exports={reviewOriginalLessonSources}
