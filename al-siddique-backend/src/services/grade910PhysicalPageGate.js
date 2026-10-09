'use strict'
const PAGE_REGISTRY=require('../data/asspsGrade910PhysicalPageEvidence.json')
const SHA=/^[a-f0-9]{64}$/
const equal=(a,b)=>String(a??'').trim()===String(b??'').trim()
function error(code,message){
 const x=new Error(message);x.status=422;x.code=code;return x
}
function requirePhysicalPageProof({source,evidence,question,mode},registry=PAGE_REGISTRY){
 if(registry?.schemaVersion!=='assps-grade910-physical-page-evidence-v1'||
    registry.academicPageEvidenceCertified!==true)
  throw error('PHYSICAL_SOURCE_PAGE_NOT_CERTIFIED','Source pages have not been independently verified from actual book page images.')
 const wanted=String(evidence.chapterPageEvidenceId||'')
 if(!wanted)throw error('CHAPTER_PAGE_ATTESTATION_REQUIRED','A server-registered physical chapter page is required.')
 const chapter=(registry.verifiedChapterAnchors||[]).find(row=>
   row.id===wanted&&row.reviewState==='human_page_verified'&&
   row.sourceRecordId===source.recordId&&row.sourcePdfSha256===source.pdfSha256&&
   equal(row.edition,source.edition)&&equal(row.chapterNo,question.chapterNo)&&
   Number.isInteger(row.pdfPhysicalPage)&&row.pdfPhysicalPage>0&&
   Number.isInteger(row.bookPrintedPage)&&row.bookPrintedPage>0&&
   SHA.test(String(row.pageImageSha256||''))&&
   Number.isSafeInteger(Number(row.independentReviewerId))&&Number(row.independentReviewerId)>0)
 if(!chapter)throw error('CHAPTER_PAGE_IDENTITY_UNVERIFIED','Trusted book image, chapter and page evidence must match.')
 let exerciseId=null
 if(mode==='TEXTBOOK_EXERCISE'){
   exerciseId=String(evidence.exercisePageEvidenceId||'')
   const exercise=(registry.verifiedExerciseAnchors||[]).find(row=>
     row.id===exerciseId&&row.reviewState==='human_exercise_verified'&&
     row.sourceRecordId===source.recordId&&row.sourcePdfSha256===source.pdfSha256&&
     row.chapterPageEvidenceId===chapter.id&&
     Number.isInteger(row.bookPrintedPage)&&row.bookPrintedPage>0&&
     Number.isInteger(evidence.sourcePrintedPage)&&
     row.bookPrintedPage===evidence.sourcePrintedPage&&
     row.sourcePrintedPage===row.bookPrintedPage&&
     equal(row.exerciseReference,evidence.exerciseReference)&&
     Number.isInteger(row.pdfPhysicalPage)&&row.pdfPhysicalPage>0&&
     SHA.test(String(row.pageImageSha256||''))&&
     Number.isSafeInteger(Number(row.independentReviewerId))&&Number(row.independentReviewerId)>0)
   if(!exercise)throw error('EXERCISE_PAGE_IDENTITY_UNVERIFIED','Textbook exercise page and exercise number lack independent physical proof.')
 }
 return Object.freeze({chapterPageEvidenceId:chapter.id,exercisePageEvidenceId:exerciseId})
}
module.exports={requirePhysicalPageProof,PAGE_REGISTRY}
