#!/usr/bin/env node
'use strict'
// Offline empty private templates, never a teacher-signed decision or review submission.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const intake=require('./aggregate-grade910-offline-faculty-decisions.cjs')
const sign=require('./verify-grade910-institutional-signatures.cjs')
const original=require('./build-grade910-blind-faculty-packets.cjs')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=s=>{throw Error('GRADE910_PRIVATE_TEMPLATE_'+s)}
function item(q){
 return{schemaVersion:'assps-grade910-offline-subject-review-v1',
  originalQuestionId:q.originalQuestionId,
  originalQuestionRevisionSha256:q.originalQuestionRevisionSha256,
  originalSourceFileSha256:q.originalSourceFileSha256,
  reviewerClaimId:null,completedAt:null,academicSessionClaim:null,
  disposition:null,independentAnswerBeforeReference:null,
  adoptedTextbookTitleClaim:null,adoptedTextbookEditionClaim:null,
  applicableExamYearClaim:null,schoolAdoptionProofHashClaim:null,
  finalQuestionRevisionSha256Claim:null,finalAnswerRevisionSha256Claim:null,
  checks:sign.REVIEW_CHECKS.map(name=>({name,status:'pending',evidenceSha256:null})),
  academicallyApproved:false,published:false,
  signatureAuthenticated:false,verifiedPaperStudioSelectable:false}
}
function securePath(dir){return intake.secureDir(dir)}
function generate({base,runId}){
 const parent=securePath(base)
 if(typeof runId!=='string'||!/^[a-z][a-z0-9_-]{3,60}$/.test(runId))fail('UNSAFE_PRIVATE_TEMPLATE_RUN_ID')
 const target=path.join(parent,runId),records=original.inventory()
 fs.mkdirSync(target,{mode:0o700})
 const written=[],seen=new Set()
 for(const q of records.queue.rows){
  if(original.HIDDEN.has(q.originalQuestionId))continue
  if(seen.has(q.originalQuestionId))fail('SOURCE_QUESTION_ID_REPEATED')
  seen.add(q.originalQuestionId)
  const candidate=item(q),bytes=JSON.stringify(candidate,null,2)+'\n'
  const baseFile=q.originalQuestionId.replace(/[^A-Za-z0-9_-]/g,'_')
  const filename=baseFile+'.faculty-review.json'
  const fd=fs.openSync(path.join(target,filename),fs.constants.O_WRONLY|
   fs.constants.O_CREAT|fs.constants.O_EXCL,0o600)
  try{fs.writeFileSync(fd,bytes)}finally{fs.closeSync(fd)}
  written.push({originalQuestionId:q.originalQuestionId,templateFile:filename,
   sourceRevisionSha256:q.originalQuestionRevisionSha256,sha256:SHA(bytes)})
 }
 if(written.length!==2580||new Set(written.map(x=>x.templateFile)).size!==2580)
  fail('FULL_ORIGINAL_TEMPLATE_COHORT_NOT_COMPLETE')
 const index={schemaVersion:'assps-grade910-private-faculty-unsigned-editable-templates-v1',
  originalCandidates:2581,editableQuestionForms:2580,facultyHeldExcluded:1,
  realTeacherReviewsReceived:0,schoolAcademicApprovals:0,
  instruction:'Templates MUST be completed by a real qualified independent teacher, checked, and moved only then to the distinct restricted review submissions directory; never treat a template as evidence or a school signature.',
  records:written}
 const bytes=JSON.stringify(index,null,2)+'\n'
 const fd=fs.openSync(path.join(target,'TEMPLATES_INDEX.json'),fs.constants.O_WRONLY|
  fs.constants.O_CREAT|fs.constants.O_EXCL,0o600)
 try{fs.writeFileSync(fd,bytes)}finally{fs.closeSync(fd)}
 return{privateDirectory:target,editableForms:written.length,held:1,
  indexSha256:SHA(bytes),academicApproved:0}
}
function verify({base,runId}){
 const root=securePath(base)
 if(!/^[a-z][a-z0-9_-]{3,60}$/.test(String(runId||'')))fail('UNSAFE_PRIVATE_TEMPLATE_RUN_ID')
 const dir=path.join(root,runId),st=fs.lstatSync(dir)
 if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0)fail('UNSAFE_PRIVATE_TEMPLATE_FOLDER')
 const index=JSON.parse(fs.readFileSync(path.join(dir,'TEMPLATES_INDEX.json'),'utf8'))
 if(index.originalCandidates!==2581||index.editableQuestionForms!==2580||
    index.facultyHeldExcluded!==1||index.realTeacherReviewsReceived!==0||
    !Array.isArray(index.records)||index.records.length!==2580)fail('INVALID_TEMPLATE_INDEX')
 const sources=intake.originalIndex(),seen=new Set()
 for(const x of index.records){
  if(!sources.has(x.originalQuestionId)||seen.has(x.originalQuestionId)||
   original.HIDDEN.has(x.originalQuestionId)||
   x.sourceRevisionSha256!==sources.get(x.originalQuestionId).row.originalQuestionRevisionSha256)
   fail('TEMPLATE_ORIGINAL_SOURCE_DRIFT')
  const p=path.join(dir,x.templateFile),f=fs.lstatSync(p)
  if(!f.isFile()||f.isSymbolicLink()||(f.mode&0o077)!==0||
   !/^[A-Za-z0-9_-]+\.faculty-review\.json$/.test(x.templateFile)||
   SHA(fs.readFileSync(p))!==x.sha256)fail('TEMPLATE_PRIVATE_FILE_SHA_DRIFT')
  const v=JSON.parse(fs.readFileSync(p))
  if(v.originalQuestionId!==x.originalQuestionId||v.reviewerClaimId!==null||
   v.independentAnswerBeforeReference!==null||v.academicallyApproved!==false||
   v.signatureAuthenticated!==false)fail('TEMPLATE_FALSIFIED_AS_REVIEW')
  seen.add(x.originalQuestionId)
 }
 return{verifiedEmptyUnsignedTemplates:seen.size,realTeacherReviewsReceived:0,
  academicApproved:0,academicPublication:'HOLD'}
}
if(require.main===module){
 const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1]
 try{
  if(args.includes('--generate')){
   if(!args.includes('--explicit-private-templates'))fail('EXPLICIT_PRIVATE_TEMPLATES_FLAG_REQUIRED')
   console.log(JSON.stringify(generate({base:get('--base'),runId:get('--run-id')})))
  }else if(args.includes('--verify'))console.log(JSON.stringify(verify({base:get('--base'),runId:get('--run-id')})))
  else console.log(JSON.stringify({originalCandidates:2581,templatesAvailableOnPrivateOptIn:2580,
   reviewerAuthorized:0,published:0}))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={item,generate,verify}
