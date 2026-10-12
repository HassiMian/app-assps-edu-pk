#!/usr/bin/env node
'use strict'
// Source-only readiness by default; require external private path config to certify ACTUAL files.
const pack=require('./build-grade910-blind-faculty-packets.cjs')
const html=require('./render-grade910-private-faculty-review.cjs')
const invalid=x=>{throw Error('ASSPS_GRADE910_PRIVATE_HUMAN_READINESS_'+x)}
const VARS=['ASSPS_QBANK_PRIVATE_REVIEW_BASE','ASSPS_QBANK_PRIVATE_REVIEW_RUN',
 'ASSPS_QBANK_PRIVATE_PRINT_RUN']
function validate(env=process.env){
 const original=pack.manifest()
 if(original.questionCount!==2580||original.facultyHeld!==1)
  invalid('SOURCE_ORIGINAL_COHORT_NOT_READY')
 const values=VARS.map(k=>env[k])
 const configured=values.filter(x=>typeof x==='string'&&x.length>0)
 if(configured.length!==0&&configured.length!==3)invalid('PARTIAL_PRIVATE_ARCHIVE_CONFIGURATION')
 let privateVerified=false,renderVerified=false,htmlCount=0
 if(configured.length===3){
  const [base,runId,renderId]=values
  const p=pack.verifyPrivateExport({base,runId})
  if(p.verifiedOriginalIds!==2580||p.heldNotExported!==1||!p.allShaVerified||
   p.realTeacherApproved!==0||p.published!==0)
    invalid('ACTUAL_FACULTY_ARCHIVE_NOT_VERIFIED')
  privateVerified=true
  const proof=html.verifyRendered({base,runId,renderId})
  if(proof.privateCandidates!==2580||proof.heldOutside!==1||
    proof.verifiedHtmlFiles!==501||proof.academicApproved!==0||
    proof.studentPublication!==false)
    invalid('ACTUAL_PRINTABLE_REVIEW_ARCHIVE_NOT_VERIFIED')
  htmlCount=proof.verifiedHtmlFiles;renderVerified=true
 }
 return{
  schemaVersion:'assps-grade910-private-faculty-full-source-readiness-v1',
  originalResearchCandidates:2581,sourceLockedPrivateTeacherCandidates:2580,
  qualifiedFacultyHeldOutOfPacket:1,
  privateReviewArchiveVerified:privateVerified,
  privatePrintableOfflineHtmlVerified:renderVerified,
  privatePrintableHtmlFilesVerified:htmlCount,
  gradeAndSubjectSchoolAdoptionAuthenticated:false,
  realQualifiedReviewSignaturesAuthenticated:0,
  studentBankAcademicallyApproved:0,verifiedPublished:0,
  publisherSelectable:false,academicPublication:'HOLD',
  note:configured.length===0?'Only original/source readiness checked: no external private archive was configured':
   'Full real external private archive and printable HTML content hashes verified; no approval implied'
 }
}
if(require.main===module){
 try{console.log(JSON.stringify(validate(),null,2))}
 catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={validate,VARS}
