#!/usr/bin/env node
'use strict'
// Offline, restricted-use teacher review pack generator: blind question first, answer separately.
// NEVER signs, approves, publishes, or copies the derived question text into Git.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const sources=require('./attest-grade910-all-original-candidate-revisions.cjs')
const triage=require('./build-grade910-one-faculty-quality-worklist.cjs')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('GRADE910_BLIND_REVIEW_'+x)}
const ROOT=path.resolve(__dirname,'../..')
const HIDDEN=new Set(['X-CHEM-C23-L01'])
const CHECKS=['curriculumApplicability','textbookEditionAndPrintedPage',
  'questionCorrectness','answerAndOptionCorrectness','marksAndDifficulty',
  'languageAccuracy','duplicatesAndOriginality','sourceProvenance']
const slug=x=>String(x??'unassigned').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'unassigned'
const deepJson=x=>JSON.parse(JSON.stringify(x))
function inventory(){
 const si=sources.loadInputs(),frozen=sources.assertFrozen(si)
 const queue=triage.build()
 if(queue.researchOriginalCandidates!==2581||frozen.originalAuthoredQuestionCandidates!==2581||
  queue.independentlyApproved!==0||queue.verifiedPublished!==0)fail('FROZEN_BASELINE_INVALID')
 const candidates=new Map()
 const frozenFiles=new Map(frozen.files.map(f=>[f.originalAuthoredFile,f]))
 for(const d of si.documents){
  const sealed=frozenFiles.get(d.file);if(!sealed)continue
  const shaRows=new Map(sealed.originalQuestionRevisions.map(x=>[x.originalQuestionId,x]))
  for(const q of [...(d.data?.drafts||[]),...(d.data?.items||[])]){
   if(!shaRows.has(q.id))fail('UNSEALED_CANDIDATE_IN_SOURCE')
   if(candidates.has(q.id)||sha(JSON.stringify(q))!==shaRows.get(q.id).originalQuestionRevisionSha256)
    fail('ORIGINAL_SOURCE_REVISION_CHANGED')
   candidates.set(q.id,{q,file:d.file,fileSha:sealed.originalFileSha256})
  }
 }
 if(candidates.size!==2581||queue.rows.length!==2581)fail('INCOMPLETE_BANK')
 for(const row of queue.rows){
  const r=candidates.get(row.originalQuestionId)
  if(!r||row.originalQuestionRevisionSha256!==sha(JSON.stringify(r.q))||
   row.originalSourceFileSha256!==r.fileSha)
   fail('FACULTY_PRIORITY_SOURCE_REVISION_DRIFT')
 }
 return{queue,candidates}
}
function extract(q,{blind=true}={}){
 const text={}
 const content=q.content||{}
 for(const lang of ['en','ur']){
  const side=content[lang]
  if(!side)continue
  const prompt=side.stem
  if(typeof prompt!=='string'||!prompt.trim())continue
  text[lang]={question:prompt,
   ...((Array.isArray(side.options))?{options:side.options.map(o=>typeof o==='string'?o:{id:o.id,text:o.text})}:{})}
  if(!blind){
   if(side.answer!=null)text[lang].answerReference=side.answer
   if(side.explanation!=null)text[lang].explanationReference=side.explanation
  }
 }
 if(!Object.keys(text).length&&typeof(q.stem||q.questionText||q.question_text)==='string'){
  text.original={question:q.stem||q.questionText||q.question_text}
  if(Array.isArray(q.options))text.original.options=q.options.map(o=>typeof o==='string'?o:{id:o.id,text:o.text})
  if(!blind&&q.answer!=null)text.original.answerReference=q.answer
 }
 if(!Object.keys(text).length)fail('QUESTION_PROMPT_MISSING:'+q.id)
 return text
}
function originalPair(q,row){
 const meta={id:q.id,gradeClaim:row.gradeClaim,subjectClaim:row.subjectClaim,
  chapterClaim:row.chapterClaim,topicClaim:q.topicId||q.skill||q.unit||null,
  mediumClaim:row.mediumClaim,type:row.questionType,marks:row.marks,
  priority:row.facultyEditorialReviewPriority,
  originalQuestionRevisionSha256:row.originalQuestionRevisionSha256,
  originalSourceFileSha256:row.originalSourceFileSha256,
  originalSourceCatalogId:row.originalSourceCatalogId,
  sourcePdfPageClaim:row.originalSourcePdfPageClaim,
  claimedEdition:q.curriculum?.edition||null,
  claimedSourceBookId:q.curriculum?.textbookId||null,
  editorialSignals:row.editorialSignalFlags,
  sourceAndEditionGaps:row.applicabilityAndSourceSignalFlags}
 const review={...meta,question:extract(q,{blind:true}),
  originalAnswerHidden:true,
  independentlyVerified:false}
 const answer={...meta,answerTextOriginalCandidateOnly:extract(q,{blind:false}),
  originalCorrectOptionIdNotIndependentCheck:q.correctOptionId||null,
  marksSchemeUnverified:true,
  suggestedReviewChecklist:CHECKS.map(name=>({name,status:'UNREVIEWED',evidenceSha256:null,reviewerNote:null})),
  independentTeacher:null,schoolAdoptionRecord:null,schoolAcademicApproval:null,
  approvedRevision:null,published:false}
 return{review,answer}
}
function manifest(){
 const {queue,candidates}=inventory()
 const groups=new Map(),included=[]
 let facultyHeld=0
 for(const row of queue.rows){
  const id=row.originalQuestionId
  if(HIDDEN.has(id)){facultyHeld++;continue}
  const record=candidates.get(id)
  if(!record)fail('MISSING_CANDIDATE:'+id)
  const groupKey=[row.gradeClaim==null?'unassigned':String(row.gradeClaim),
   row.subjectClaim||'unassigned',row.facultyEditorialReviewPriority].map(slug).join('__')
  if(!groups.has(groupKey))groups.set(groupKey,[])
  const pair=originalPair(record.q,row)
  groups.get(groupKey).push(pair)
  included.push(id)
 }
 if(groups.size===0||included.length!==2580||facultyHeld!==1||
  new Set(included).size!==included.length)fail('ORIGINAL_QUESTION_FACULTY_POPULATION_DRIFT')
 return{groups,questionCount:included.length,facultyHeld,
  priorityCounts:queue.priorityCounts,sourceShaFrozen:true}
}
function safeBase(base){
 if(typeof base!=='string'||!path.isAbsolute(base))fail('EXPORT_BASE_MUST_BE_ABSOLUTE')
 if(path.relative(ROOT,path.resolve(base))===''||
   (!path.relative(ROOT,path.resolve(base)).startsWith('..'+path.sep)&&
    !path.isAbsolute(path.relative(ROOT,path.resolve(base)))))
  fail('SENSITIVE_PACKETS_CANNOT_BE_STORED_IN_GIT')
 const stat=fs.lstatSync(base)
 if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||
  (stat.mode&0o077)!==0)fail('RESTRICTED_OWNED_NON_SYMLINK_EXPORT_BASE_REQUIRED')
 const real=fs.realpathSync(base)
 if(real!==path.resolve(base))fail('EXPORT_ANCESTOR_SYMLINK_NOT_PERMITTED')
 if(!path.isAbsolute(real))fail('INVALID_EXPORT_PATH')
 return base
}
function writeExclusive(file,content){
 const fd=fs.openSync(file,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600)
 try{fs.writeFileSync(fd,content)}finally{fs.closeSync(fd)}
}
function exportPacks({base,runId,perPack=20}){
 if(!/^[a-z0-9][a-z0-9_-]{2,59}$/.test(String(runId||'')))fail('SAFE_UNIQUE_RUN_ID_REQUIRED')
 if(!Number.isInteger(perPack)||perPack<5||perPack>40)fail('REVIEW_BATCH_SIZE_OUT_OF_RANGE')
 const b=safeBase(base),packets=manifest()
 const dir=path.join(b,runId)
 fs.mkdirSync(dir,{mode:0o700})
 let written=0,batchCount=0,held=packets.facultyHeld
 const index=[]
 for(const [key,items] of [...packets.groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
  for(let p=0;p<items.length;p+=perPack){
   const subset=items.slice(p,p+perPack),filename=key+'--batch-'+String(1+Math.floor(p/perPack)).padStart(3,'0')
   const blind={schemaVersion:'assps-grade910-human-blind-review-v1',school:'ASSPS',
    stage:'TEACHER_INDEPENDENT_REVIEW_BEFORE_SEEING_ORIGINAL_ANSWER',
    academicSessionVerified:false,approvedQuestionCount:0,items:subset.map(x=>x.review)}
   const answers={schemaVersion:'assps-grade910-unverified-original-answer-reference-v1',
    school:'ASSPS',stage:'REFERENCE_AFTER_INDEPENDENT_ANSWER_DECISION_ONLY',
    originalReferenceCorrectnessVerified:false,approvedQuestionCount:0,
    items:subset.map(x=>x.answer)}
   const decisions={schemaVersion:'assps-grade910-unsigned-human-review-input-v1',school:'ASSPS',
    reviewState:'UNASSIGNED_UNREVIEWED',schoolTextbookAdoptionConfirmed:false,
    academicSessionConfirmed:false,schoolBoardExamYearConfirmed:false,
    reviewerIdentitiesAuthenticated:false,approvalProhibited:true,
    items:subset.map(({review})=>({originalQuestionId:review.id,
     originalQuestionRevisionSha256:review.originalQuestionRevisionSha256,
     originalSourceFileSha256:review.originalSourceFileSha256,
     originalIndependentAnswerBeforeReference:null,
     actualTextbookTitle:null,actualEdition:null,applicableExamYear:null,
     actualPrintedExercisePage:null,conceptualQuestionOriginReviewed:false,
     reviewChecks:CHECKS.map(name=>({name,passed:null,evidenceSha256:null,reviewerNote:null})),
     independentReviewerId:null,independentUrduReviewerId:null,schoolAcademicApproverId:null,
     finalQuestionRevisionSha256:null,finalAnswerRevisionSha256:null,
     authenticatedSchoolSignaturesPresent:false,academicApproved:false,published:false}))}
   const blindJson=JSON.stringify(blind,null,2)+'\n',answerJson=JSON.stringify(answers,null,2)+'\n',
    decisionsJson=JSON.stringify(decisions,null,2)+'\n'
   writeExclusive(path.join(dir,filename+'.blind.json'),blindJson)
   writeExclusive(path.join(dir,filename+'.answer-review.json'),answerJson)
   writeExclusive(path.join(dir,filename+'.unsigned-decisions.json'),decisionsJson)
   index.push({group:key,batch:filename,questions:subset.length,
    originalIds:subset.map(x=>x.review.id),
    blindSha256:sha(blindJson),referenceSha256:sha(answerJson),unsignedDecisionTemplateSha256:sha(decisionsJson)})
   written+=subset.length;batchCount++
  }
 }
 if(written!==2580||held!==1)fail('PARTIAL_PRIVATE_EXPORT')
 const audit={schemaVersion:'assps-grade910-private-faculty-export-index-v1',
  protectedScope:'PRIVATE_OFFLINE_NOT_A_PUBLICATION_OR_TEACHER_APPROVAL',
  originalQuestionCandidates:2581,exportedForReview:written,
  facultyHeldExcludedFromAllReviewContent:held,
  originalAuthoredQuestionFiles:73,
  schoolAdoptedBookCertified:false,authenticatedIndependentTeacherApproved:0,
  verifiedPublished:0,teacherPacketCount:batchCount,
  filePairs:index}
 writeExclusive(path.join(dir,'INDEX.json'),JSON.stringify(audit,null,2)+'\n')
 writeExclusive(path.join(dir,'READ_FIRST.txt'),
  'ASSPS — PRIVATE EDUCATIONAL REVIEW ONLY. No approved questions.\n'+
  'The .blind.json should be answered by a qualified independent teacher BEFORE opening the .answer-review.json.\n'+
  'The .unsigned-decisions.json begins with ALL NULL review fields and is not an institutional approval.\n'+
  'Do not expose this content on public GitHub, student paper selection or production.\n'+
  'Check original grade/subject/medium, actual adopted textbook and exam year.\n'+
  'All reviewer checkboxes and signatories start UNREVIEWED/NULL.\n'+
  'One faculty-held Chemistry original is deliberately NOT EXPORTED.\n'+
  'Question+answer SHA and independent qualified verification are required before real institutional approval.\n')
 return{privatePath:dir,questionCount:written,excludedFacultyHeld:held,
  packs:batchCount,publication:'HOLD',approved:0}
}
function verifyPrivateExport({base,runId}){
 if(!/^[a-z0-9][a-z0-9_-]{2,59}$/.test(String(runId||'')))fail('SAFE_UNIQUE_RUN_ID_REQUIRED')
 const dir=path.join(safeBase(base),runId),ds=fs.lstatSync(dir)
 if(!ds.isDirectory()||ds.isSymbolicLink()||ds.uid!==process.getuid()||
   (ds.mode&0o077)!==0)fail('UNSAFE_PRIVATE_FACULTY_EXPORT_DIRECTORY')
 const idxPath=path.join(dir,'INDEX.json'),index=JSON.parse(fs.readFileSync(idxPath,'utf8'))
 if(index.originalQuestionCandidates!==2581||index.exportedForReview!==2580||
  index.facultyHeldExcludedFromAllReviewContent!==1||index.verifiedPublished!==0||
  index.authenticatedIndependentTeacherApproved!==0||
  !Array.isArray(index.filePairs)||index.teacherPacketCount!==index.filePairs.length)
   fail('UNTRUSTED_PRIVATE_INDEX_POPULATION')
 const originals=inventory(),found=new Set()
 for(const row of index.filePairs){
  if(!/^[a-z0-9_-]+--batch-\d{3,4}$/.test(row.batch)||!Array.isArray(row.originalIds)||
    row.questions!==row.originalIds.length)fail('PRIVATE_BATCH_MANIFEST_INVALID')
  const paths=['.blind.json','.answer-review.json','.unsigned-decisions.json']
   .map(suffix=>path.join(dir,row.batch+suffix))
  for(const p of paths){
   const st=fs.lstatSync(p)
   if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0)
    fail('UNTRUSTED_PRIVATE_FILE_PERMISSIONS')
  }
  const bytes=paths.map(p=>fs.readFileSync(p,'utf8'))
  if(sha(bytes[0])!==row.blindSha256||sha(bytes[1])!==row.referenceSha256||
    sha(bytes[2])!==row.unsignedDecisionTemplateSha256)fail('PRIVATE_PACK_SHA_CHANGED')
  const b=JSON.parse(bytes[0]),ref=JSON.parse(bytes[1]),d=JSON.parse(bytes[2])
  if(b.approvedQuestionCount!==0||ref.approvedQuestionCount!==0||
    d.approvalProhibited!==true||d.schoolTextbookAdoptionConfirmed!==false||
    b.items.length!==row.questions||ref.items.length!==row.questions||
    d.items.length!==row.questions)fail('PRIVATE_PACK_APPROVAL_OR_SIZE_DRIFT')
  for(let i=0;i<row.questions;i++){
   const q=b.items[i],a=ref.items[i],item=d.items[i],src=originals.candidates.get(q.id)
   if(!src||found.has(q.id)||HIDDEN.has(q.id)||q.id!==a.id||q.id!==item.originalQuestionId||
    q.id!==row.originalIds[i]||q.originalQuestionRevisionSha256!==sha(JSON.stringify(src.q))||
    a.originalQuestionRevisionSha256!==q.originalQuestionRevisionSha256||
    item.originalQuestionRevisionSha256!==q.originalQuestionRevisionSha256||
    q.originalAnswerHidden!==true||q.independentlyVerified!==false||
    a.published!==false||item.academicApproved!==false)
    fail('PRIVATE_QUESTION_REVISION_OR_DUPLICATE_DRIFT')
   if(JSON.stringify(q).includes('answerReference')||
      JSON.stringify(q).includes('originalCorrectOptionId'))
    fail('PRIVATE_BLIND_ANSWER_LEAK')
   found.add(q.id)
  }
 }
 if(found.size!==2580||index.filePairs.reduce((n,f)=>n+f.questions,0)!==2580)
  fail('PRIVATE_EXPORT_MISSING_ORIGINAL_CANDIDATES')
 return{verifiedOriginalIds:found.size,heldNotExported:1,privatePacks:index.filePairs.length,
  allShaVerified:true,realTeacherApproved:0,published:0,release:'HOLD'}
}
if(require.main===module){
 const args=process.argv.slice(2)
 if(args.includes('--verify-private')){
  const get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]}
  console.log(JSON.stringify(verifyPrivateExport({base:get('--base'),runId:get('--run-id')})))
 }else if(args.includes('--generate')){
  if(!args.includes('--explicit-private-export'))fail('EXPLICIT_PRIVATE_REVIEW_CONTENT_CONFIRMATION_REQUIRED')
  const get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]}
  console.log(JSON.stringify(exportPacks({base:get('--base'),runId:get('--run-id'),
   perPack:Number(get('--per-pack')||20)})))
 }else {
  const m=manifest()
  console.log(JSON.stringify({readyForPrivateTeacherHandoff:m.questionCount,
   facultyHeldExcluded:m.facultyHeld,
   priorityCounts:m.priorityCounts,realSchoolReviewerAuthenticated:false,
   generatedQuestionFiles:false,academicApproval:0,published:0}))
 }
}
module.exports={inventory,extract,manifest,exportPacks,verifyPrivateExport,safeBase,originalPair,CHECKS,HIDDEN}
