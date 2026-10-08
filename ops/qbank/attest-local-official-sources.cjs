#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {spawnSync}=require('node:child_process')

const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const DEFAULT_CACHE='/root/workspace/qbank-source-cache'
const MAP={
  'pectaa-catalog-047':'20261008/tech10-science/chem10em.pdf',
  'pectaa-catalog-048':'20261008/tech10-science/chem10ur.pdf',
  'pectaa-catalog-056':'20261008/tech10-science/phys10ur.pdf',
  'pectaa-catalog-057':'20261008/tech10-science/phys10em.pdf',
  'pectaa-catalog-074':'20261008/farsi910.pdf',
  'pectaa-catalog-075':'20261008/econum910.pdf',
  'pectaa-catalog-076':'20261008/econem910.pdf',
  'pectaa-catalog-077':'20261008/punjabi910.pdf',
  'pectaa-catalog-078':'20261008/zari910.pdf',
  'pectaa-catalog-079':'20261008/hpe910.pdf',
  'pectaa-catalog-080':'20261008/education910.pdf',
  'pectaa-catalog-081':'20261008/civicsum910.pdf',
}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
function directUrl(url=''){
 const m=String(url).match(/drive\.google\.com\/file\/d\/([^/]+)/)
 return m?`https://drive.usercontent.google.com/download?id=${m[1]}&export=download&confirm=t`:url
}
function attest({cacheRoot=DEFAULT_CACHE,apply=false,timeout=180}={}){
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'))
 const byId=new Map(manifest.entries.map(e=>[e.recordId,e]))
 const results=[]
 for(const [recordId,relative] of Object.entries(MAP)){
   const entry=byId.get(recordId)
   const local=path.join(cacheRoot,relative)
   if(!entry){results.push({recordId,status:'MANIFEST_RECORD_MISSING'});continue}
   if(!fs.existsSync(local)){results.push({recordId,status:'LOCAL_FILE_MISSING',relative});continue}
   const localHeader=fs.readFileSync(local).subarray(0,5).toString()
   if(localHeader!=='%PDF-'){results.push({recordId,status:'LOCAL_NOT_PDF',relative});continue}
   const official=directUrl(entry.catalogAssetUrl||entry.pdfUrl||'')
   if(!official){results.push({recordId,status:'OFFICIAL_URL_MISSING',relative});continue}
   const tmp=`/tmp/assps-attest-${recordId}-${process.pid}.download`
   try{
     const c=spawnSync('curl',['-L','--fail','--silent','--show-error','--connect-timeout','20','--max-time',String(timeout),'-o',tmp,official],{encoding:'utf8',maxBuffer:1024*1024})
     if(c.status!==0||!fs.existsSync(tmp)){results.push({recordId,status:'DOWNLOAD_FAILED',relative,detail:String(c.stderr||c.error||'').trim().slice(0,300)});continue}
     const officialHeader=fs.readFileSync(tmp).subarray(0,5).toString()
     const localSha=sha(local), officialSha=sha(tmp), localBytes=fs.statSync(local).size, officialBytes=fs.statSync(tmp).size
     if(officialHeader!=='%PDF-'){results.push({recordId,status:'OFFICIAL_NON_PDF',relative,officialSha,officialBytes,header:officialHeader});continue}
     if(localSha!==officialSha){results.push({recordId,status:'BYTE_MISMATCH',relative,localSha,officialSha,localBytes,officialBytes});continue}
     if(entry.pdfSha256 && String(entry.pdfSha256).toLowerCase()!==officialSha){results.push({recordId,status:'EXISTING_HASH_CONFLICT',relative,existing:entry.pdfSha256,officialSha});continue}
     if(apply){
       entry.pdfSha256=officialSha
       entry.downloadContentMagic='%PDF-'
       entry.downloadByteLength=officialBytes
       entry.downloadVerifiedOn='2026-10-08'
       entry.downloadStatus='PDF_BYTES_VERIFIED_OFFICIAL_ASSET_MATCH'
       entry.sourceCacheRef=relative
     }
     results.push({recordId,status:apply?'ATTESTED_AND_APPLIED':'ATTESTED_DRY_RUN',relative,sha256:officialSha,bytes:officialBytes})
   } finally { try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{} }
 }
 if(apply) fs.writeFileSync(MANIFEST,JSON.stringify(manifest,null,2)+'\n')
 const counts=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})
 return {scope:'OFFICIAL_ASSET_BYTE_ATTESTATION_NO_ACADEMIC_APPROVAL',apply,cacheRoot,counts,results,academicApprovalGranted:false}
}
if(require.main===module){const a=process.argv.slice(2),i=a.indexOf('--source-cache');const cacheRoot=i>=0&&a[i+1]?path.resolve(a[i+1]):DEFAULT_CACHE;const report=attest({cacheRoot,apply:a.includes('--apply')});console.log(JSON.stringify(report,null,2));if(Object.keys(report.counts).some(k=>!['ATTESTED_DRY_RUN','ATTESTED_AND_APPLIED'].includes(k)))process.exitCode=2}
module.exports={MAP,directUrl,attest}
