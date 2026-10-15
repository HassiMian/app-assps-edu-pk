#!/usr/bin/env node
'use strict'
// Print-ready private offline faculty review packets. No browser JS, no network, no approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const factory=require('./build-grade910-blind-faculty-packets.cjs')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const reject=x=>{throw Error('GRADE910_PRIVATE_REVIEW_RENDER_'+x)}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const LABELS={curriculumApplicability:'Curriculum and examination-year applicability',
 textbookEditionAndPrintedPage:'Actual adopted textbook edition / exercise page if claimed',
 questionCorrectness:'Question and scientific factual correctness',
 answerAndOptionCorrectness:'Answer, option validity and correct key',
 marksAndDifficulty:'Marks, difficulty and scoring rubric',
 languageAccuracy:'Urdu/English grammar and semantic equivalence',
 duplicatesAndOriginality:'Duplicates, originality and ambiguous questions',
 sourceProvenance:'Original source, edition, chapter and topic'}
const STYLES=`
@page{size:A4;margin:15mm 14mm 16mm}
*{box-sizing:border-box}
body{font-family:Arial,'Times New Roman',sans-serif;color:#172b4c;line-height:1.48;margin:0}
h1{font-size:20px;margin:0;color:#123c65}h2{font-size:13px;margin:0 0 8px}
header{border-bottom:3px solid #22789a;margin:0 0 16px;padding:0 0 12px}
.meta{color:#476079;font-size:11px;margin:4px 0}.watermark{color:#b42318;font-size:10px;font-weight:bold}
.exam{font-size:11px;font-weight:bold;letter-spacing:.5px;color:#546678}
.q{break-inside:avoid;page-break-inside:avoid;border-bottom:1px solid #cfd8e3;padding:0 0 15px;margin:0 0 16px}
.qhead{display:flex;justify-content:space-between;gap:12px;background:#f0f4f7;border-left:3px solid #22789a;
 padding:7px 8px;font-size:11px;font-weight:bold;margin-bottom:10px}
.details{font-size:9px;color:#4d6480;overflow-wrap:anywhere;margin:4px 0 9px}
.prompt{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
.ur{direction:rtl;text-align:right;font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif;
 font-size:16px;line-height:2.1}
.part{margin:10px 0}
.options{list-style:none;counter-reset:none;padding:0;margin:8px 0}
.options li{padding:4px 0 3px 5px;border-bottom:1px dotted #d8dee7;font-size:12px}
.options.ur li{text-align:right;padding:5px;font-size:15px}
.line{border-bottom:1px solid #b7c3ce;height:23px}
.note{font-size:9px;color:#4d6480;margin:6px 0}
.blank{padding:8px;border:1px solid #cbd3da;margin-top:8px;font-size:11px}
.checks{display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;margin:7px 0 12px}
.check{border:1px solid #d1d9e0;padding:6px;font-size:10px;break-inside:avoid}
.keep{break-inside:avoid;page-break-inside:avoid}
.footer{font-size:9px;color:#64758b;border-top:1px solid #bdcbd5;padding:8px 0;margin:12px 0}
.answer{background:#fff9e7;padding:9px;white-space:pre-wrap;overflow-wrap:anywhere}
@media screen{body{max-width:820px;margin:25px auto;padding:25px;box-shadow:0 3px 25px #cbd5e1}}
@media print{body{max-width:none;margin:0;padding:0}.q{break-inside:avoid}}
`
const csp="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; connect-src 'none'; img-src 'none'"
const iso=(value)=>esc(value==null?'UNVERIFIED / UNASSIGNED':value)
function part(lang,payload,{answer=false}={}){
 if(!payload)return''
 const l=lang==='ur'?'ur':''
 const question=payload.question
 const opts=payload.options
 let h='<div class="part '+l+'" lang="'+esc(lang)+'">'
 if(typeof question==='string')h+='<div class="prompt">'+esc(question)+'</div>'
 if(Array.isArray(opts)){
  h+='<ul class="options '+l+'">'
  for(const o of opts){
   const label=typeof o==='object'?o.id:null,text=typeof o==='object'?o.text:o
   h+='<li>'+esc(label?label+'. ':'')+esc(text)+'</li>'
  }
  h+='</ul>'
 }
 if(answer&&payload.answerReference!=null){
  h+='<div class="answer"><strong>Original answer reference — NOT independently verified:</strong> '+
    esc(payload.answerReference)+'</div>'
 }
 if(answer&&payload.explanationReference!=null)
  h+='<div class="note">Unverified draft explanation: '+esc(payload.explanationReference)+'</div>'
 return h+'</div>'
}
function page(doc,{kind,batch}){
 if(!['blind','answer','decisions'].includes(kind))reject('INVALID_OFFLINE_DOCUMENT_KIND')
 if(!Array.isArray(doc.items)||doc.items.length<1||doc.items.length>40)reject('BAD_FACULTY_BATCH_SIZE')
 const isBlind=kind==='blind',isReference=kind==='answer'
 let html='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="'+esc(csp)+'">'+
  '<title>ASSPS '+esc(batch)+' — '+esc(kind)+'</title><style>'+STYLES+'</style></head><body>'
 html+='<header><div class="exam">AL SIDDIQUE SCHOLARS PUBLIC SCHOOL — GRADE IX–X</div>'+
  '<h1>Independent Academic Faculty Review · '+esc(kind.toUpperCase())+'</h1>'+
  '<div class="watermark">PROVISIONAL / RESEARCH ONLY — 0 VERIFIED APPROVALS — NOT FOR STUDENT EXAMS</div>'+
  '<div class="meta">Source-locked batch: '+esc(batch)+' | '+doc.items.length+' original question(s). '+
  'Only real qualified school faculty may assess or sign outside this unsigned reference.</div></header>'
 for(let i=0;i<doc.items.length;i++){
  const q=doc.items[i],id=kind==='decisions'?q.originalQuestionId:q.id
  const source=kind==='decisions'?q:q
  html+='<section class="q"><div class="qhead"><span>Original '+(i+1)+': '+esc(id)+'</span>'+
   '<span>'+esc(source.gradeClaim)+' / '+esc(source.subjectClaim)+' / '+esc(source.mediumClaim)+
   ' · '+esc(source.marks)+' marks</span></div>'
  html+='<div class="details">Original revision SHA256: '+esc(source.originalQuestionRevisionSha256)+
   ' | Original source file SHA256: '+esc(source.originalSourceFileSha256)+'</div>'
  if(kind==='decisions'){
   html+='<h2>Independent answer BEFORE viewing original reference</h2><div class="line"></div>'+
    '<div class="line"></div><div class="line"></div>'+
    '<div class="blank">Actual school-adopted book/edition: __________________________ '+
    'Board exam year: __________ Physical exercise/page if claimed: __________</div>'+
    '<h2 style="margin-top:10px">Independent academic checks (none pre-approved)</h2><div class="checks">'
   for(const name of factory.CHECKS)
    html+='<div class="check">☐ '+esc(LABELS[name]||name)+
      '<div class="note">Evidence/ref: ____________________</div></div>'
   html+='</div><div class="blank">Subject reviewer signature / authenticated ID: ____________________<p>'+
    'Independent Urdu reviewer when applicable: ____________________</p>'+
    'School academic approver (separate from author/reviewer): ____________________<p>'+
    'Final reviewed QUESTION revision SHA: __________________________________</p>'+
    'Final reviewed ANSWER revision SHA: __________________________________</p></div>'
  }else{
   const content=isReference?q.answerTextOriginalCandidateOnly:q.question
   for(const lang of ['en','ur','original'])if(content?.[lang])
    html+=part(lang,content[lang],{answer:isReference})
   if(isReference){
    html+='<div class="note">Original answer key (unverified): '+
       iso(q.originalCorrectOptionIdNotIndependentCheck)+
       '. Do NOT convert this reference into a verified school examination answer without independent teacher review.</div>'
   }else html+='<div class="blank"><strong>Independent answer / solution / reasoning:</strong>'+
       '<div class="line"></div><div class="line"></div><div class="line"></div></div>'
  }
  html+='</section>'
 }
 html+='<footer class="footer">ASSPS private teacher review. Do not publish, seed, distribute to students, or treat as authenticated approval.'+
  ' This print-only HTML has no scripts, external resources, submission, tracking or network activity.</footer></body></html>'
 return html
}
function requireSafeDir(d){
 const st=fs.lstatSync(d)
 if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0||
   st.uid!==process.getuid())reject('PRIVATE_FOLDER_PERMISSIONS')
 if(fs.realpathSync(d)!==path.resolve(d))reject('PRIVATE_FOLDER_SYMLINK_ANCESTOR')
}
function writeOwned(file,data){
 const nofollow=fs.constants.O_NOFOLLOW||0
 const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|
   fs.constants.O_EXCL|nofollow,0o600)
 try{fs.writeFileSync(fd,data)}finally{fs.closeSync(fd)}
}
function safeRenderId(x){
 if(typeof x!=='string'||!/^[a-z][a-z0-9_-]{2,59}$/.test(x))
  reject('NEW_SAFE_RENDER_ID_REQUIRED')
 return x
}
function loadBase({base,runId}){
 const b=factory.safeBase(base)
 if(!/^[a-z0-9][a-z0-9_-]{2,59}$/.test(String(runId||'')))
  reject('BAD_PRIVATE_RUN_IDENTIFIER')
 const dir=path.join(b,runId)
 requireSafeDir(dir)
 return dir
}
function renderAll({base,runId,renderId}){
 const safe=safeRenderId(renderId),sourceDir=loadBase({base,runId})
 const verification=factory.verifyPrivateExport({base,runId})
 if(verification.verifiedOriginalIds!==2580||verification.heldNotExported!==1)
  reject('FROZEN_REVIEW_EXPORT_NOT_VERIFIED')
 const sourceIndex=JSON.parse(fs.readFileSync(path.join(sourceDir,'INDEX.json'),'utf8'))
 const renderDir=path.join(sourceDir,safe)
 fs.mkdirSync(renderDir,{mode:0o700})
 requireSafeDir(renderDir)
 let count=0,rendered=0
 const files=[]
 for(const original of sourceIndex.filePairs){
  const batch=original.batch
  if(!/^[a-z0-9_-]+--batch-\d{3,4}$/.test(batch))reject('UNSAFE_SOURCE_BATCH_NAME')
  const b=JSON.parse(fs.readFileSync(path.join(sourceDir,batch+'.blind.json'),'utf8'))
  const a=JSON.parse(fs.readFileSync(path.join(sourceDir,batch+'.answer-review.json'),'utf8'))
  const d=JSON.parse(fs.readFileSync(path.join(sourceDir,batch+'.unsigned-decisions.json'),'utf8'))
  if(b.items.length!==a.items.length||b.items.length!==d.items.length)reject('MISMATCHED_BATCH_ROWS')
  const enrichedDecisions={...d,items:d.items.map((item,i)=>{
   const q=b.items[i]
   if(item.originalQuestionId!==q.id||item.originalQuestionRevisionSha256!==
     q.originalQuestionRevisionSha256)reject('DIFFERENT_ORIGINAL_REVISION_IN_DECISION')
   return{...item,gradeClaim:q.gradeClaim,subjectClaim:q.subjectClaim,
    mediumClaim:q.mediumClaim,marks:q.marks}
  })}
  const docs=[['blind',b],['reference',a],['decision',enrichedDecisions]]
  for(const [kind,doc] of docs){
   const actualKind=kind==='reference'?'answer':kind==='decision'?'decisions':'blind'
   const html=page(doc,{kind:actualKind,batch})
   const filename=batch+'.'+kind+'.html'
   writeOwned(path.join(renderDir,filename),html)
   files.push({name:filename,sha256:sha(html),type:kind,originalQuestions:b.items.length})
   rendered++
  }
  count+=b.items.length
 }
 if(count!==2580||rendered!==sourceIndex.filePairs.length*3)reject('UNEXPECTED_HUMAN_HTML_TOTALS')
 const output={schemaVersion:'assps-grade910-secure-human-readable-teacher-qa-v1',
  privateSourceIndexSha256:sha(fs.readFileSync(path.join(sourceDir,'INDEX.json'))),
  originalCandidates:2581,privatePrintableQuestions:count,facultyHeldNotRendered:1,
  originalBatches:sourceIndex.teacherPacketCount,renderedHtmlFiles:rendered,
  reviewerSignaturesAuthenticated:0,schoolQuestionApprovals:0,
  verifiedPublished:0,teacherVerifiedPickerEnabled:false,
  strictOfflineNoScripts:true,neverStoreOnPublicGit:true,
  disclaimer:'Teacher-readable PRIVATE offline research packets, NOT an academic approval or publication',
  files}
 writeOwned(path.join(renderDir,'RENDERED_INDEX.json'),JSON.stringify(output,null,2)+'\n')
 const links=files.filter(x=>x.type==='blind').map(x=>
  '<li><a href="'+esc(x.name)+'">'+esc(x.name.replace(/\.blind\.html$/,''))+
  '</a> — '+x.originalQuestions+' unapproved original questions</li>').join('\n')
 writeOwned(path.join(renderDir,'START_HERE.html'),'<!DOCTYPE html><html><head><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="'+esc(csp)+'">'+
  '<title>ASSPS — PRIVATE teacher question review</title><style>'+STYLES+'</style></head>'+
  '<body><header><h1>ASSPS IX–X · PRIVATE faculty review</h1>'+
  '<div class="watermark">UNREVIEWED RESEARCH — NO APPROVED / STUDENT QUESTIONS</div>'+
  '<p class="note">Start each group with the BLIND sheet. Reference answers and unsigned decisions remain in separate local files.</p></header>'+
  '<ul>'+links+'</ul><footer class="footer">No network or scripts. Do not expose this private directory to students.</footer></body></html>')
 return{privateRenderDir:renderDir,printedOriginals:count,htmlQuestionSheets:rendered,
  indexSha256:sha(fs.readFileSync(path.join(renderDir,'RENDERED_INDEX.json'))),
  schoolApproved:0,publisherSelectable:false,publication:'HOLD'}
}
function verifyRendered({base,runId,renderId}){
 const name=safeRenderId(renderId),sourceDir=loadBase({base,runId})
 const sourceResult=factory.verifyPrivateExport({base,runId})
 if(sourceResult.verifiedOriginalIds!==2580)reject('BAD_PRIVATE_SOURCE_REVIEW')
 const d=path.join(sourceDir,name)
 requireSafeDir(d)
 const original=fs.readFileSync(path.join(sourceDir,'INDEX.json'))
 const expected=JSON.parse(original).filePairs.length
 if(!Number.isInteger(expected)||expected<60||expected>2580)reject('PRIVATE_PRINT_BATCH_COUNT_INVALID')
 const index=JSON.parse(fs.readFileSync(path.join(d,'RENDERED_INDEX.json'),'utf8'))
 if(index.privateSourceIndexSha256!==sha(original)||index.privatePrintableQuestions!==2580||
  index.originalBatches!==expected||index.facultyHeldNotRendered!==1||
  index.teacherVerifiedPickerEnabled!==false||index.verifiedPublished!==0||
  index.reviewerSignaturesAuthenticated!==0||
  !Array.isArray(index.files)||index.files.length!==expected*3)reject('BAD_PRINTABLE_INDEX')
 for(const row of index.files){
  if(!/^[a-z0-9_-]+--batch-\d{3,4}\.(blind|reference|decision)\.html$/.test(row.name))
   reject('INVALID_RENDERED_FILENAME')
  const p=path.join(d,row.name),st=fs.lstatSync(p)
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||
   (st.mode&0o077)!==0)reject('BAD_RENDERED_PERMISSIONS')
  const data=fs.readFileSync(p,'utf8')
  if(sha(data)!==row.sha256||
   data.includes('<script')||data.includes('http-equiv="refresh"')||
   !data.includes("default-src &#39;none&#39;"))reject('RENDERED_HTML_TAMPER_OR_NETWORK')
  if(row.type==='blind'&&(data.includes('Original answer reference')||
     data.includes('Original answer key (unverified)')))reject('BLIND_ANSWER_LEAK')
 }
 return{verifiedHtmlFiles:index.files.length,privateCandidates:index.privatePrintableQuestions,
  heldOutside:1,shaVerified:true,academicApproved:0,studentPublication:false}
}
if(require.main===module){
 const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]}
 try{
  if(args.includes('--generate')){
   if(!args.includes('--explicit-private-render'))reject('EXPLICIT_PRIVATE_RENDER_PERMISSION_REQUIRED')
   console.log(JSON.stringify(renderAll({base:get('--base'),runId:get('--run-id'),
    renderId:get('--render-id')})))
  }else if(args.includes('--verify'))
   console.log(JSON.stringify(verifyRendered({base:get('--base'),runId:get('--run-id'),
    renderId:get('--render-id')})))
  else console.log(JSON.stringify({privateHtmlAvailableWithExplicitAuthorization:true,
    schoolAcademicApprovals:0,publication:'HOLD',noHtmlProduced:true}))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={page,part,esc,renderAll,verifyRendered,requireSafeDir}
