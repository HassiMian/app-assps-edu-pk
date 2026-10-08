const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {assessMarkers}=require('../qbank/verify-biology9-exercise-markers.cjs')
const root=path.resolve(__dirname,'../..')
const map=JSON.parse(fs.readFileSync(path.join(root,'docs/question-bank/ASSPS_BIO9_TOC_PAGE_ANCHORS_20261008.json'),'utf8'))
const sig=(exercise=false)=>({exerciseHeading:exercise,mcqInstruction:false,
  shortInstruction:false,longInstruction:false,keyPointsHeading:false})
const fake={
 sourceRecordId:map.sourceRecordId,sourceSha256:map.expectedSha256,
 sourcePdfPages:180,automaticQuestionApproval:false,
 questionsReproduced:false,requiresManualImageVerification:true,
 chapters:map.chapters.map(ch=>{
  const p=ch.pdfPhysicalPageEnd
  return {chapter:ch.chapter,sampledPdfPhysicalPages:[p-1,p],
    exerciseHeadingPdfPhysicalCandidates:[p],
    firstExerciseCandidatePhysicalPage:p,
    firstExerciseCandidatePrintedPage:p-4,
    manualPageImageVerificationRequired:true,academicApproval:false,
    pages:[
      {pdfPhysicalPage:p-1,printedPageCandidate:p-5,signals:sig(),ocrStatus:'OK'},
      {pdfPhysicalPage:p,printedPageCandidate:p-4,signals:sig(true),ocrStatus:'OK'},
    ],
  }
 })
}
const copy=x=>JSON.parse(JSON.stringify(x))
test('valid bounded exercise candidate index never grants academic approval',()=>{
 const r=assessMarkers(map,fake)
 assert.equal(r.safe,true)
 assert.equal(r.candidateChapters,11)
 assert.equal(r.academicApprovalGranted,false)
})
test('publishing or copying question content is fail closed',()=>{
 const d=copy(fake);d.automaticQuestionApproval=true
 assert.ok(assessMarkers(map,d).issues.includes('UNAUTHORIZED_PUBLICATION_OR_TRANSCRIPTION'))
})
test('a claimed exercise page with no OCR marker fails',()=>{
 const d=copy(fake);d.chapters[0].pages[1].signals.exerciseHeading=false
 assert.ok(assessMarkers(map,d).issues.includes('UNSUPPORTED_EXERCISE_ANCHOR:1'))
})
test('missing samples or pages outside chapter fail',()=>{
 const d=copy(fake);d.chapters[2].pages.pop()
 assert.ok(assessMarkers(map,d).issues.includes('PAGE_SAMPLING_GAP:3'))
 const e=copy(fake);e.chapters[3].sampledPdfPhysicalPages[0]=1
 assert.ok(assessMarkers(map,e).issues.includes('OUT_OF_CHAPTER_SAMPLED_RANGE:4'))
})
test('human image review requirement cannot be bypassed',()=>{
 const d=copy(fake);d.chapters[0].manualPageImageVerificationRequired=false
 assert.ok(assessMarkers(map,d).issues.includes('ACADEMIC_REVIEW_POLICY_BYPASS:1'))
})

test('two controlled supplemental OCR matches cover missing exercise headings but do not approve them',()=>{
 const d=copy(fake)
 d.chapters[5].pages[1].signals.exerciseHeading=false
 d.chapters[5].exerciseHeadingPdfPhysicalCandidates=[]
 d.chapters[5].firstExerciseCandidatePhysicalPage=null
 d.chapters[5].firstExerciseCandidatePrintedPage=null
 d.chapters[10].pages[1].signals.exerciseHeading=false
 d.chapters[10].exerciseHeadingPdfPhysicalCandidates=[]
 d.chapters[10].firstExerciseCandidatePhysicalPage=null
 d.chapters[10].firstExerciseCandidatePrintedPage=null
 const extra={
  sourceRecordId:map.sourceRecordId,sourceSha256:map.expectedSha256,
  questionsReproduced:false,academicApprovalGranted:false,
  manualPageImageVerificationRequired:true,
  supplementalExerciseHeadingCandidates:[
   {chapter:6,pdfPhysicalPage:map.chapters[5].pdfPhysicalPageEnd,
    printedPageCandidate:map.chapters[5].pdfPhysicalPageEnd-4,
    recognizedExerciseMarker:'EXERCISE',ocrEvidenceOnly:true,manualPageImageVerificationRequired:true},
   {chapter:11,pdfPhysicalPage:map.chapters[10].pdfPhysicalPageEnd,
    printedPageCandidate:map.chapters[10].pdfPhysicalPageEnd-4,
    recognizedExerciseMarker:'EXERCISE',ocrEvidenceOnly:true,manualPageImageVerificationRequired:true},
  ]
 }
 const x=assessMarkers(map,d,extra)
 assert.equal(x.safe,true)
 assert.equal(x.chaptersWithExerciseCandidate,11)
 assert.equal(x.academicApprovalGranted,false)
 extra.supplementalExerciseHeadingCandidates[0].recognizedExerciseMarker='GUESS'
 assert.ok(assessMarkers(map,d,extra).issues.includes('INVALID_SUPPLEMENTAL_EXERCISE_PAGE:6'))
})
