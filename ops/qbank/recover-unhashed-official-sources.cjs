#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {spawnSync}=require('node:child_process')
const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const DEFAULT_CACHE='/root/workspace/qbank-source-cache'
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
function directUrl(url=''){const m=String(url).match(/drive\.google\.com\/file\/d\/([^/]+)/);return m?`https://drive.usercontent.google.com/download?id=${m[1]}&export=download&confirm=t`:url}
function eligible(e){return !e.pdfSha256 && e.catalogLinkStatus==='OFFICIAL_PAGE_ANCHOR_FOUND' && Number(e.catalogLinkMatchCount||0)===1 && Boolean(e.catalogAssetUrl||e.pdfUrl)}
function recover({cacheRoot=DEFAULT_CACHE,apply=false,timeout=180}={}){
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8')); const outdir=path.join(cacheRoot,'20261008','official-verified-unhashed');fs.mkdirSync(outdir,{recursive:true});const results=[]
 for(const e of manifest.entries.filter(eligible)){
   const dest=path.join(outdir,`${e.recordId}.pdf`); const url=directUrl(e.catalogAssetUrl||e.pdfUrl)
   if(fs.existsSync(dest)&&fs.readFileSync(dest).subarray(0,5).toString()==='%PDF-'){
     const digest=sha(dest); if(apply){e.pdfSha256=digest;e.downloadContentMagic='%PDF-';e.downloadByteLength=fs.statSync(dest).size;e.downloadVerifiedOn='2026-10-08';e.downloadStatus='PDF_BYTES_VERIFIED_OFFICIAL_ANCHOR';e.sourceCacheRef=path.relative(cacheRoot,dest)}
     results.push({recordId:e.recordId,status:apply?'ALREADY_CACHED_APPLIED':'ALREADY_CACHED',sha256:digest,bytes:fs.statSync(dest).size});continue
   }
   const tmp=`/tmp/assps-unhashed-${e.recordId}-${process.pid}.download`
   try{
     const c=spawnSync('curl',['-L','--fail','--silent','--show-error','--connect-timeout','20','--max-time',String(timeout),'-o',tmp,url],{encoding:'utf8',maxBuffer:1024*1024})
     if(c.status!==0||!fs.existsSync(tmp)){results.push({recordId:e.recordId,status:'DOWNLOAD_FAILED',detail:String(c.stderr||c.error||'').trim().slice(0,300)});continue}
     const header=fs.readFileSync(tmp).subarray(0,5).toString(); const digest=sha(tmp); const bytes=fs.statSync(tmp).size
     if(header!=='%PDF-'){results.push({recordId:e.recordId,status:'NON_PDF',header,bytes,sha256:digest});continue}
     fs.renameSync(tmp,dest)
     if(apply){e.pdfSha256=digest;e.downloadContentMagic='%PDF-';e.downloadByteLength=bytes;e.downloadVerifiedOn='2026-10-08';e.downloadStatus='PDF_BYTES_VERIFIED_OFFICIAL_ANCHOR';e.sourceCacheRef=path.relative(cacheRoot,dest)}
     results.push({recordId:e.recordId,status:apply?'RECOVERED_AND_APPLIED':'RECOVERED_CACHE_ONLY',sha256:digest,bytes})
   } finally {try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{}}
 }
 if(apply)fs.writeFileSync(MANIFEST,JSON.stringify(manifest,null,2)+'\n')
 const counts=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})
 return{scope:'UNHASHED_OFFICIAL_ANCHOR_RECOVERY_NO_ACADEMIC_APPROVAL',apply,eligibleRecords:results.length,counts,results,academicApprovalGranted:false}
}
if(require.main===module){const a=process.argv.slice(2),i=a.indexOf('--source-cache');const cacheRoot=i>=0&&a[i+1]?path.resolve(a[i+1]):DEFAULT_CACHE;const report=recover({cacheRoot,apply:a.includes('--apply')});console.log(JSON.stringify(report,null,2));if((report.counts.DOWNLOAD_FAILED||0)+(report.counts.NON_PDF||0)>0)process.exitCode=2}
module.exports={eligible,directUrl,recover}
