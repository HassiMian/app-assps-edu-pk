#!/usr/bin/env node
'use strict'
// Bridge authoring-risk research to existing ROOT-PRIVATE, UNSIGNED teacher packets.
// Source-only metadata: never certifies an answer, reviewer or school approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const CORE=require('./verify-grade910-private-all2581-delivery-20261015.cjs')
const ROOT=path.resolve(__dirname,'../..'),DOC=path.join(ROOT,'docs/question-bank')
const RISK=path.join(DOC,'ASSPS_GRADE910_2581_SOURCE_SHA_ACADEMIC_QUALITY_RISK_TRIAGE_20261015.json')
const PUBLIC=path.join(DOC,'ASSPS_GRADE910_2581_FACULTY_QUALITY_OVERLAY_ATTESTATION_20261015.json')
const NAME='PRIVATE_FACULTY_SOURCE_RISK_PRIORITY_20261015.json'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const bad=x=>{throw Error('ASSPS_GRADE910_FACULTY_PRIORITY_'+x)}
const privateFile=(base,name)=>path.join(CORE.safeDir(base),name)
function assemble({base,runId}){
 const confirmed=CORE.verifyFrozen({base,runId})
 const riskBytes=fs.readFileSync(RISK),risk=JSON.parse(riskBytes)
 const handoffBytes=fs.readFileSync(privateFile(base,'PRIVATE_HANDOFF_GROUP_CROSSWALK.json'))
 const handoff=JSON.parse(handoffBytes)
 if(risk.schema!=='assps-grade910-all2581-answer-quality-and-paper-studio-risk-triage-v1'||
    risk.sourceQuestions?.length!==2581||risk.gradeSubjectMediumGroups?.length!==56||
    handoff.groups?.length!==56||handoff.sourceReviewGroups!==56||
    sha(handoffBytes)!==confirmed.verifiedPrivateGroupSha256||
    handoff.candidateReviewCrosswalkSha256!==risk.sourceCrosswalkSha256)
  bad('FROZEN_SOURCE_AND_PRIVATE_CUSTODY_MISMATCH')
 const sources=new Map(risk.sourceQuestions.map(q=>[q.questionId,q]))
 if(sources.size!==2581)bad('DUPLICATED_RISK_SOURCE')
 const seen=new Set(),groups=[],allSignals=new Map()
 for(const g of handoff.groups){
  const items=[]
  for(const ref of g.refs){
   const s=sources.get(ref.id)
   if(!s||seen.has(ref.id)||s.originalRevisionSha256!==ref.originalRevisionSha256||
      s.reviewGroupKey!==g.groupKey)bad('QUESTION_SOURCE_REVISION_OR_GROUP_DRIFT')
   seen.add(ref.id)
   for(const flag of s.flags)allSignals.set(flag,(allSignals.get(flag)||0)+1)
   items.push({originalId:ref.id,sourceQuestionRevisionSha256:s.originalRevisionSha256,
    sourceFileSha256:s.originalResearchFileSha256,priorityScore:s.editorialPriorityScore,
    nonAuthoritativeRiskCodes:s.flags,privateBatch:ref.batchFileStem,
    privateFacultyTemplate:ref.facultyTemplate,blindReviewCompleted:false,
    qualifiedReviewerValidated:false,referenceAnswerIndependentVerification:false,
    paperStudioSelectable:false})
  }
  items.sort((a,b)=>b.priorityScore-a.priorityScore||a.originalId.localeCompare(b.originalId))
  groups.push({groupKey:g.groupKey,grade:g.grade,subject:g.subject,medium:g.medium,
   originalCandidates:g.originalResearchItems,awaitingFaculty:items.length,
   sourceHeld:g.excludedHeld,items})
 }
 if(seen.size!==2580||groups.reduce((a,g)=>a+g.awaitingFaculty,0)!==2580)bad('PACKET_COVERAGE_CHANGED')
 const held=risk.sourceQuestions.filter(x=>!seen.has(x.questionId))
 if(held.length!==1||held[0].questionId!=='X-CHEM-C23-L01'||
    !held[0].flags.includes('FACULTY_HELD_INCOMPLETE_SUBSTANTIVE_ANSWER'))
  bad('HELD_SOURCE_WRONG_OR_FORCED_APPROVAL')
 return{
  schemaVersion:'assps-grade910-private-source-revision-editorial-risk-priority-v1',
  candidateOriginals:2581,privateReviewReady:2580,
  schoolReviewGroups:56,unresolvedChemistrySourceId:held[0].questionId,
  entireResearchRiskSha256:sha(riskBytes),privateFacultyGroupIndexSha256:sha(handoffBytes),
  signals:Object.fromEntries([...allSignals.entries()].sort(([a],[b])=>a.localeCompare(b))),
  genuineTeacherReviews:0,genuineBookAdoptions:0,
  academicallyApproved:0,published:0,productionWrites:0,
  status:'PRIVATE_REVIEW_PRIORITY_ONLY_NOT_HUMAN_VERIFIED',
  groups
 }
}
function guardedWrite({base,runId}){
 const data=assemble({base,runId}),file=privateFile(base,NAME)
 if(fs.existsSync(file))bad('IMMUTABLE_PRIORITY_FILE_ALREADY_EXISTS')
 const bytes=JSON.stringify(data,null,2)+'\n'
 fs.writeFileSync(file,bytes,{mode:0o600,flag:'wx'})
 const receipt={
  schemaVersion:'assps-grade910-public-safe-private-teacher-priority-custody-v1',
  sourceOriginals:2581,privateFacultyQuestions:2580,
  reviewGroups:56,heldIncompleteOriginal:data.unresolvedChemistrySourceId,
  originalRiskDocketSha256:data.entireResearchRiskSha256,
  privatePrioritySha256:sha(bytes),
  teacherReviewed:0,schoolBooksAdoptedAuthenticated:0,
  academicallyApproved:0,published:0,
  publicationStatus:'HOLD_PENDING_AUTHENTICATED_HUMAN_EVIDENCE'
 }
 fs.writeFileSync(PUBLIC,JSON.stringify(receipt,null,2)+'\n')
 return receipt
}
function verify({base,runId}){
 const f=privateFile(base,NAME),s=fs.lstatSync(f)
 if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)!==0||s.uid!==process.getuid())
  bad('INSECURE_PRIVATE_RISK_FILE')
 const bytes=fs.readFileSync(f),expected=JSON.stringify(assemble({base,runId}),null,2)+'\n'
 if(bytes.toString('utf8')!==expected)bad('PRIVATE_RISK_CHECKSUM_OR_REVIEW_IDENTITY_DRIFT')
 const receipt=JSON.parse(fs.readFileSync(PUBLIC))
 if(receipt.privatePrioritySha256!==sha(bytes)||receipt.teacherReviewed!==0||
    receipt.academicallyApproved!==0||receipt.published!==0)
  bad('PUBLIC_SCHOOL_APPROVAL_PRETENDED')
 return{sha256:sha(bytes),originals:2581,privateQuestions:2580,
  groups:56,authenticatedSchoolReviews:0,approved:0,published:0}
}
if(require.main===module){
 const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]}
 const p={base:get('--base'),runId:get('--run-id')}
 console.log(JSON.stringify(args.includes('--write')?guardedWrite(p):verify(p)))
}
module.exports={assemble,guardedWrite,verify,PUBLIC,NAME}
