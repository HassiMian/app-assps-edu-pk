#!/usr/bin/env node
'use strict'
/** Exact hash-matched PECTAA source-cache inventory. No academic approval. */
const fs=require('node:fs')
const path=require('node:path')
const {index,manifest}=require('./verify-source-evidence.cjs')
const {fileHash}=require('./verify-cached-catalog-pdf.cjs')
function walk(dir,root=dir,output=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name)
    if(entry.isSymbolicLink())continue
    if(entry.isDirectory())walk(full,root,output)
    else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.pdf')) output.push({file:full,relative:path.relative(root,full)})
  }
  return output
}
function summarizeHashes(files,entries){
  const byHash=new Map()
  for(const f of files){
    if(!byHash.has(f.sha256))byHash.set(f.sha256,[])
    byHash.get(f.sha256).push(f.relative)
  }
  const catalog=entries.map(e=>{
    const matches=e.pdfSha256?byHash.get(e.pdfSha256.toLowerCase())||[]:[]
    return {recordId:e.recordId,grade:e.grade,subject:e.subject,medium:e.medium,
      expectedHashPresent:!!e.pdfSha256,matchingCachedPdfs:matches,
      cachedHashVerified:matches.length>0,chapterStatus:e.chapterIndexStatus,
      exerciseStatus:e.exerciseIndexStatus,academicApproved:false}
  })
  const catalogHashMatches=catalog.filter(x=>x.cachedHashVerified).length
  const expectedHashCatalogRecords=catalog.filter(x=>x.expectedHashPresent).length
  const cacheMatched=new Set(catalog.flatMap(x=>x.matchingCachedPdfs))
  return {cachedPdfFiles:files.length,catalogRecords:catalog.length,
    expectedHashCatalogRecords,catalogHashMatches,
    missingCachedSourceRecords:catalog.filter(x=>x.expectedHashPresent&&!x.cachedHashVerified).map(x=>x.recordId),
    catalogWithoutExpectedHash:catalog.filter(x=>!x.expectedHashPresent).map(x=>x.recordId),
    cacheFilesNotMatchedToCatalog:files.filter(x=>!cacheMatched.has(x.relative)).map(x=>x.relative),
    academicallyApprovedQuestions:0,catalog}
}
async function scan(root,entries=[...index.values()]){
  const files=[]
  for(const row of walk(root)){
    const handle=fs.openSync(row.file,'r')
    let header=Buffer.alloc(5)
    try{fs.readSync(handle,header,0,5,0)}finally{fs.closeSync(handle)}
    if(header.toString()!=='%PDF-'){files.push({...row,sha256:'INVALID_PDF_SIGNATURE'});continue}
    files.push({...row,sha256:await fileHash(row.file)})
  }
  return {sourceCache:root,ledgerHash:manifest.sourceSha256,
    ...summarizeHashes(files,entries)}
}
async function main(){
  const argv=process.argv.slice(2),idx=argv.indexOf('--source-cache')
  if(idx<0||!argv[idx+1])throw Error('Requires --source-cache existing directory')
  const dir=path.resolve(argv[idx+1])
  if(!fs.statSync(dir).isDirectory())throw Error('SOURCE_CACHE_NOT_DIRECTORY')
  const result=await scan(dir)
  console.log(JSON.stringify(result,null,2))
  if(result.catalogHashMatches===0)process.exitCode=2
}
if(require.main===module)main().catch(e=>{console.error('SOURCE_CACHE_AUDIT_FAIL',e.message);process.exitCode=2})
module.exports={walk,summarizeHashes,scan}
