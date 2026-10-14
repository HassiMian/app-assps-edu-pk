#!/usr/bin/env node
'use strict'
// Read-only, offline, restricted teacher submission intake; never grants academic authority.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const packets=require('./build-grade910-blind-faculty-packets.cjs')
const signs=require('./verify-grade910-institutional-signatures.cjs')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const err=s=>{throw Error('ASSPS_GRADE910_FACULTY_SUBMISSION_'+s)}
const shaRe=/^[0-9a-f]{64}$/,dateRe=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/
const DISPOSITIONS=['needs-source-proof','needs-question-revision','needs-answer-revision',
 'recommend-independent-verification']
const DOC=path.resolve(__dirname,'../../')
function timestamp(s){return typeof s==='string'&&dateRe.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19)}
function secureDir(d){
 if(typeof d!=='string'||!path.isAbsolute(d))err('ABSOLUTE_PRIVATE_REVIEW_DIRECTORY_REQUIRED')
 const full=path.resolve(d),relative=path.relative(DOC,full)
 if(relative===''||relative==='..'||(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative)))
  err('CANNOT_READ_FACULTY_SUBMISSIONS_INSIDE_REPOSITORY')
 const st=fs.lstatSync(full)
 if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid()||
   (st.mode&0o077)!==0||fs.realpathSync(full)!==full)err('PRIVATE_FACULTY_DIRECTORY_UNTRUSTED')
 return full
}
function requireRef(value){return typeof value==='string'&&value.length>0&&value.length<=512&&value.trim()===value}
function inspect(x,lookup){
 if(!x||typeof x!=='object'||Array.isArray(x)||
  x.schemaVersion!=='assps-grade910-offline-subject-review-v1')err('INVALID_TEACHER_REVIEW_SCHEMA')
 const row=lookup.get(x.originalQuestionId)
 if(!row||packets.HIDDEN.has(x.originalQuestionId)||
  x.originalQuestionRevisionSha256!==row.row.originalQuestionRevisionSha256||
  x.originalSourceFileSha256!==row.row.originalSourceFileSha256)
  err('UNKNOWN_STALE_OR_RESTRICTED_QUESTION_REVISION')
 if(!requireRef(x.reviewerClaimId)||x.reviewerClaimId===row.source.q.authorId)
  err('INDEPENDENT_REVIEWER_CLAIM_MISSING_OR_AUTHOR')
 if(!timestamp(x.completedAt)||Date.parse(x.completedAt)>Date.now()+60000)
  err('INVALID_REVIEW_TIMESTAMP')
 if(!requireRef(x.academicSessionClaim)||!DISPOSITIONS.includes(x.disposition)||
   !requireRef(x.independentAnswerBeforeReference))
  err('INVALID_OFFLINE_FACULTY_DECISION')
 if(!Array.isArray(x.checks)||x.checks.length!==8||
   new Set(x.checks.map(c=>c?.name)).size!==8)
  err('EIGHT_INDEPENDENT_REVIEW_CHECKS_REQUIRED')
 const tally={passed:0,failed:0,pending:0}
 for(const name of signs.REVIEW_CHECKS){
  const c=x.checks.find(z=>z?.name===name)
  if(!c||!['passed','failed','pending'].includes(c.status)||
   (c.status==='passed'&&!shaRe.test(String(c.evidenceSha256||'')))||
   (c.status!=='passed'&&c.evidenceSha256!=null))
   err('INVALID_FACULTY_CRITERION_'+name)
  tally[c.status]++
 }
 if(x.disposition==='recommend-independent-verification'&&
   (tally.passed!==8||!requireRef(x.adoptedTextbookTitleClaim)||
    !requireRef(x.adoptedTextbookEditionClaim)||!Number.isInteger(x.applicableExamYearClaim)||
    x.applicableExamYearClaim<2026||x.applicableExamYearClaim>2100||
    !shaRe.test(String(x.schoolAdoptionProofHashClaim||''))||
    !shaRe.test(String(x.finalQuestionRevisionSha256Claim||''))||
    !shaRe.test(String(x.finalAnswerRevisionSha256Claim||''))))
   err('RECOMMENDATION_REQUIRES_COMPLETE_CLAIMED_PROOF_FIELDS')
 if(x.academicallyApproved===true||x.published===true||x.verifiedPaperStudioSelectable===true||
   x.signatureAuthenticated===true)
   err('UNSIGNED_TEACHER_CANNOT_CLAIM_INSTITUTIONAL_APPROVAL')
 return {originalQuestionId:x.originalQuestionId,
  originalQuestionRevisionSha256:x.originalQuestionRevisionSha256,
  disposition:x.disposition,checks:tally,
  hasClaimedSchoolBook:x.disposition==='recommend-independent-verification',
  reviewerIdentityAuthenticated:false,academicAnswerCorrectnessIndependentlyAuthenticated:false,
  schoolAuthorityVerified:false,academicApproved:false,verifiedPublished:false,
  paperStudioVerifiedSelectable:false}
}
function originalIndex(){
 const i=packets.inventory(),index=new Map()
 for(const row of i.queue.rows){
  const source=i.candidates.get(row.originalQuestionId)
  if(!source)err('ORIGINAL_COHORT_INCOMPLETE')
  index.set(row.originalQuestionId,{row,source})
 }
 if(index.size!==2581)err('SOURCE_BASELINE_COUNT_DRIFT')
 return index
}
function aggregate({reviewDir}){
 const dir=secureDir(reviewDir),baseline=originalIndex(),seen=new Set(),records=[]
 const entries=fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))
 if(entries.length>2580)err('TOO_MANY_PRIVATE_SUBMISSIONS')
 for(const entry of entries){
  if(!entry.isFile()||entry.isSymbolicLink()||
    !/^[A-Za-z0-9_-]{3,180}\.faculty-review\.json$/.test(entry.name))err('UNTRUSTED_FACULTY_FILE_NAME')
  const file=path.join(dir,entry.name),st=fs.lstatSync(file)
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||
    (st.mode&0o077)!==0||st.size<20||st.size>256*1024)err('PRIVATE_FACULTY_FILE_PERMISSIONS_OR_SIZE')
  const bytes=fs.readFileSync(file)
  let candidate
  try{candidate=JSON.parse(bytes.toString('utf8'))}catch(e){err('INVALID_FACULTY_JSON')}
  if(seen.has(candidate.originalQuestionId))err('DUPLICATE_FACULTY_SUBMISSION_QUESTION')
  seen.add(candidate.originalQuestionId)
  records.push({...inspect(candidate,baseline),privateRecordDigest:sha(bytes)})
 }
 const counts=Object.fromEntries(DISPOSITIONS.map(k=>[k,records.filter(r=>r.disposition===k).length]))
 if(records.length>2580||records.length+1>2581)err('UNTRUSTED_REVIEW_COUNT')
 return{schemaVersion:'assps-grade910-untrusted-human-research-intake-audit-v1',
  candidateCount:2581,teacherPacketEligible:2580,facultyHeldOriginals:1,
  unsignedTeacherResponsesReceived:records.length,
  unansweredFacultyItems:2580-records.length,
  claimedDispositionCounts:counts,claimedCompletionDoesNotVerifyIdentity:true,
  authenticatedIndependentTeacherReviews:0,schoolAdoptionCertificatesVerified:0,
  schoolApprovalsVerified:0,academicallyApproved:0,verifiedPublished:0,
  paperStudioVerifiedSelectable:0,
  releaseDecision:'DENY_PENDING_REAL_INSTITUTIONAL_AUTHENTICATION',
  originalShaFrozen:true,originalQuestionTextReproduced:false,
  rows:records}
}
if(require.main===module){
 try{
  const dir=process.env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR
  if(!dir){console.log(JSON.stringify({configured:false,received:0,
    academicApprovals:0,release:'HOLD',noSchoolSubmissionDataRead:true}))}
  else{
   const v=aggregate({reviewDir:dir})
   console.log(JSON.stringify({configured:true,received:v.unsignedTeacherResponsesReceived,
    unanswered:v.unansweredFacultyItems,dispositionCounts:v.claimedDispositionCounts,
    authenticatedReviews:0,academicallyApproved:0,published:0,publication:'HOLD'}))
  }
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={inspect,aggregate,originalIndex,secureDir,DISPOSITIONS}
