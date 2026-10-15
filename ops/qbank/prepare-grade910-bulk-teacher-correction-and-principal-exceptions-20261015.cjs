#!/usr/bin/env node
'use strict'
// Translate the entire frozen 2581-source structural QA into ONE faculty
// batch roster and ONE principal exception view. Not approvals or assignments.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const audit=require('./audit-grade910-bulk-objective-answer-readiness-20261015.cjs')
const sources=require('./attest-grade910-all-original-candidate-revisions.cjs')
const ROOT=path.resolve(__dirname,'../..'),DIR=path.join(ROOT,'docs/question-bank')
const RECEIPT=path.join(DIR,'ASSPS_GRADE910_BULK_TEACHER_CORRECTION_PRINCIPAL_EXCEPTION_ATTESTATION_20261015.json')
const TEACHER='PRIVATE_56_FACULTY_AUTO_QA_BATCH_AND_CORRECTION_QUEUE_20261015.json'
const PRINCIPAL='PRIVATE_PRINCIPAL_DECISION_ONLY_NO_QUESTION_BY_QUESTION_20261015.html'
const QA='ASSPS_GRADE910_2581_BULK_OBJECTIVE_ANSWER_SCREENING_20261015.json'
const SCREEN='principal-preliminary-screenings'
const PRIOR='20261015-biology9-ch1-t11-batch01-selfreported.json'
const LATEST='20261015-biology9-ch1-t11-batch01-user-correction-v2.json'
const FULL='PRIVATE_FULL_2580_FACULTY_REVIEW_START_HERE.html'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const fail=x=>{throw Error('ASSPS_GRADE910_BULK_HUMAN_ROUTING_'+x)}
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
function privatePath(d){
 if(typeof d!=='string'||!path.isAbsolute(d))fail('PRIVATE_ABSOLUTE_PATH_REQUIRED')
 const s=fs.lstatSync(d),relative=path.relative(ROOT,d)
 if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||
  (s.mode&0o077)!==0||!relative.startsWith('..'))fail('UNSAFE_PRIVATE_CUSTODY')
 return d
}
function safeRead(dir,name){
 if(!/^[a-zA-Z0-9_.-]{3,180}$/.test(name))fail('UNSAFE_PRIVATE_FILE_NAME')
 const file=path.join(dir,name),st=fs.lstatSync(file)
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid()||
  (st.mode&0o077)!==0||st.size>128*1024)fail('UNTRUSTED_OWNER_ONLY_SCREENING')
 const b=fs.readFileSync(file)
 try{return {data:JSON.parse(b),sha256:sha(b)}}catch{fail('INVALID_JSON')}
}
function validatePrincipalScreening(root){
 const dir=privatePath(path.join(root,SCREEN)),initial=safeRead(dir,PRIOR),final=safeRead(dir,LATEST)
 if(final.data.schema!=='assps-grade910-chat-preliminary-screening-amendment-v1'||
  final.data.supersedesReceiptSha256!==initial.sha256||final.data.batch!==1||
  final.data.actorIdentityVerified!==false||final.data.institutionalPrincipalAuthenticated!==false||
  final.data.independentlyApproved!==0||final.data.published!==0||
  final.data.paperStudioSelectable!==false||final.data.screeningPositiveUnverifiedCount!==3||
  !Array.isArray(final.data.reviewedQuestions)||final.data.reviewedQuestions.length!==3||
  final.data.reviewedQuestions.some(q=>q.userFeedback!=='sahi'||
   q.screeningStatus!=='self_reported_positive_unverified'||
   q.qualifiedIndependentReviewerVerified!==false||
   q.officialAcademicReviewComplete!==false||
   q.questionApproved!==false||q.published!==false))
  fail('FALSE_SCHOOL_APPROVAL_FROM_CHAT_FEEDBACK')
 const ids=new Set(final.data.reviewedQuestions.map(r=>r.originalQuestionId))
 const expected=['IX-BIO-2025-C01-T0101-M01','IX-BIO-2025-C01-T0101-M02','IX-BIO-2025-C01-T0101-S01']
 if(ids.size!==3||expected.some(id=>!ids.has(id)))fail('PRINCIPAL_PRELIMINARY_ITEM_SCOPE_CHANGED')
 const original=sources.loadInputs(),f=sources.assertFrozen(original)
 const file=f.files.find(x=>x.originalAuthoredFile==='biology9Chapter1TopicDrafts.json')
 const byId=new Map(file.originalQuestionRevisions.map(q=>[q.originalQuestionId,q]))
 if(final.data.originalResearchFileSha256!==file.originalFileSha256||
  final.data.reviewedQuestions.some(q=>byId.get(q.originalQuestionId)?.originalQuestionRevisionSha256!==q.exactOriginalRevisionSha256))
  fail('PRELIMINARY_FEEDBACK_NOT_BOUND_TO_ORIGINAL_REVISION')
 return{originalRecords:3,preliminaryPositive:3,signedPrincipalApprovals:0,
  oldReceiptSha256:initial.sha256,amendmentReceiptSha256:final.sha256}
}
function assemble(root){
 const base=privatePath(root),bytes=fs.readFileSync(path.join(DIR,QA)),qa=JSON.parse(bytes)
 const current=audit.audit()
 if(JSON.stringify(current)!==JSON.stringify(qa)||qa.originalResearchQuestions!==2581||
  qa.groups.length!==56||qa.QA.mcqStructurallyConsistent!==875||
  qa.QA.longRubricHeuristic!==166)fail('NONCANONICAL_QA_OR_SOURCE_CHANGED')
 const feedback=validatePrincipalScreening(base)
 const reviewGroups=qa.groups.map(g=>{
  const rows=qa.rows.filter(r=>r.groupKey===g.groupKey)
  const held=rows.filter(r=>r.originalQuestionId==='X-CHEM-C23-L01')
  return{
   groupKey:g.groupKey,grade:g.grade,subject:g.subject,medium:g.medium,
   originalResearchQuestions:g.originalCandidates,
   teacherReviewPackReady:g.originalCandidates-held.length,
   originalFacultyHeldCount:held.length,
   highestSeverityStructuralCorrections:g.knownMachineDefectCount,
   fullStudentFacingLongAnswersNeededTeacherInspection:g.rubricLikeLongAnswerRisk,
   printedPageSourceProofNeeded:g.pendingPrintedPageEvidence,
   editorialMCQKeyReviewNeeded:rows.filter(r=>r.unresolvedEvidenceAndEditorialFlags.includes('ORIGINAL_KEY_A_OVERCONCENTRATION_EDIT_REVIEW_NOT_CORRECTNESS')||r.unresolvedEvidenceAndEditorialFlags.includes('ORIGINAL_KEY_POSITION_TEXT_INFERRED')).length,
   potentialNearDuplicateReviewNeeded:rows.filter(r=>r.unresolvedEvidenceAndEditorialFlags.some(f=>/NEAR|DUPLICATE_STEM/.test(f))).length,
   priorityRule:'TEACHER_QUALIFIED_INDEPENDENT_SOURCE_AND_ANSWER_REVIEW',
   competentReviewerAssigned:false,qualifiedTeacherSignedItems:0,
   authenticatedReviewCertificateSha256:null,academicallyApproved:0,published:0,
   correctionItemOriginalIds:rows.filter(r=>
    r.mechanicallyProvenDefects.length>0||
    r.unresolvedEvidenceAndEditorialFlags.includes('RUBRIC_LIKE_LONG_ANSWER_NOT_COMPLETE_MODEL_ANSWER')||
    r.unresolvedEvidenceAndEditorialFlags.includes('FACULTY_HELD_INCOMPLETE_SUBSTANTIVE_ANSWER'))
    .map(x=>({originalId:x.originalQuestionId,originalRevisionSha256:x.originalQuestionRevisionSha256,
      classification:x.mechanicallyProvenDefects.length?'DEFINITE_STRUCTURAL':
        'RUBRIC_OR_SUBSTANTIVE_ANSWER_NEEDS_QUALIFIED_CHECK'}))
  }
 })
 const checks=reviewGroups.reduce((acc,g)=>{acc.total+=g.originalResearchQuestions;acc.ready+=g.teacherReviewPackReady;
  acc.held+=g.originalFacultyHeldCount;acc.rubric+=g.fullStudentFacingLongAnswersNeededTeacherInspection;
  acc.printed+=g.printedPageSourceProofNeeded;return acc},{total:0,ready:0,held:0,rubric:0,printed:0})
 if(checks.total!==2581||checks.ready!==2580||checks.held!==1||checks.rubric!==166||
  checks.printed!==1188||reviewGroups.length!==56)fail('TEACHER_BATCHES_INCOMPLETE')
 const book=path.join(base,FULL)
 const st=fs.lstatSync(book)
 if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||(st.mode&0o077)!==0)
  fail('FULL_FACULTY_REVIEW_WORKBENCH_MISSING')
 const roster={
  schema:'assps-grade910-56-teacher-fully-source-sealed-bulk-correction-triage-v1',
  academicSessionClaim:'2026-27',applicableBoardYear:2027,
  sourceSha256:sha(bytes),privateFullReviewWorkbenchSha256:sha(fs.readFileSync(book)),
  sourceOriginals:2581,qualifiedFacultyReviewCandidates:2580,
  unsignedFacultyReviewGroupCount:56,heldOriginal:'X-CHEM-C23-L01',
  sourceQA:qa.QA,reviewGroups,
  realTeacherSignaturesAuthenticated:0,approved:0,published:0,
  originalQuestionTextChanged:false,
  needsAuthenticatedSchoolBookAdoption:true,
  needsOfficialBoardYear2027Applicability:true,
  requiresIndependentActualTeacherReview:true,
  humanReviewDoesNotEqualAutomatedQA:true,
  issueOnlyOnActualSchoolStaffAuthenticatedTaskAssignment:true,
  disposition:'SOURCE_ONLY_TEACHER_BATCH_ROUTING_HOLD'
 }
 const groupTable=reviewGroups.map(g=>'<tr><td>'+escapeHtml(g.groupKey)+'</td><td>'+
  g.teacherReviewPackReady+'</td><td>'+g.fullStudentFacingLongAnswersNeededTeacherInspection+
  '</td><td>'+g.printedPageSourceProofNeeded+'</td><td>Teacher review pending</td></tr>').join('')
 const page='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>ASSPS Principal — Only School-Level Decisions</title>'+
 '<style>body{font:15px/1.5 Arial,sans-serif;max-width:1120px;margin:auto;padding:24px;color:#142d49}'+
 'h1{font-size:24px}section{border:1px solid #bcd;border-radius:10px;margin:14px 0;padding:16px}'+
 'th,td{padding:8px;border:1px solid #cbd6e0;text-align:left}table{border-collapse:collapse;width:100%;font-size:12px}'+
 '.hold{font-weight:bold;color:#9a3d25}</style></head><body>'+
 '<h1>ASSPS Grade IX-X — Principal decision-only board</h1>'+
 '<p class="hold">AUTHENTICATION HOLD: This page is an offline summary, not an institutional signing or approving system.</p>'+
 '<section><h2>What Principal should do (three school decisions, not 2,580 question checks)</h2>'+
 '<p>1. Confirm actual ASSPS-adopted textbook title, printed edition, physical pages and session 2026–27 from school records. Unsigned forms are not certificates.</p>'+
 '<p>2. Confirm relevant school board/Annual 2027 scheme applicability from authentic issuing authority/school affiliation evidence. Do not extend Annual 2026 ALP by assumption.</p>'+
 '<p>3. AFTER separate qualified teachers complete independent source and answer verification per exact question revision, conduct authenticated school-level revision-specific approval. Do not sign unreviewed questions in bulk.</p></section>'+
 '<section><h2>Automated engineering QA (not factual correctness)</h2><p>2,581 originals checked; 875 MCQ options/recorded textual answers mechanically consistent; 166 long-answer rubric-like candidate risks; 1,188 printed-page claims missing; 24 legacy inferred keys; 15 possible near duplicates; 16 non-renderable blank Hindi placeholder fields.</p>'+
 '<p>Actual authentic school textbook adoptions: 0 verified. Qualified independent academic approvals: 0. Published Question Bank records: 0.</p></section>'+
 '<section><h2>Previous principal screening (informal)</h2>'+
 '<p>3 Biology Grade IX original question answers were reported Sahi in this chat. This is preliminary, unsigned, non-authenticated feedback, NOT a qualified independent academic certification or school approval. No additional question-by-question Principal action requested.</p></section>'+
 '<section><h2>56 grouped TEACHER review queues</h2><p>Delegate these to qualified subject teachers using the existing full private blind worksheet workbench. No fictitious reviewer is assigned.</p>'+
 '<table><thead><tr><th>Grade / Subject / Medium</th><th>Ready teacher items</th>'+
 '<th>Rubric-like answer risks</th><th>Printed page missing</th><th>Review</th></tr></thead><tbody>'+groupTable+
 '</tbody></table></section><p class="hold">Publication / production release HOLD until independently verifiable school evidence and SaaS Core approval.</p></body></html>\n'
 if(page.includes('http://')||page.includes('https://')||page.includes('<script')||
  page.includes('ANSWER_REFERENCE_KEEP_SEPARATE')||page.includes('correctAnswer'))
  fail('PRINCIPAL_PRIVATE_PAGE_INFORMATION_LEAK')
 const teacherBytes=JSON.stringify(roster,null,2)+'\n'
 const result={schema:'assps-grade910-private-principal-minimal-review-and-56-faculty-bulk-qa-attestation-v1',
  sourceOriginals:2581,mcqTextualOptionStructuralPass:875,allSourceShaVerified:true,
  teacherReviewCandidates:2580,teacherReviewGroups:56,
  claimedPhysicalPageNotRecorded:1188,heuristicLongAnswerReviewItems:166,
  provisionalPrincipalFeedbackQuestions:feedback.originalRecords,
  provisionalPositivePrincipalFeedback:3,
  provisionalPrincipalEvidenceRevisionBound:true,
  principalFeedbackSupersededOldSha256:feedback.oldReceiptSha256,
  principalFeedbackCurrentSha256:feedback.amendmentReceiptSha256,
  sourceAuditSha256:sha(bytes),privateTeacherRoutedBatchSha256:sha(teacherBytes),
  principalDecisionOnlyPageSha256:sha(page),
  realTeacherReviewsAuthenticated:0,schoolBookAdoptionAuthenticated:0,
  principalSchoolApprovalAuthenticated:0,academicallyApproved:0,published:0,
  productionWrites:0,releaseDecision:'HOLD_UNTIL_INSTITUTIONAL_AUTHENTICITY'}
 return{teacherBytes,page,receipt:result}
}
function create(root){
 const d=assemble(root),base=privatePath(root),t=path.join(base,TEACHER),p=path.join(base,PRINCIPAL)
 if([t,p,RECEIPT].some(f=>fs.existsSync(f)))fail('NONDESTRUCTIVE_WRITE_EXISTING')
 fs.writeFileSync(t,d.teacherBytes,{flag:'wx',mode:0o600})
 fs.writeFileSync(p,d.page,{flag:'wx',mode:0o600})
 fs.writeFileSync(RECEIPT,JSON.stringify(d.receipt,null,2)+'\n',{flag:'wx'})
 return d.receipt
}
function verify(root){
 const d=assemble(root),base=privatePath(root)
 if(fs.readFileSync(path.join(base,TEACHER),'utf8')!==d.teacherBytes||
  fs.readFileSync(path.join(base,PRINCIPAL),'utf8')!==d.page||
  fs.readFileSync(RECEIPT,'utf8')!==JSON.stringify(d.receipt,null,2)+'\n')
  fail('PRIVATE_BULK_REVIEW_CONTENT_OR_SOURCE_DRIFT')
 return d.receipt
}
if(require.main===module){
 const args=process.argv.slice(2),i=args.indexOf('--private-dir')
 try{const dir=i>=0?args[i+1]:null;console.log(JSON.stringify(args.includes('--write')?create(dir):verify(dir)))}
 catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={assemble,create,verify,validatePrincipalScreening,TEACHER,PRINCIPAL,RECEIPT}
