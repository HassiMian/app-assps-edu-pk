#!/usr/bin/env node
'use strict'
// Offline read-only teacher triage navigation. Links ONLY to prior verified BLIND
// content. Does not grant publication, check correctness, or expose answer keys.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const p=require('./prepare-grade910-private-faculty-quality-overlay-20261015.cjs')
const c=require('./verify-grade910-private-all2581-delivery-20261015.cjs')
const NAME='PRIVATE_TEACHER_QUALITY_REVIEW_START_HERE.html'
const ATTEST=path.resolve(__dirname,'../../docs/question-bank/ASSPS_GRADE910_PRIVATE_FACULTY_PRIORITY_HTML_ATTESTATION_20261015.json')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fail=v=>{throw Error('ASSPS_PRIVATE_REVIEW_INDEX_'+v)}
function render({base,runId}){
 p.verify({base,runId})
 const folder=c.safeDir(base),src=JSON.parse(fs.readFileSync(path.join(folder,p.NAME),'utf8'))
 if(src.groups.length!==56||src.privateReviewReady!==2580||src.published!==0)fail('UNSAFE_REVIEW_INDEX_SOURCE')
 const list=src.groups.map((group,i)=>{
  const entries=group.items.slice(0,12).map((q,j)=>{
   if(!/^[a-z0-9_-]+--batch-\d{3}$/.test(q.privateBatch))fail('UNSAFE_PRIVATE_BATCH_FILE')
   const href='packets/'+runId+'/offline-readable-20261015/'+q.privateBatch+'.blind.html'
   const code=q.nonAuthoritativeRiskCodes.length?q.nonAuthoritativeRiskCodes.join(', '):'STANDARD_SOURCE_REVIEW'
   return'<tr><td>'+esc(j+1)+'</td><td><code>'+esc(q.originalId)+'</code></td>'+
    '<td>'+esc(q.priorityScore)+'</td><td>'+esc(code)+'</td>'+
    '<td><a href="'+esc(href)+'">Open blind review</a></td></tr>'
  }).join('')
  return'<details'+(i===0?' open':'')+'><summary>'+esc(group.groupKey)+' — '+
   esc(group.awaitingFaculty)+' pending; '+esc(group.sourceHeld)+' source-held</summary>'+
   '<p>Showing the highest-priority '+Math.min(12,group.items.length)+' source-bound items. Full IDs and SHA-bound templates remain in the root-private priority JSON.</p>'+
   '<table><thead><tr><th>#</th><th>Original ID</th><th>Review priority</th><th>Potential risk codes (not verified errors)</th><th>Blind worksheet</th></tr></thead><tbody>'+entries+'</tbody></table></details>'
 }).join('\n')
 const html='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>ASSPS IX-X Private Academic Review Priorities</title>'+
  '<style>body{font-family:system-ui,Arial,sans-serif;margin:0 auto;max-width:1100px;padding:24px;line-height:1.55;color:#17243a;background:#f4f7fb}header{background:#102c4c;color:white;padding:22px;border-radius:12px}h1{font-size:25px;margin:0}p{max-width:92ch}details{margin:13px 0;background:#fff;border:1px solid #c8d4e1;border-radius:9px;padding:14px}summary{font-weight:700;cursor:pointer}table{border-collapse:collapse;width:100%;font-size:13px;overflow-wrap:anywhere}th,td{border-bottom:1px solid #d5e0e8;padding:8px;text-align:left}th{background:#e6eff9}a{color:#164e82}code{font-size:12px}.notice{font-weight:700;color:#8c3318}</style>'+
  '</head><body><header><h1>ASSPS Grade IX–X — Private Faculty Quality Review</h1>'+
  '<p>2,580 ORIGINAL RESEARCH CANDIDATES · 56 grade/subject/medium groups · 1 separate held source answer. NOT APPROVED FOR SCHOOL EXAMINATIONS.</p></header>'+
  '<p class="notice">Qualified staff review ONLY. No teacher, principal or school adoption approval is inferred. Open each BLIND sheet first. Original reference answers and unsigned decision records remain separate restricted files.</p>'+
  '<p>Priorities are editorial heuristics: repeated A-position keys, rubric-like long answers, similarities and wording cues do NOT prove factual inaccuracies. Existing correct option content must not be silently changed.</p>'+
  list+
  '<footer><p>Offline static content, no scripts, remote assets, submissions, authentication or production writes. Grade IX–X candidate research publication status: HOLD.</p></footer></body></html>\n'
 return html
}
function create(opts){
 const html=render(opts),f=path.join(c.safeDir(opts.base),NAME)
 if(fs.existsSync(f))fail('CANNOT_REWRITE_FROZEN_PRIVATE_INDEX')
 fs.writeFileSync(f,html,{flag:'wx',mode:0o600})
 return{privateHtmlSha256:sha(fs.readFileSync(f)),reviewGroups:56,candidates:2580,published:0}
}
function attest(opts){
 const verified=verify(opts)
 const source=JSON.parse(fs.readFileSync(p.PUBLIC,'utf8'))
 const receipt={schema:'assps-grade910-private-faculty-offline-blind-priority-index-v1',
  originalResearchQuestions:2581,blindReviewCandidates:2580,privateReviewGroups:56,
  privateSourcePrioritySha256:source.privatePrioritySha256,
  offlineBlindIndexSha256:verified.verifiedHtmlSha256,
  reviewedByRealSubjectTeacher:0,academicallyApproved:0,published:0,
  policy:'OFFLINE_PRIVATE_UNAPPROVED_BLIND_QA_ONLY_NO_SOURCE_ANSWER_PUBLICATION'}
 fs.writeFileSync(ATTEST,JSON.stringify(receipt,null,2)+'\n')
 return receipt
}
function verify(opts){
 const expected=render(opts),f=path.join(c.safeDir(opts.base),NAME),st=fs.lstatSync(f)
 if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid()||(st.mode&0o077)!==0)
  fail('OFFLINE_INDEX_NOT_OWNER_ONLY')
 const actual=fs.readFileSync(f,'utf8')
 if(actual!==expected||actual.includes('<script')||actual.includes('.reference.html')||
    actual.includes('.answer-review.json')||actual.includes('http://')||actual.includes('https://'))
  fail('OFFLINE_INDEX_SOURCE_LEAK_OR_CHANGED')
 return{verifiedHtmlSha256:sha(actual),privateGroups:56,sourceQuestions:2580,approved:0,published:0}
}
if(require.main===module){
 const a=process.argv.slice(2),get=k=>{const i=a.indexOf(k);return i<0?null:a[i+1]}
 const args={base:get('--base'),runId:get('--run-id')}
 console.log(JSON.stringify(a.includes('--write')?create(args):a.includes('--attest')?attest(args):verify(args)))
}
module.exports={render,create,verify,attest,ATTEST,NAME}
