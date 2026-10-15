#!/usr/bin/env node
'use strict'
// Offline, passive, print-ready academic review. No authorization action, no
// signature simulation, no network, and no approved/published record creation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const DIR=path.join(ROOT,'docs/question-bank')
const PRIVATE_DIR=path.resolve(process.env.ASSPS_GRADE910_PRIVATE_REVIEW_DIR||path.join(ROOT,'.assps-private-reviews','grade910-20261015'))
const JSON_PATH=path.join(DIR,'ASSPS_GRADE910_66_CURATED_MCQ_OPTION_REVISION_DRAFTS_20261015.json')
const QUEUE_PATH=path.join(DIR,'ASSPS_GRADE910_584_UNIFIED_ACADEMIC_REVIEW_QUEUE_20261015.json')
const BLIND=path.join(PRIVATE_DIR,'ASSPS_GRADE910_66_BLIND_FACULTY_OPTION_REVIEW_20261015.html')
const KEY=path.join(PRIVATE_DIR,'ASSPS_GRADE910_66_RESTRICTED_FACULTY_KEY_REVIEW_20261015.html')
const MANIFEST=path.join(PRIVATE_DIR,'ASSPS_GRADE910_66_OFFLINE_REVIEW_PRINT_MANIFEST_20261015.json')
const SHA=b=>crypto.createHash('sha256').update(b).digest('hex')
const ABSOLUTE_CUE=require('./audit-grade910-66-residual-option-cues-20261015.cjs').absolute
const fail=x=>{throw Error('GRADE910_66_PRIVATE_REVIEW_'+x)}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const stylesheet=`
@page{size:A4;margin:14mm 13mm 17mm}
*{box-sizing:border-box}
body{font-family:Arial,'Times New Roman',sans-serif;color:#18314b;margin:0;font-size:12px;line-height:1.45}
h1{font-size:20px;line-height:1.2;margin:0 0 6px;color:#10365d}
h2{font-size:15px;line-height:1.25;margin:0 0 10px;color:#156d88}
p{margin:4px 0 9px}
.cover{border-bottom:3px solid #167d98;margin-bottom:20px;padding-bottom:16px}
.label{font-weight:bold;color:#526579;letter-spacing:.04em;font-size:10px}
.hold{font-size:12px;font-weight:bold;color:#a12525;border:1px solid #a12525;padding:8px;display:inline-block;margin:8px 0}
.warning{border-left:3px solid #a12525;padding-left:10px;color:#5f2731}
.question{break-inside:avoid;border:1px solid #c4d3dc;border-radius:7px;padding:13px;margin-bottom:18px;page-break-inside:avoid}
.question header{display:flex;justify-content:space-between;gap:14px;margin-bottom:9px}
.qstem{font-weight:bold;font-size:13px;margin-bottom:11px}
.options{margin:7px 0 12px;padding:0;list-style:none}
.options li{margin:5px 0;padding:4px 8px;border-left:2px solid #cddbe6}
.meta{font-size:10px;color:#536578;word-break:break-word}
.reviewfields{border-top:1px dashed #b0c1cc;padding-top:10px;font-size:11px}
.line{margin:8px 0;border-bottom:1px dotted #a5b7c4;height:12px}
.badge{font-size:10px;color:#5b2734;font-weight:bold}
[dir="rtl"]{font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif;text-align:right;line-height:2.1;unicode-bidi:isolate}
.footer{margin-top:12px;color:#607384;font-size:9px}
@media print{.question{border-color:#bccbd4;box-shadow:none} .cover{page-break-after:always} a{color:inherit;text-decoration:none}}
`
function load(){
 const raw=fs.readFileSync(JSON_PATH),rawQ=fs.readFileSync(QUEUE_PATH)
 const a=JSON.parse(raw),queue=JSON.parse(rawQ)
 if(a.curatedProposalCount!==66||a.rows.length!==66)fail('WRONG_CANDIDATE_COUNT')
 if(queue.sourceShaBoundQuestions!==584||queue.curatedDistractorRevisions!==66)fail('WRONG_QUEUE_COUNT')
 if(queue.evidenceFiles[path.basename(JSON_PATH)]!==SHA(raw))fail('CURATED_ARTIFACT_DIGEST_MISMATCH')
 const map=new Map(queue.rows.filter(x=>x.individuallyCuratedDistractors).map(x=>[x.originalId,x]))
 if(map.size!==66)fail('REVIEW_QUEUE_NO_66_ENTRIES')
 for(const item of a.rows){
  const q=map.get(item.originalId)
  if(!q||q.originalRevisionSha256!==item.originalRevisionSha256||
   q.newDistractorProposalHash!==item.proposalSha256||q.evidenceFileSha256!==queue.evidenceFiles[q.evidenceFile])
   fail('SOURCE_SHA_OR_QUEUE_REVISION_TAMPER_'+item.originalId)
  if(q.paperStudioSelectable||q.academicallyApproved||q.published||
     item.proposal.academicallyApproved||item.proposal.published)
   fail('UNAUTHORIZED_PUBLISH_STATUS')
 }
 return{items:a.rows,sourceHash:SHA(raw),queueHash:SHA(rawQ)}
}
const block=(item,mode)=>{
 const {proposal:p}=item,urdu=p.medium==='urdu',rtl=urdu?'rtl':'ltr'
 const options=p.options.map(o=>`<li><b>${esc(o.id)}.</b> <span dir="${rtl}">${esc(o.text)}</span></li>`).join('')
 const cueCount=p.options.filter(o=>o.id!==p.proposedCorrectOptionId&&ABSOLUTE_CUE.test(o.text)).length
 const key=mode==='restricted'?`
  <p class="badge">SOURCE REFERENCE ANSWER (UNVERIFIED): ${esc(p.proposedCorrectOptionId)} — <span dir="${rtl}">${esc(p.proposedAnswerText)}</span></p>
  <p class="meta">Original file SHA-256: ${esc(item.originalSourceFileSha256)}</p>
  <p class="meta">Original reference revision: ${esc(item.originalRevisionSha256)}</p>
  <p class="meta">Proposal revision SHA-256: ${esc(item.proposalSha256)}</p>
  <p class="warning">Absolute/exclusive wording cue in alternatives: ${cueCount}/3. Objective drafting heuristic only; review each option independently.</p>
  <p class="warning">Verify that ALL THREE alternative distractors are unequivocally false; numeric/grammar accuracy and edition adoption have not been certified. Review options for concealed second correct answers, Urdu translation and ambiguity.</p>
  `:''
 const fields=mode==='restricted'?`
  <p>Reviewer decision (circle manually): ACCEPT AS DRAFT / RETURN FOR REVISION / REJECT</p>
  <p>Source book title / physical printed edition / medium: _____________________________________________</p>
  <p>Verified chapter, exercise and printed page: _______________________________________________________</p>
  <p>Reviewer full name, school role and review date: ___________________________________________________</p>
  <p>Separate institutional authenticated revision signoff reference (if subsequently provided): ___________________</p>
  `:`
  <p>Blind quality evaluation: Are ALL FOUR options grammatically parallel and plausibly distinguishable?</p>
  <p>Flags (circle manually): DOUBLE-CORRECT / INVALID-DISTRACTOR / TRIVIAL-ELIMINATION / URDU-WORDING / OTHER</p>
  `
 return `<section class="question" data-question="${esc(item.originalId)}">
   <header><span class="label">${esc(item.originalId)}</span><span class="label">Grade ${esc(p.grade)} · ${esc(p.subject)} · ${esc(p.medium)} · ${esc(p.marks)} mark(s)</span></header>
   <div class="qstem" dir="${rtl}">${esc(p.originalStem)}</div>
   <ol class="options">${options}</ol>
   ${key}
   <div class="reviewfields">${fields}<p>Notes / required correction:</p><div class="line"></div><div class="line"></div></div>
  </section>`
}
function html(items,mode,sourceHash){
 if(!['blind','restricted'].includes(mode))fail('UNKNOWN_REVIEW_MODE')
 const head=mode==='blind'?'BLIND REVIEW · KEY HIDDEN':'RESTRICTED FACULTY KEY · NOT VERIFIED'
 const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>ASSPS IX–X '+esc(head)+'</title><style>'+stylesheet+'</style></head><body>'+
  '<section class="cover"><div class="label">AL SIDDIQUE SCHOLARS PUBLIC SCHOOL (ASSPS) | Grade IX–X 2026–27</div>'+
  '<h1>MCQ Question Quality Review — 66 Original Source Revisions</h1><h2>'+esc(head)+'</h2>'+
  '<div class="hold">NOT SCHOOL-APPROVED · NOT FOR EXAM PAPER USE · OFFLINE REVIEW ONLY</div>'+
  '<p>One original SHA-bound question per review card, curated options only. Do not infer textbook edition, student exam eligibility or correctness from this printout.</p>'+
  '<p>Research source draft SHA-256: <code>'+esc(sourceHash)+'</code></p>'+
  (mode==='blind'?
   '<p>Correct-letter metadata is deliberately not printed; evaluate the quality, clarity and plausibility of the choices without knowing the proposed key.</p>':
   '<p>This separate private sheet exposes the recorded answer reference, NOT a qualified-teacher-approved answer. Only genuine institutional review can authorize an approved revision.</p>')+
  '</section>'+
  items.map(v=>block(v,mode)).join('\n')+
  '<footer class="footer">ASSPS Academic Master · review-only proposal · no electronic signing or publication is performed by this document</footer></body></html>'
 return page.replace(/[ \t]+$/gm,'')
}
function storePrivate(file,data){
 if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())fail('REVIEW_FILE_SYMLINK_REFUSED')
 fs.writeFileSync(file,data,{encoding:'utf8',mode:0o600})
 fs.chmodSync(file,0o600)
}
function write(){
 fs.mkdirSync(PRIVATE_DIR,{recursive:true,mode:0o700})
 if(fs.lstatSync(PRIVATE_DIR).isSymbolicLink()||!fs.lstatSync(PRIVATE_DIR).isDirectory())
  fail('REVIEW_FOLDER_UNSAFE')
 fs.chmodSync(PRIVATE_DIR,0o700)
 const {items,sourceHash,queueHash}=load()
 const blind=html(items,'blind',sourceHash),restricted=html(items,'restricted',sourceHash)
 storePrivate(BLIND,blind)
 storePrivate(KEY,restricted)
 const manifest={
  schema:'assps-grade910-66-two-channel-review-html-v1',
  dataRevisionSha256:sourceHash,reviewQueueSha256:queueHash,
  candidateCount:66,
  blind:{file:path.basename(BLIND),sha256:SHA(Buffer.from(blind)),answerKeysIncluded:false},
  restricted:{file:path.basename(KEY),sha256:SHA(Buffer.from(restricted)),sourceReferenceKeysIncluded:true,schoolFacultyApprovalCount:0},
  allowsElectronicApproval:false,hasRealSignatures:false,academicallyApproved:false,published:false,
  warning:'A printed offline form is not a signed approval and must not be imported into Paper Studio.'
 }
 storePrivate(MANIFEST,JSON.stringify(manifest,null,2)+'\n')
 return manifest
}
function verify(){
 const m=JSON.parse(fs.readFileSync(MANIFEST)),current=load()
 if(m.dataRevisionSha256!==current.sourceHash||m.reviewQueueSha256!==current.queueHash)fail('SOURCE_EVIDENCE_CHANGED')
 for(const key of ['blind','restricted']){
  const item=m[key],target=key==='blind'?BLIND:KEY
  if(item.sha256!==SHA(fs.readFileSync(target)))fail('RENDER_BYTES_CHANGED_'+key)
  const regenerated=html(current.items,key,current.sourceHash)
  if(item.sha256!==SHA(Buffer.from(regenerated)))fail('RENDER_NOT_REPRODUCIBLE_'+key)
 }
 if(m.hasRealSignatures||m.academicallyApproved||m.published||m.allowsElectronicApproval)
  fail('REVIEW_PACKET_MISREPRESENTS_AUTHORITY')
 return{verified:true,count:current.items.length,blindSha256:m.blind.sha256,restrictedSha256:m.restricted.sha256}
}
if(require.main===module)console.log(JSON.stringify({manifest:write(),verified:verify()}))
module.exports={load,html,esc,write,verify,BLIND,KEY,MANIFEST}
