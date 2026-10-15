#!/usr/bin/env node
'use strict'
// A separate, independently authored teaching candidate for an intentionally
// faculty-held research question. This never changes the frozen original.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const ORIGINAL=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry10Starter2026.json')
const PUBLIC=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_HELD_CONCEPTUAL_ALTERNATIVE_ATTESTATION_20261015.json')
const PRIVATE_FILES=['UNSIGNED_CONCEPTUAL_ALTERNATE.json','BLIND_CONCEPTUAL_ALTERNATE.json','ANSWER_REFERENCE_KEEP_SEPARATE.json']
const REVIEW_FILES=['BLIND_FOR_HUMAN_REVIEW.html','UNVERIFIED_ANSWER_AND_RUBRIC.html','UNSIGNED_REVIEW_TEMPLATE.json']
const REVIEW_CHECKS=['curriculumApplicability','textbookEditionAndPrintedPage','questionCorrectness','answerAndOptionCorrectness','marksAndDifficulty','languageAccuracy','duplicatesAndOriginality','sourceProvenance']
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('ASSPS_HELD_ALT_REVIEW_'+x)}
const HEX=/^[0-9a-f]{64}$/
function privateDir(d){
 if(typeof d!=='string'||!path.isAbsolute(d))fail('PRIVATE_ABSOLUTE_DIR_REQUIRED')
 const r=path.resolve(d),st=fs.lstatSync(r),rel=path.relative(ROOT,r)
 if(rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))fail('NO_PRIVATE_DATA_INSIDE_GIT')
 if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid()||
  (st.mode&0o077)!==0||fs.realpathSync(r)!==r)fail('UNTRUSTED_PRIVATE_DIRECTORY')
 return r
}
function safeRead(dir,file){
 const p=path.join(dir,file),st=fs.lstatSync(p)
 if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||
  (st.mode&0o077)!==0||st.size>128*1024)fail('PRIVATE_RECORD_PERMISSIONS_OR_SIZE')
 const b=fs.readFileSync(p)
 try{return{data:JSON.parse(b),sha256:SHA(b)}}catch{fail('INVALID_PRIVATE_JSON')}
}
function audit(dir){
 const root=privateDir(dir)
 const originalBytes=fs.readFileSync(ORIGINAL)
 const source=JSON.parse(originalBytes)
 const originals=(source.items||source.drafts||[]).filter(x=>x.id==='X-CHEM-C23-L01')
 if(originals.length!==1)fail('ORIGINAL_ID_CHANGED')
 const origSha=SHA(JSON.stringify(originals[0])),fileSha=SHA(originalBytes)
 const files=Object.fromEntries(PRIVATE_FILES.map(k=>[k,safeRead(root,k)]))
 const proposal=files['UNSIGNED_CONCEPTUAL_ALTERNATE.json'].data
 const blind=files['BLIND_CONCEPTUAL_ALTERNATE.json'].data
 const reference=files['ANSWER_REFERENCE_KEEP_SEPARATE.json'].data
 const q=proposal?.proposedQuestion,a=proposal?.subjectAnswer
 if(proposal?.schema!=='assps-grade910-held-original-separate-authoring-proposal-v1'||
    proposal.originalQuestionId!=='X-CHEM-C23-L01'||
    proposal.originalQuestionRevisionSha256!==origSha||
    proposal.originalSourceFileSha256!==fileSha||
    proposal.originalSourceFile!=='chemistry10Starter2026.json'||
    q?.id!=='X-CHEM-C23-L01-ALT-CONCEPTUAL-20261015'||
    q?.grade!==10||q?.subject!=='chemistry'||q?.medium!=='english'||q?.marks!==5||
    q?.origin!=='independently-authored-conceptual-replacement-candidate'||
    q?.sourceTextbookExercise!==false||
    !String(q.stem||'').trim()||
    !String(a?.answer||'').trim()||a?.questionId!==q.id)
  fail('NOT_SEPARATE_COMPLETE_CONCEPTUAL_CANDIDATE')
 if(!Array.isArray(a.markScheme)||a.markScheme.length!==5||
    a.markScheme.reduce((sum,row)=>sum+row.marks,0)!==5||
    a.markScheme.some(row=>row.marks!==1||!String(row.criterion||'').trim()))
  fail('MARKING_SCHEME_NOT_COMPLETE_5')
 if(proposal.proposedQuestionRevisionSha256!==SHA(JSON.stringify(q))||
    proposal.proposedAnswerRevisionSha256!==SHA(JSON.stringify(a))||
    !HEX.test(proposal.proposedQuestionRevisionSha256)||
    !HEX.test(proposal.proposedAnswerRevisionSha256))
  fail('UNSEALED_ALTERNATE_REVISION')
 if(blind.originalQuestionId!==proposal.originalQuestionId||
    blind.originalQuestionRevisionSha256!==origSha||
    blind.proposedQuestionRevisionSha256!==proposal.proposedQuestionRevisionSha256||
    JSON.stringify(blind.proposedQuestion)!==JSON.stringify(q)||
    blind.published!==false||blind.unreviewed!==true||
    Object.hasOwn(blind,'subjectAnswer')||Object.hasOwn(blind,'answer'))
  fail('BLIND_ANSWER_LEAK_OR_SOURCE_DRIFT')
 if(reference.originalQuestionId!==proposal.originalQuestionId||
    reference.sourceQuestionRevisionSha256!==origSha||
    reference.proposedQuestionRevisionSha256!==proposal.proposedQuestionRevisionSha256||
    reference.proposedAnswerRevisionSha256!==proposal.proposedAnswerRevisionSha256||
    JSON.stringify(reference.answer)!==JSON.stringify(a)||
    reference.unverified!==true||reference.published!==false)
  fail('PRIVATE_ANSWER_REFERENCE_DRIFT')
 for(const [field,value] of [
  ['actualSchoolTextbookEditionAdopted',false],['printedPageExerciseVerified',false],
  ['applicableExamYear2027Verified',false],['independentTeacherReviewed',false],
  ['independentUrduReviewCompleted',false],['principalAuthenticatedSignoff',false],
  ['academicallyApproved',false],['paperStudioSelectable',false],['published',false]])
  if(proposal[field]!==value)fail('FALSE_INSTITUTIONAL_SIGNOFF_'+field)
 if(a.qualifiedSubjectReviewConfirmed!==false||
    a.answerScientificallyIndependentlyVerified!==false||a.teacherReviewerIdentity!==null)
  fail('FAKE_QUALIFIED_REVIEWER')
 const reviewArtifacts=Object.fromEntries(REVIEW_FILES.map(name=>{
  const file=path.join(root,name),st=fs.lstatSync(file)
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||
     (st.mode&0o077)!==0||st.size>128*1024)fail('PRIVATE_HUMAN_REVIEW_ARTIFACT_UNTRUSTED')
  return[name,{bytes:fs.readFileSync(file),sha256:SHA(fs.readFileSync(file))}]
 }))
 const rb=reviewArtifacts['BLIND_FOR_HUMAN_REVIEW.html'].bytes.toString('utf8')
 const ra=reviewArtifacts['UNVERIFIED_ANSWER_AND_RUBRIC.html'].bytes.toString('utf8')
 if(!rb.includes('default-src &#39;none&#39;')||!ra.includes('default-src &#39;none&#39;')||
    rb.includes('<script')||ra.includes('<script')||
    rb.includes(a.answer)||rb.includes('UNVERIFIED_ANSWER_AND_RUBRIC.html')||
    !ra.includes('UNREVIEWED EDUCATIONAL CANDIDATE')||
    !ra.includes('NOT FOR EXAMS')||!rb.includes('NOT FOR EXAMS'))
  fail('BLIND_REVIEW_ANSWER_SEPARATION_OR_OFFLINE_CSP')
 let reviewTemplate
 try{reviewTemplate=JSON.parse(reviewArtifacts['UNSIGNED_REVIEW_TEMPLATE.json'].bytes)}
 catch{fail('INVALID_INDEPENDENT_REVIEW_TEMPLATE')}
 if(reviewTemplate.schema!=='assps-grade910-held-conceptual-alternate-unsigned-review-v1'||
   reviewTemplate.originalQuestionId!==proposal.originalQuestionId||
   reviewTemplate.originalQuestionRevisionSha256!==origSha||
   reviewTemplate.proposedQuestionRevisionSha256!==proposal.proposedQuestionRevisionSha256||
   reviewTemplate.proposedAnswerRevisionSha256!==proposal.proposedAnswerRevisionSha256||
   reviewTemplate.qualifiedTeacherApproved!==false||
   reviewTemplate.principalAuthenticatedApproval!==false||
   reviewTemplate.verifiedPaperStudioSelectable!==false||
   reviewTemplate.published!==false||
   reviewTemplate.assignedReviewerClaimId!==null||reviewTemplate.reviewedAt!==null||
   reviewTemplate.schoolActualEditionEvidenceSha256!==null||
   reviewTemplate.applicableAnnual2027ExamSchemeSha256!==null||
   reviewTemplate.independentAnswerBeforeReference!==null||
   !Array.isArray(reviewTemplate.checks)||reviewTemplate.checks.length!==8||
   reviewTemplate.checks.some((v,i)=>v.name!==REVIEW_CHECKS[i]||
    v.status!=='pending'||v.evidenceSha256!==null||v.reviewerNote!==null))
  fail('FALSE_TEACHER_REVIEW_OR_NOT_SOURCE_BOUND')
 const out={
  schema:'assps-grade910-source-preserving-held-alternate-readiness-v1',
  originalQuestionId:proposal.originalQuestionId,
  originalSourceFileSha256:fileSha,originalQuestionRevisionSha256:origSha,
  proposedSeparateDraftId:q.id,
  proposedQuestionRevisionSha256:proposal.proposedQuestionRevisionSha256,
  proposedAnswerRevisionSha256:proposal.proposedAnswerRevisionSha256,
  privateRecordHashSummaries:Object.fromEntries(PRIVATE_FILES.map(name=>[name,files[name].sha256])),
  privateReviewArtifactsSha256:Object.fromEntries(REVIEW_FILES.map(name=>[name,reviewArtifacts[name].sha256])),
  validFiveMarkConceptualDraftPrepared:true,
  changeAppliedToOriginal:false,schoolExerciseMatchVerified:false,
  privateBlindQuestionAndAnswerSeparatelyStored:true,
  requiresQualifiedIndependentReview:true,
  needsSchoolAdoptedEditionConfirmation:true,
  originalRecordFacultyHeld:true,
  approved:0,published:0,paperStudioSelectable:false,
  stage:'NEW_CONCEPTUAL_RESEARCH_CANDIDATE_HOLD'
 }
 return out
}
function write(d){
 const x=audit(d)
 if(fs.existsSync(PUBLIC))fail('NONDESTRUCTIVE_PUBLIC_RECEIPT_EXISTS')
 fs.writeFileSync(PUBLIC,JSON.stringify(x,null,2)+'\n',{flag:'wx'})
 return x
}
function verifyReceipt(d){
 const x=audit(d)
 if(fs.readFileSync(PUBLIC,'utf8')!==JSON.stringify(x,null,2)+'\n')
  fail('PUBLIC_RECEIPT_SOURCE_NOT_FROZEN')
 return{originalHeld:true,independentConceptualDraftReady:true,
  proposedQuestionRevisionSha256:x.proposedQuestionRevisionSha256,
  privateObjectCount:PRIVATE_FILES.length,humanApproved:0,published:0}
}
if(require.main===module){
 const args=process.argv.slice(2),i=args.indexOf('--private-dir')
 try{const dir=i>=0?args[i+1]:null
 console.log(JSON.stringify(args.includes('--write')?write(dir):verifyReceipt(dir)))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={audit,write,verifyReceipt,PUBLIC,privateDir}
