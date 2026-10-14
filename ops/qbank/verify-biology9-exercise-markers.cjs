#!/usr/bin/env node
'use strict'
/**
 * Guard source-image OCR exercise candidates against false publication.
 * Candidate locations are evidence only and need a human page-image check.
 */
const fs=require('node:fs')
const path=require('node:path')
const EXPECTED_SOURCE='pectaa-catalog-009'
const KEYS=['exerciseHeading','mcqInstruction','shortInstruction','longInstruction','keyPointsHeading']
function assessMarkers(map,markers,supplement){
 const issues=[]
 if(markers?.sourceRecordId!==map.sourceRecordId || map.sourceRecordId!==EXPECTED_SOURCE ||
    markers?.sourceSha256!==map.expectedSha256)
   issues.push('SOURCE_IDENTITY_MISMATCH')
 if(markers?.sourcePdfPages!==map.pdfiumObservedPageCount)
   issues.push('PDF_PAGE_COUNT_MISMATCH')
 if(markers?.automaticQuestionApproval!==false||markers?.questionsReproduced!==false||
    markers?.requiresManualImageVerification!==true)
   issues.push('UNAUTHORIZED_PUBLICATION_OR_TRANSCRIPTION')
 if(!Array.isArray(markers?.chapters)||markers.chapters.length!==map.chapters.length)
   issues.push('CHAPTER_COUNT_DRIFT')
 const extra=supplement?.supplementalExerciseHeadingCandidates||[]
 if(supplement){
   if(supplement.sourceRecordId!==map.sourceRecordId||
      supplement.sourceSha256!==map.expectedSha256||
      supplement.questionsReproduced!==false||
      supplement.academicApprovalGranted!==false||
      supplement.manualPageImageVerificationRequired!==true)
      issues.push('INVALID_SUPPLEMENT_SOURCE_OR_APPROVAL')
   if(!Array.isArray(extra))issues.push('INVALID_SUPPLEMENT_LIST')
 }
 const usedExtra=new Set()
 const chapters=[]
 for(const [i,c] of (markers?.chapters||[]).entries()){
   const expected=map.chapters[i]
   if(!expected||expected.chapter!==c.chapter){
     issues.push('CHAPTER_SEQUENCE_DRIFT:'+i);continue
   }
   const [first,last]=c.sampledPdfPhysicalPages||[]
   if(!Number.isInteger(first)||!Number.isInteger(last) ||
      first<expected.pdfPhysicalPageStart||last!==expected.pdfPhysicalPageEnd)
      issues.push('OUT_OF_CHAPTER_SAMPLED_RANGE:'+c.chapter)
   const pages=c.pages||[]
   if(!Array.isArray(pages)||pages.length!==last-first+1)issues.push('PAGE_SAMPLING_GAP:'+c.chapter)
   for(const [j,r] of pages.entries()){
     if(r.pdfPhysicalPage!==first+j ||
        r.printedPageCandidate!==r.pdfPhysicalPage-map.pageNumberOffsetPdfPhysicalMinusPrinted)
       issues.push('INCONSISTENT_PAGE_MAPPING:'+c.chapter+':'+j)
     for(const key of KEYS) if(typeof r.signals?.[key]!=='boolean')
       issues.push('INVALID_SIGNAL:'+c.chapter+':'+j+':'+key)
   }
   const candidates=pages.filter(x=>x.signals?.exerciseHeading).map(x=>x.pdfPhysicalPage)
   if(JSON.stringify(c.exerciseHeadingPdfPhysicalCandidates)!==JSON.stringify(candidates))
     issues.push('UNSUPPORTED_EXERCISE_ANCHOR:'+c.chapter)
   const start=candidates.length?candidates[0]:null
   if(c.firstExerciseCandidatePhysicalPage!==start ||
      c.firstExerciseCandidatePrintedPage!==(start===null?null:start-map.pageNumberOffsetPdfPhysicalMinusPrinted))
     issues.push('INVALID_EXERCISE_PAGE_CALCULATION:'+c.chapter)
   if(c.manualPageImageVerificationRequired!==true || c.academicApproval!==false)
     issues.push('ACADEMIC_REVIEW_POLICY_BYPASS:'+c.chapter)
   const supplemental=extra.filter(e=>e.chapter===c.chapter)
   if(supplemental.length>1)issues.push('MULTIPLE_SUPPLEMENTAL_EXERCISE_MARKERS:'+c.chapter)
   let candidate=start
   for(const e of supplemental){
     usedExtra.add(e)
     if(start!==null)issues.push('UNNECESSARY_SUPPLEMENTAL_MARKER:'+c.chapter)
     if(e.pdfPhysicalPage<expected.pdfPhysicalPageStart||
        e.pdfPhysicalPage>expected.pdfPhysicalPageEnd||
        e.printedPageCandidate!==e.pdfPhysicalPage-map.pageNumberOffsetPdfPhysicalMinusPrinted||
        e.recognizedExerciseMarker!=='EXERCISE'||
        e.ocrEvidenceOnly!==true||e.manualPageImageVerificationRequired!==true){
       issues.push('INVALID_SUPPLEMENTAL_EXERCISE_PAGE:'+c.chapter)
     } else candidate=e.pdfPhysicalPage
   }
   chapters.push({chapter:c.chapter,firstReviewCandidate:candidate,
     imageVerified:false,academicApproved:false})
 }
 if(extra.some(e=>!usedExtra.has(e)))issues.push('UNMATCHED_SUPPLEMENTAL_EXERCISE_RECORD')
 return {safe:issues.length===0,issues,candidateChapters:chapters.length,
   chaptersWithExerciseCandidate:chapters.filter(x=>x.firstReviewCandidate!==null).length,
   academicApprovalGranted:false}
}
function main(){
 const argv=process.argv.slice(2),at=x=>argv[argv.indexOf(x)+1]
 if(!argv.includes('--map')||!argv.includes('--markers'))throw Error('REQUIRES_MAP_AND_MARKER_JSON')
 const map=JSON.parse(fs.readFileSync(path.resolve(at('--map')),'utf8'))
 const markers=JSON.parse(fs.readFileSync(path.resolve(at('--markers')),'utf8'))
 const supplement=argv.includes('--supplement')?JSON.parse(fs.readFileSync(path.resolve(at('--supplement')),'utf8')):undefined
 const x=assessMarkers(map,markers,supplement)
 console.log(JSON.stringify(x,null,2))
 if(!x.safe)process.exitCode=2
}
if(require.main===module)try{main()}catch(e){console.error('EXERCISE_SOURCE_GATE_FAIL',e.message);process.exitCode=2}
module.exports={assessMarkers}
