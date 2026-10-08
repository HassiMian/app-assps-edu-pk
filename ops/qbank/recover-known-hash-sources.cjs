#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {spawnSync}=require('node:child_process')

const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const QUEUE=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE_20261008.json')
function sha256(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
function safeName(s){return String(s).replace(/[^a-zA-Z0-9._-]+/g,'_')}
function directUrl(url=''){
 const m=String(url).match(/drive\.google\.com\/file\/d\/([^/]+)/)
 if(m)return `https://drive.usercontent.google.com/download?id=${m[1]}&export=download&confirm=t`
 return url
}
function recover({cacheRoot,timeout=150}={}){
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'))
 const queue=JSON.parse(fs.readFileSync(QUEUE,'utf8'))
 const byId=new Map(manifest.entries.map(e=>[e.recordId,e]))
 const verified=path.join(cacheRoot,'20261008','official-verified')
 const quarantine=path.join(cacheRoot,'20261008','quarantine-known-hash')
 fs.mkdirSync(verified,{recursive:true});fs.mkdirSync(quarantine,{recursive:true})
 const results=[]
 for(const rid of queue.missingSourceCatalogIds||[]){
  const e=byId.get(rid); if(!e){results.push({recordId:rid,status:'MANIFEST_RECORD_MISSING'});continue}
  const expected=String(e.pdfSha256||'').toLowerCase(); const url=directUrl(e.pdfUrl||e.catalogAssetUrl||'')
  if(!/^[0-9a-f]{64}$/.test(expected)||!url){results.push({recordId:rid,status:'EXPECTED_HASH_OR_URL_MISSING'});continue}
  const dest=path.join(verified,`${safeName(rid)}.pdf`)
  if(fs.existsSync(dest)&&sha256(dest)===expected){results.push({recordId:rid,status:'ALREADY_VERIFIED',dest:path.relative(cacheRoot,dest),sha256:expected});continue}
  const tmp=path.join('/tmp',`assps-${safeName(rid)}-${process.pid}.download`)
  try{
   const c=spawnSync('curl',['-L','--fail','--silent','--show-error','--connect-timeout','20','--max-time',String(timeout),'-o',tmp,url],{encoding:'utf8',maxBuffer:1024*1024})
   if(c.status!==0||!fs.existsSync(tmp)){results.push({recordId:rid,status:'DOWNLOAD_FAILED',detail:String(c.stderr||c.error||'').trim().slice(0,300)});continue}
   const size=fs.statSync(tmp).size; const head=fs.readFileSync(tmp,{encoding:null}).subarray(0,5).toString(); const actual=sha256(tmp)
   if(head==='%PDF-'&&actual===expected){fs.renameSync(tmp,dest);results.push({recordId:rid,status:'RECOVERED_VERIFIED',dest:path.relative(cacheRoot,dest),bytes:size,sha256:actual});continue}
   const qext=head==='%PDF-'?'.pdf':'.bin'; const qdest=path.join(quarantine,`${safeName(rid)}-${actual.slice(0,12)}${qext}`);fs.renameSync(tmp,qdest)
   results.push({recordId:rid,status:head==='%PDF-'?'HASH_MISMATCH_QUARANTINED':'NON_PDF_QUARANTINED',dest:path.relative(cacheRoot,qdest),bytes:size,expectedSha256:expected,actualSha256:actual,header:head})
  }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
 }
 const counts=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})
 return {scope:'KNOWN_HASH_SOURCE_RECOVERY_NO_ACADEMIC_APPROVAL',cacheRoot,counts,results,academicApprovalGranted:false}
}
if(require.main===module){const a=process.argv.slice(2),i=a.indexOf('--source-cache');if(i<0||!a[i+1]){console.error('Requires --source-cache DIRECTORY');process.exit(2)}const report=recover({cacheRoot:path.resolve(a[i+1])});console.log(JSON.stringify(report,null,2));if((report.counts.DOWNLOAD_FAILED||0)>0)process.exitCode=3}
module.exports={directUrl,recover}
