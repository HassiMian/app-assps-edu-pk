#!/usr/bin/env node
'use strict'
// Source-only gate: do not conflate 2,581 research candidates with academically
// approved or teacher-accessible Paper Studio revisions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root=path.resolve(__dirname,'../..'),doc=path.join(root,'docs/question-bank')
const INPUT=path.join(doc,'ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
const OUTPUT=path.join(doc,'ASSPS_GRADE910_2581_PUBLICATION_DENIAL_WALL_20261015.json')
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const deny=e=>{throw Error('GRADE910_2581_PUBLICATION_WALL_'+e)}
function verify(x,{checkTracked=true}={}){
 if(x.schema!=='assps-grade910-2581-public-safe-source-revision-review-crosswalk-v1'||
  x.rows?.length!==2581||x.groups?.length!==56)
  deny('FROZEN_SOURCE_NOT_COMPLETE')
 if(x.metrics.flaggedCandidates!==584||x.metrics.baselineNoNewEditorialProposal!==1997||
  x.metrics.mcqSpecificOptionRevisions!==66)
  deny('EDUCATIONAL_REVIEW_COUNTS_DRIFT')
 const duplicates=new Set(),groups=new Map(),proposals=[]
 for(const item of x.rows){
  if(!/^[0-9a-f]{64}$/.test(item.originalRevisionSha256||'')||
   !/^[0-9a-f]{64}$/.test(item.originalResearchFileSha256||''))
   deny('ORIGINAL_SOURCE_NOT_SEALED')
  if(duplicates.has(item.questionId))deny('DUPLICATE_ID_'+item.questionId)
  duplicates.add(item.questionId)
  if(item.approved!==false||item.published!==false||
   item.paperStudioSelectable!==false||item.schoolAdoptionVerified!==false||
   item.independentHumanAccuracyReview!==false||item.reviewerIdentityVerified!==false||
   item.schoolPrincipalAuthenticatedApproval!==false)
   deny('UNAUTHENTICATED_QUESTION_PUBLICATION_'+item.questionId)
  if(item.proposedRevisionSha256)proposals.push(item)
  groups.set(item.groupKey,(groups.get(item.groupKey)||0)+1)
  for(const sensitive of ['stem','questionText','options','correctAnswer','studentName',
   'reviewerSignature','signatureImage','answerKey']){
   if(Object.hasOwn(item,sensitive))deny('PUBLIC_METADATA_CONTAINS_SENSITIVE_FIELD')
  }
 }
 for(const group of x.groups){
  if(groups.get(group.groupKey)!==group.sourceResearchQuestions)
   deny('GROUP_ASSIGNMENT_DRIFT_'+group.groupKey)
 }
 if(proposals.length!==66||groups.size!==56)
  deny('ORIGINAL_REVIEW_GROUPS_NOT_EXACT')
 const tracked=checkTracked?cp.execFileSync('git',['ls-files','--',
  'docs/question-bank/ASSPS_GRADE910_66_*FACULTY*html',
  'docs/question-bank/ASSPS_GRADE910_66_*MANIFEST*json',
  '.assps-private-reviews'],{cwd:root,encoding:'utf8'}).trim():''
 if(tracked)deny('CONFIDENTIAL_FACULTY_HTML_TRACKED_IN_PUBLIC_REPOSITORY')
 return{
  schema:'assps-grade910-2581-source-academic-release-wall-v1',
  originalQuestions:duplicates.size,subjectMediumReviewGroups:groups.size,
  researchCandidatesWithPreReviewEvidence:x.metrics.flaggedCandidates,
  unflaggedOriginals:x.metrics.baselineNoNewEditorialProposal,
  revisedMcqProposals:proposals.length,
  actualSchoolAdoptionEvidenceVerified:0,
  independentQualifiedTeacherApprovalVerified:0,
  principalGenuineRevisionSignoffsVerified:0,
  paperStudioVerifiedSelectorReady:0,
  answerBearingFacultyReviewsTrackedInPublicSource:0,
  approved:0,published:0,productionWrites:0,
  decision:'HOLD_SOURCE_ONLY_NO_PAPER_STUDIO_APPROVED_QUESTION_EXPORT'
 }
}
function write(){
 const raw=fs.readFileSync(INPUT),data=JSON.parse(raw),result=verify(data)
 const record={...result,crosswalkSha256:sha(raw),
  signoff:'NONE_EXPECTED_OR_PRESENT',
  unresolvedEvidence:['ASSPS_APPROVED_PRINTED_TEXTBOOK_EDITION',
   'YEAR_2027_BOARD_NOTIFIED_SCHEME_APPLICABLE_TO_ASSPS',
   'SUBJECT_AND_URDU_QUALIFIED_INDEPENDENT_TEACHER_REVIEW',
   'AUTHENTICATED_PRINCIPAL_PERSONAL_SIGNATURE_TO_EXACT_QUESTION_REVISION',
   'SAAS_CORE_RLS_BACKUP_ROLLBACK_AND_REAL_TENANT_ACCEPTANCE',
   'PAPER_STUDIO_LIVE_SAVE_REOPEN_EDIT_PRINT_REVISION_REAUTHENTICATION']}
 fs.writeFileSync(OUTPUT,JSON.stringify(record,null,2)+'\n')
 return{...result,digest:sha(fs.readFileSync(OUTPUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={verify,write,INPUT,OUTPUT}
