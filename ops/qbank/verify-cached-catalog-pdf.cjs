#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const crypto=require('node:crypto')
const { index, manifest } = require('./verify-source-evidence.cjs')

async function fileHash(file) {
  const hash=crypto.createHash('sha256')
  for await (const chunk of fs.createReadStream(file))hash.update(chunk)
  return hash.digest('hex')
}
async function verifyCachedPdf(recordId,file,reference=index){
  const entry=reference.get(recordId)
  if(!entry||!entry.pdfSha256) throw Error('CATALOG_ENTRY_OR_EXPECTED_PDF_SHA_MISSING')
  const stat=fs.statSync(file)
  if(!stat.isFile()||stat.size<1024)throw Error('SOURCE_PDF_EMPTY')
  const descriptor=fs.openSync(file,'r')
  const header=Buffer.alloc(5)
  try{fs.readSync(descriptor,header,0,5,0)}finally{fs.closeSync(descriptor)}
  if(header.toString()!=='%PDF-')throw Error('INVALID_SOURCE_PDF_SIGNATURE')
  const actualSha256=await fileHash(file)
  if(actualSha256!==entry.pdfSha256.toLowerCase())
    throw Error('OFFICIAL_CATALOG_PDF_HASH_MISMATCH')
  return {
    recordId,grade:entry.grade,subject:entry.subject,medium:entry.medium,
    edition:entry.edition || null,pdfSha256:actualSha256,bytes:stat.size,
    matchingCatalogHash:true,localFileVerified:true,
    chapterIndexStatus:entry.chapterIndexStatus||null,
    exerciseIndexStatus:entry.exerciseIndexStatus||null,
    academicQuestionsReviewed:false,
    academicApprovalGranted:false,
    ledgerSha256:manifest.sourceSha256,
  }
}
async function main(){
  const argv=process.argv.slice(2)
  const val=k=>argv[argv.indexOf(k)+1]
  if(!argv.includes('--catalog-id')||!argv.includes('--file'))throw Error('REQUIRES_EXPLICIT_CATALOG_ID_AND_PDF')
  console.log(JSON.stringify(await verifyCachedPdf(val('--catalog-id'),val('--file')),null,2))
}
if(require.main===module)main().catch(e=>{console.error('SOURCE_PDF_VERIFICATION_FAIL',e.message);process.exitCode=2})
module.exports={verifyCachedPdf,fileHash}
