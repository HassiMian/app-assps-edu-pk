#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const LEDGER=path.join(ROOT,'ops/qbank/catalog-hash-ledger-20261008.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CACHED_PDF_BYTE_REATTESTATION_20261008.json')
const DEFAULT_CACHE_ROOT='/root/workspace/qbank-source-cache'
const HASH=/^[0-9a-f]{64}$/
async function hashStream(file){
 const sha=crypto.createHash('sha256')
 let count=0,first=Buffer.alloc(0)
 const stream=fs.createReadStream(file,{highWaterMark:1024*1024})
 for await(const block of stream){
  if(first.length<8)first=Buffer.concat([first,block.subarray(0,8-first.length)])
  sha.update(block);count+=block.length
 }
 return{sha256:sha.digest('hex'),bytes:count,pdfMagic:first.subarray(0,5).toString('latin1')==='%PDF-'}
}
function pathWithin(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative))throw Error('SOURCE_RELATIVE_PATH_REQUIRED')
 const base=path.resolve(root),candidate=path.resolve(base,relative)
 if(candidate===base||!candidate.startsWith(base+path.sep))throw Error('SOURCE_PATH_OUTSIDE_CACHE')
 return candidate
}
async function attest({manifest,ledger,cacheRoot,streamHash=hashStream}){
 const rows=Array.isArray(manifest?.entries)?manifest.entries:null
 const known=Array.isArray(ledger?.entries)?ledger.entries:null
 if(!rows||!known||rows.length!==111||known.length!==111)throw Error('SOURCE_LEDGER_COUNT_UNEXPECTED')
 const map=new Map(known.map(x=>[x.recordId,x]))
 if(map.size!==111||new Set(rows.map(x=>x.recordId)).size!==111)throw Error('DUPLICATE_SOURCE_ID')
 const results=[]
 const root=await fs.promises.realpath(cacheRoot)
 for(const entry of rows){
  const l=map.get(entry.recordId)
  if(!l||['grade','subject','medium','edition','pdfSha256'].some(k=>String(entry[k]??'')!==String(l[k]??'')))
   throw Error('SOURCE_METADATA_LEDGER_DRIFT:'+entry.recordId)
  if(!HASH.test(String(entry.pdfSha256||''))){
   results.push({recordId:entry.recordId,status:'NO_OFFICIAL_SHA_QUARANTINED'});continue
  }
  if(!entry.sourceCacheRef){
   results.push({recordId:entry.recordId,status:'SOURCE_FILE_REFERENCE_MISSING'});continue
  }
  const resolved=pathWithin(root,entry.sourceCacheRef)
  let canonical
  try{canonical=await fs.promises.realpath(resolved)}
  catch(e){if(e.code==='ENOENT'){results.push({recordId:entry.recordId,status:'CACHED_SOURCE_NOT_FOUND'});continue}throw e}
  if(!canonical.startsWith(root+path.sep))throw Error('SOURCE_SYMLINK_ESCAPE:'+entry.recordId)
  const stat=await fs.promises.stat(canonical)
  if(!stat.isFile())throw Error('SOURCE_CACHE_NOT_FILE:'+entry.recordId)
  const digest=await streamHash(canonical)
  const same=digest.sha256===entry.pdfSha256
  const valid=Boolean(digest.pdfMagic&&digest.bytes>100)
  results.push({
   recordId:entry.recordId,status:!same?'SHA256_MISMATCH':!valid?'PDF_HEADER_INVALID':'BYTE_SHA256_MATCH',
   actualSha256:digest.sha256,expectedSha256:entry.pdfSha256,
   bytes:digest.bytes,pdfMagic:!!digest.pdfMagic
  })
 }
 const summary=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})
 const mismatches=results.filter(x=>x.status!=='BYTE_SHA256_MATCH'&&x.status!=='NO_OFFICIAL_SHA_QUARANTINED')
 return{
  schemaVersion:'assps-grade910-cached-pdf-byte-reattest-v1',
  scope:'ACTUAL_READ_ONLY_CACHE_FILE_BYTE_SHA_NO_OFFICIAL_SESSION_PAGE_OR_ACADEMIC_CERTIFICATION',
  cacheRootAlias:'ASSPS_PRIVATE_SOURCE_CACHE',
  manifestCount:rows.length,verifiedSourceCount:results.filter(x=>x.status==='BYTE_SHA256_MATCH').length,
  uncheckedSourceCount:results.filter(x=>x.status==='NO_OFFICIAL_SHA_QUARANTINED').length,
  mismatches:mismatches.length,summary,bytesRead:results.reduce((a,r)=>a+(r.bytes||0),0),
  sourceApproved:0,questionSourceVerified:0,humanReviewApproved:0,published:0,results
 }
}
if(require.main===module){
 (async()=>{
  const a=process.argv.slice(2)
  const i=a.indexOf('--source-cache')
  const cacheRoot=i>=0?path.resolve(a[i+1]||''):DEFAULT_CACHE_ROOT
  const result=await attest({
   manifest:JSON.parse(fs.readFileSync(MANIFEST,'utf8')),
   ledger:JSON.parse(fs.readFileSync(LEDGER,'utf8')),cacheRoot
  })
  if(a.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify({verifiedSourceCount:result.verifiedSourceCount,uncheckedSourceCount:result.uncheckedSourceCount,mismatches:result.mismatches,summary:result.summary,bytesRead:result.bytesRead},null,2))
  if(result.mismatches||result.verifiedSourceCount!==110||result.uncheckedSourceCount!==1)process.exitCode=2
 })().catch(e=>{console.error('SOURCE_BYTE_REATTESTATION_BLOCKED',e.code||e.message);process.exitCode=2})
}
module.exports={attest,hashStream,pathWithin}
