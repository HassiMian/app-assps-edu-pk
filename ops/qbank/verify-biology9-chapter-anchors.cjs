#!/usr/bin/env node
'use strict'
/**
 * Offline-only, fail-closed map validator. Source identity via full binary SHA.
 * TOC/image OCR page starts are review candidates, NEVER editorial approval.
 */
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const CHAPTERS=11
const PINNED_HASH='f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5'
function formatPage(value){return Number.isInteger(value)&&value>0}
function inspectMap(map,samples,supplement){
 const issues=[]
 const ch=map?.chapters||[]
 if(map?.sourceRecordId!=='pectaa-catalog-009'||map?.expectedSha256!==PINNED_HASH)
   issues.push('SOURCE_IDENTITY_OR_HASH_DRIFT')
 if(map?.pdfiumObservedPageCount!==180)issues.push('UNEXPECTED_PDF_PAGE_COUNT')
 if(map?.pageNumberOffsetPdfPhysicalMinusPrinted!==4)issues.push('PAGINATION_OFFSET_DRIFT')
 if(map?.questionGenerationApproved!==false||
    map?.allChaptersAcademicApproval!==false||map?.requiresHumanImageReview!==true)
   issues.push('UNAUTHORIZED_SOURCE_APPROVAL_FLAG')
 if(!Array.isArray(ch)||ch.length!==CHAPTERS)issues.push('UNEXPECTED_CHAPTER_COUNT')
 for(const [i,c] of ch.entries()){
   if(c.chapter!==i+1)issues.push('CHAPTER_SEQUENCE_DRIFT:'+i)
   if(!c.title||typeof c.title!=='string')issues.push('MISSING_CHAPTER_TITLE:'+i)
   for(const key of ['printedPageStart','printedPageEnd','pdfPhysicalPageStart','pdfPhysicalPageEnd']){
     if(!formatPage(c[key]))issues.push('INVALID_PAGE_NUMBER:'+i+':'+key)
   }
   if(c.printedPageStart+4!==c.pdfPhysicalPageStart||
      c.printedPageEnd+4!==c.pdfPhysicalPageEnd)
      issues.push('UNVERIFIED_PRINT_PHYSICAL_OFFSET:'+c.chapter)
   if(c.pdfPhysicalPageStart>c.pdfPhysicalPageEnd||c.pdfPhysicalPageEnd>180)
      issues.push('CHAPTER_OUT_OF_BOUNDS:'+c.chapter)
   if(i===0 && c.pdfPhysicalPageStart!==5)issues.push('FIRST_CHAPTER_NOT_PHYSICAL_5')
   if(i>0 && c.pdfPhysicalPageStart!==ch[i-1].pdfPhysicalPageEnd+1)
      issues.push('NONCONTIGUOUS_CHAPTER_PAGES:'+c.chapter)
   if(c.academicApproval!==false||c.manualPageImageVerificationRequired!==true||
      c.exerciseIndexStatus!=='PENDING'||c.chapterTextReproduced!==false)
      issues.push('REVIEW_POLICY_VIOLATION:'+c.chapter)
   const detected=(samples?.samples||[]).some(s=>
     s.chapter===c.chapter && s.pdfPhysicalPage===c.pdfPhysicalPageStart &&
     s.headerChapterNumberDetected===true)
   const exception=(c.chapter===6 && supplement?.chapter===6 &&
     supplement?.sourceSha256===PINNED_HASH &&
     supplement?.pdfPhysicalPage===c.pdfPhysicalPageStart &&
     supplement?.recognizedChapterMarker==='Chapter 6' &&
     supplement?.academicApprovalGranted===false)
   if(!detected&&!exception)issues.push('NO_CHAPTER_HEADING_EVIDENCE:'+c.chapter)
 }
 return {safe:issues.length===0,issues,
   candidateChapterCount:ch.length,ocrValidatedHeadings:ch.length-issues.filter(x=>x.startsWith('NO_CHAPTER_HEADING_EVIDENCE')).length,
   academicApprovals:0}
}
function sha256File(filename){
 const hash=crypto.createHash('sha256')
 return new Promise((resolve,reject)=>{
  fs.createReadStream(filename).on('error',reject).on('data',data=>hash.update(data))
   .on('end',()=>resolve(hash.digest('hex')))
 })
}
async function verifyFile(map,filename){
 const actual=await sha256File(filename)
 if(actual!==PINNED_HASH || map.expectedSha256!==PINNED_HASH)
   throw Error('SOURCE_PDF_HASH_MISMATCH')
 const handle=fs.openSync(filename,'r'),head=Buffer.alloc(5)
 try{fs.readSync(handle,head,0,5,0)}finally{fs.closeSync(handle)}
 if(head.toString()!=='%PDF-')throw Error('INVALID_SOURCE_PDF_SIGNATURE')
 return {sha256:actual,verifiedPdfSignature:true}
}
async function main(){
 const argv=process.argv.slice(2),get=x=>argv[argv.indexOf(x)+1]
 for(const a of ['--map','--samples','--supplement','--pdf'])
   if(!argv.includes(a)||!get(a))throw Error('MISSING_REQUIRED_PARAMETER:'+a)
 const map=JSON.parse(fs.readFileSync(path.resolve(get('--map'))))
 const samples=JSON.parse(fs.readFileSync(path.resolve(get('--samples'))))
 const supplement=JSON.parse(fs.readFileSync(path.resolve(get('--supplement'))))
 const report=inspectMap(map,samples,supplement)
 if(!report.safe)throw Error('INVALID_BIO9_CHAPTER_MAP:'+report.issues.join(','))
 const file=await verifyFile(map,path.resolve(get('--pdf')))
 console.log(JSON.stringify({...report,...file,sourceRecordId:map.sourceRecordId,
   academicApprovalGranted:false},null,2))
}
if(require.main===module)main().catch(e=>{console.error('BIO9_CHAPTER_ANCHOR_FAIL',e.message);process.exitCode=2})
module.exports={inspectMap,verifyFile}
