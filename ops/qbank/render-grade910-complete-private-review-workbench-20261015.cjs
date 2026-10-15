#!/usr/bin/env node
'use strict'
// Full offline campus faculty review navigation for ALREADY frozen 2,580 originals.
// Source-bound internal links ONLY. Not a replacement for authentic teacher/Principal review.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {safeDir}=require('./verify-grade910-private-all2581-delivery-20261015.cjs')
const {verify:verifyPriority}=require('./prepare-grade910-private-faculty-quality-overlay-20261015.cjs')
const ROOT=path.resolve(__dirname,'../..'),STEMS=path.join(ROOT,'docs/question-bank')
const CROSS=path.join(STEMS,'ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
const OUT=path.join(STEMS,'ASSPS_GRADE910_COMPLETE_PRIVATE_FACULTY_WORKBENCH_ATTESTATION_20261015.json')
const WORKBENCH='PRIVATE_FULL_2580_FACULTY_REVIEW_START_HERE.html'
const PRIORITY='PRIVATE_FACULTY_SOURCE_RISK_PRIORITY_20261015.json'
const SHA=v=>crypto.createHash('sha256').update(v).digest('hex')
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fail=x=>{throw Error('ASSPS_2580_PRIVATE_REVIEW_WORKBENCH_'+x)}
const SAFE=/^[a-zA-Z0-9_.-]{1,180}$/
function authorizedFile(base,relative){
 if(typeof relative!=='string'||relative.split('/').some(x=>!SAFE.test(x)||x==='.'||x==='..'))
  fail('PATH_TRAVERSAL_OR_INVALID_FILENAME')
 const parts=relative.split('/'),full=path.join(base,...parts)
 for(let i=0;i<parts.length;i++){
  const p=path.join(base,...parts.slice(0,i+1)),st=fs.lstatSync(p)
  if(st.isSymbolicLink()||st.uid!==process.getuid()||(st.mode&0o077)!==0)
   fail('FOREIGN_OWNER_OR_WORLD_READABLE_FILE')
  if(i<parts.length-1&&!st.isDirectory())fail('INTERMEDIATE_PATH_NOT_DIRECTORY')
  if(i===parts.length-1&&(!st.isFile()||st.nlink!==1))fail('PRIVATE_FILE_NOT_REGULAR')
 }
 return full
}
function build({base,runId}){
 const root=safeDir(base)
 if(runId!=='grade910-20261015-full')fail('UNTRUSTED_PREVIOUS_HANDOFF_RUN')
 verifyPriority({base:root,runId})
 const sourceBuf=fs.readFileSync(CROSS),source=JSON.parse(sourceBuf)
 const key=JSON.parse(fs.readFileSync(authorizedFile(root,PRIORITY),'utf8'))
 const originals=new Map(source.rows.map(v=>[v.questionId,v]))
 if(originals.size!==2581||key.privateReviewReady!==2580||key.schoolReviewGroups!==56||
    key.groups.length!==56||source.releaseDecision==='APPROVED')
  fail('FROZEN_RESEARCH_UNIVERSE_CHANGED')
 const ids=new Set(),files=new Set(),groupHtml=[],rowsPerGroup=[]
 let linkedBlind=0,linkedTeacher=0,linkedAdoption=0,highest=0
 for(const group of key.groups){
  const rows=[]
  if(group.items.length!==group.awaitingFaculty||group.awaitingFaculty<1)fail('EMPTY_REVIEW_GROUP')
  for(const q of group.items){
   const record=originals.get(q.originalId)
   if(!record||ids.has(q.originalId)||q.sourceQuestionRevisionSha256!==record.originalRevisionSha256||
      q.sourceFileSha256!==record.originalResearchFileSha256||record.groupKey!==group.groupKey)
    fail('ORIGINAL_ID_SHA_OR_REVIEW_GROUP_DRIFT')
   ids.add(q.originalId)
   if(!SAFE.test(q.originalId)||!SAFE.test(q.privateFacultyTemplate)||
      !SAFE.test(q.privateBatch)||!SAFE.test(record.sourceCatalogId)||
      !Number.isSafeInteger(q.priorityScore)||q.priorityScore<0)
    fail('NOT_SOURCE_BOUND_ID_OR_PATH')
   const blind='packets/'+runId+'/offline-readable-20261015/'+q.privateBatch+'.blind.html'
   const teacher='faculty-intake/'+runId+'/'+q.privateFacultyTemplate
   const adopt='school-adoption/'+runId+'/'+record.sourceCatalogId+'.unsigned-school-adoption.json'
   for(const file of [blind,teacher,adopt]){
    if(!files.has(file))authorizedFile(root,file)
    files.add(file)
   }
   linkedBlind++;linkedTeacher++;linkedAdoption++
   if(q.priorityScore>highest)highest=q.priorityScore
   if(q.paperStudioSelectable!==false||q.qualifiedReviewerValidated!==false||q.blindReviewCompleted!==false||
      !Array.isArray(q.nonAuthoritativeRiskCodes))fail('FALSE_HUMAN_REVIEW_OR_APPROVED_STATE')
   const title=q.nonAuthoritativeRiskCodes.length?q.nonAuthoritativeRiskCodes.join('; '):
      'STANDARD_INDEPENDENT_SOURCE_REVIEW'
   rows.push('<tr id="'+esc(q.originalId)+'"><td><code>'+esc(q.originalId)+'</code></td>'+
    '<td>'+q.priorityScore+'</td><td>'+esc(record.questionType)+'</td>'+
    '<td>'+esc(title)+'</td><td><a href="'+esc(blind)+'">Blind worksheet</a></td>'+
    '<td><a href="'+esc(teacher)+'">Unsigned teacher form</a></td>'+
    '<td><a href="'+esc(adopt)+'">Book adoption form</a></td></tr>')
  }
  rowsPerGroup.push({groupKey:group.groupKey,candidates:group.items.length})
  groupHtml.push('<details><summary>'+esc(group.groupKey)+' — '+group.items.length+
   ' original source questions needing qualified verification</summary>'+
   '<div class="scroll"><table><thead><tr><th>Original question ID</th><th>Priority</th>'+
   '<th>Type</th><th>Unverified source-risk signals</th><th>Question</th><th>Eight checks</th>'+
   '<th>Adopted book evidence</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div></details>')
 }
 if(ids.size!==2580||linkedBlind!==2580||linkedTeacher!==2580||linkedAdoption!==2580||
    ids.has('X-CHEM-C23-L01')||originals.size-ids.size!==1)
  fail('NOT_ALL_2580_OR_HELD_ORIGINAL_PUBLISHED')
 const css='<style>body{font:14px/1.6 system-ui,Arial,sans-serif;max-width:1320px;margin:0 auto;'+
 'padding:25px;background:#f5f8fc;color:#172e48}header{background:#102f51;color:white;border-radius:12px;'+
 'padding:20px 28px}h1{font-size:24px;margin:0}h2{font-size:17px}details{background:white;'+
 'border:1px solid #c7d3df;border-radius:9px;margin:14px 0;padding:12px}summary{font-weight:700;'+
 'cursor:pointer}table{border-collapse:collapse;font-size:12px;width:100%}th,td{padding:8px;'+
 'border-bottom:1px solid #d6e0eb;text-align:left;vertical-align:top;overflow-wrap:anywhere}'+
 'th{background:#edf3fa}td:nth-child(4){max-width:230px}.scroll{overflow-x:auto}'+
 'a{color:#0b5088}code{font-size:11px}.warn{color:#883619;font-weight:bold}'+
 'footer{border-top:1px solid #bbc;padding:18px 0}@media print{details{break-inside:avoid}}'+
 '</style>'
 const html='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
 '<title>ASSPS Grade IX-X Full Private Faculty Review Workbench</title>'+css+
 '</head><body><header><h1>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</h1>'+
 '<p>Grade IX–X | 2,580 original-source faculty review questions | 56 review groups</p></header>'+
 '<h2>Private on-campus academic review — full source coverage</h2>'+
 '<p class="warn">ALL ITEMS UNREVIEWED FOR INSTITUTIONAL PUBLICATION. No school textbook or 2027 board scheme adopted by this page. No teacher or Principal signature created. Grade X Chemistry original X-CHEM-C23-L01 remains faculty-held.</p>'+
 '<p><strong>Review process:</strong> Find the exact original question ID using Ctrl+F or expand the grade/subject/medium group; open the BLIND worksheet, record your own answer before viewing any separately restricted reference material, then complete the linked eight-check UNSIGNED teacher form and capture genuinely verifiable adopted textbook proof in the corresponding UNSIGNED adoption form. These template links do not submit, approve or publish anything. Submit completed evidence only through the authorized restricted institutional workflow. A teacher and Principal must independently authenticate approvals.</p>'+
 '<p>Higher priority and risk labels are <strong>editorial signals only</strong>, not established errors, correct answer keys or academic approval. This offline index has no remote scripts, tracking, uploads or automatic form modifications.</p>'+
 groupHtml.join('\n')+
 '<footer>Original 2,581 research IDs unchanged. Only 2,580 qualify for review pack delivery. Zero academically approved and zero published. Actual Paper Studio approved-only selector remains fail-closed.</footer></body></html>\n'
 if(html.includes('<script')||html.includes('https://')||html.includes('http://')||
    html.includes('answer-review.json')||html.includes('reference.html'))
  fail('PRIVATE_WORKBENCH_ANSWER_OR_NETWORK_LEAK')
 return{html,receipt:{
  schema:'assps-grade910-complete-owner-only-2580-faculty-review-workbench-v1',
  session:'2026-27',originalResearchCandidates:2581,originalsNeedingHumanReview:2580,
  groups:56,heldOriginalId:'X-CHEM-C23-L01',blindWorksheetLinks:linkedBlind,
  unsignedTeacherFormLinks:linkedTeacher,unsignedBookEvidenceFormLinks:linkedAdoption,
  uniqueExistingPrivateFilesReferenced:files.size,
  maxEditorialPriority:highest,groupCounts:rowsPerGroup,
  originalPublicCrosswalkSha256:SHA(sourceBuf),
  originalPrivateRiskPrioritySha256:SHA(fs.readFileSync(authorizedFile(root,PRIORITY))),
  offlineWorkbenchSha256:SHA(html),
  authenticIndependentTeacherReviews:0,realBookAdoptionsConfirmed:0,
  schoolPrincipalAuthenticatedApprovals:0,academicallyApproved:0,published:0,
  productionWrites:0,releaseDecision:'HOLD_AUTHENTIC_SCHOOL_ACADEMIC_EVIDENCE'
 }}
}
function create(o){
 const r=build(o),file=path.join(safeDir(o.base),WORKBENCH)
 if(fs.existsSync(file)||fs.existsSync(OUT))fail('NONDESTRUCTIVE_IMMUTABLE_WORKBENCH_ALREADY_EXISTS')
 fs.writeFileSync(file,r.html,{mode:0o600,flag:'wx'})
 fs.writeFileSync(OUT,JSON.stringify(r.receipt,null,2)+'\n',{flag:'wx'})
 return r.receipt
}
function verify(o){
 const r=build(o),file=authorizedFile(safeDir(o.base),WORKBENCH)
 if(fs.readFileSync(file,'utf8')!==r.html||
    fs.readFileSync(OUT,'utf8')!==JSON.stringify(r.receipt,null,2)+'\n')
  fail('SEALED_WORKBENCH_OR_SOURCE_REVISION_DRIFT')
 return r.receipt
}
if(require.main===module){
 const a=process.argv.slice(2),get=k=>{const i=a.indexOf(k);return i<0?null:a[i+1]}
 const opts={base:get('--base'),runId:get('--run-id')}
 try{const result=a.includes('--write')?create(opts):verify(opts);console.log(JSON.stringify(result))}
 catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={build,create,verify,authorizedFile,WORKBENCH,OUT}
