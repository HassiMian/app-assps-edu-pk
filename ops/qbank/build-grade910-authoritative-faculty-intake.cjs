#!/usr/bin/env node
'use strict'
// One original-ID keyed faculty intake ledger. It neither assigns teachers nor approves content.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const DOC=path.join(ROOT,'docs/question-bank')
const OUT=path.join(DOC,'ASSPS_GRADE910_2581_UNIFIED_FACULTY_REVIEW_QUEUE_20261011.json')
const hash=b=>crypto.createHash('sha256').update(b).digest('hex')
const fail=x=>{throw Error('GRADE910_UNIFIED_FACULTY_'+x)}
function read(f){return JSON.parse(fs.readFileSync(path.join(DOC,f),'utf8'))}
function build(){
 const originals=require('./attest-grade910-all-original-candidate-revisions.cjs')
 const src=originals.loadInputs(),sealed=originals.assertFrozen(src)
 const pages=read('ASSPS_GRADE910_2581_ORIGINAL_PRINTED_PAGE_EXERCISE_REVIEW_20261010.json')
 const applicability=read('ASSPS_GRADE910_1135_SOURCE_APPLICABILITY_REVIEW_QUEUE_20261010.json')
 const coverage=require('./report-grade910-frozen-coverage.cjs').compile()
 const language=require('./validate-grade910-independent-review-evidence.cjs').indexOriginals(sealed,src.documents)
 const finalFive=require('./prepare-grade910-five-final-long-research-drafts.cjs').build()
 const pairDocket=require('./prepare-grade910-three-overlap-review.cjs').build()
 const pageMap=new Map(pages.originalSourcePageAndExerciseResearchQueue.map(x=>[x.originalQuestionId,x]))
 const claimMap=new Map(applicability.candidateReviewQueue.map(x=>[x.originalQuestionId,x]))
 const special=new Map(finalFive.rows.map(x=>[x.originalQuestionId,x]))
 const dupes=new Set(pairDocket.pairs.flatMap(x=>x.originals.map(q=>q.id)))
 const rows=[],seen=new Set(),byType={},sourceFiles=new Map(),reasons={}
 for(const entry of src.documents){
  const sourceSeal=sealed.files.find(x=>x.originalAuthoredFile===entry.file)
  if(!sourceSeal)continue
  const pinned=new Map(sourceSeal.originalQuestionRevisions.map(x=>[x.originalQuestionId,x]))
  for(const q of [...(entry.data?.drafts||[]),...(entry.data?.items||[])]){
   if(!pinned.has(q.id))continue
   if(seen.has(q.id))fail('DUPLICATE_ORIGINAL_ID')
   seen.add(q.id)
   const seal=pinned.get(q.id),page=pageMap.get(q.id),lang=language.get(q.id),claim=claimMap.get(q.id)
   if(!page||!lang||seal.originalQuestionRevisionSha256!==page.originalQuestionSha256||
     seal.originalQuestionRevisionSha256!==hash(JSON.stringify(q)))fail('QUESTION_REVISION_OR_PAGE_COHORT_DRIFT')
   if(claim&&claim.originalQuestionSha256!==seal.originalQuestionRevisionSha256)fail('APPLICABILITY_REVISION_DRIFT')
   const grade=q.curriculum?.grade??null,subject=q.curriculum?.subjectId??null
   const chapter=q.chapter?.number??q.chapterNo??q.unit??null,typ=q.type||'unknown'
   const flags=['NO_AUTHENTICATED_SCHOOL_BOOK_ADOPTION','NO_QUALIFIED_INDEPENDENT_APPROVED_REVISION']
   if(!page.claimedPdfPage)flags.push('SOURCE_PDF_PAGE_CLAIM_MISSING')
   if(page.claimedExerciseRef)flags.push('EXERCISE_CLAIM_UNVERIFIED')
   if(claim?.independentReviewFlags?.length)flags.push(...claim.independentReviewFlags.map(x=>'SOURCE_'+x))
   if(!lang.sourceMedium)flags.push('ORIGINAL_MEDIUM_UNSPECIFIED')
   if(!subject)flags.push('ORIGINAL_SUBJECT_ID_UNSPECIFIED')
   if(grade!==9&&grade!==10)flags.push('ORIGINAL_GRADE_UNSPECIFIED_OR_SHARED_SCOPE')
   if(typ==='mcq')flags.push('INDEPENDENT_MCQ_KEY_AND_DISTRACTOR_REVIEW')
   if(dupes.has(q.id))flags.push('INDEPENDENT_OVERLAP_PAIR_ADJUDICATION')
   if(special.get(q.id)?.requiresQualifiedSubjectFacultyCompletion)flags.push('QUALIFIED_TEACHER_MUST_AUTHOR_MISSING_ANSWER')
   for(const flag of flags)reasons[flag]=(reasons[flag]||0)+1
   byType[typ]=(byType[typ]||0)+1;sourceFiles.set(entry.file,true)
   const record={originalQuestionId:q.id,originalQuestionRevisionSha256:seal.originalQuestionRevisionSha256,
    originalFile:entry.file,originalFileSha256:sourceSeal.originalFileSha256,
    gradeClaim:grade,subjectClaim:subject,chapterClaim:chapter,type:typ,mediumClaim:lang.sourceMedium||null,
    sourceCatalogId:page.originalCatalogId||null,sourcePdfSha256Claim:page.originalCatalogPdfSha256||null,
    sourcePdfPageClaim:page.claimedPdfPage??null,exerciseReferenceClaim:page.claimedExerciseRef??null,
    contentOrigin:typeof q.origin==='string'?q.origin:null,
    flags:[...new Set(flags)].sort(),
    independentSubjectReviewer:null,independentUrduReviewer:null,
    schoolTextbookAdoptionAuthenticated:false,actualPrintedSourcePageVerified:false,
    scienceAndAnswerReviewAuthenticated:false,schoolApprovalAuthenticated:false,
    approvedQuestionRevision:null,approvedAnswerRevision:null,
    published:false,releaseStatus:'RESEARCH_HOLD'}
   rows.push(record)
  }
 }
 rows.sort((a,b)=>a.originalQuestionId.localeCompare(b.originalQuestionId))
 if(rows.length!==2581||seen.size!==2581||sourceFiles.size!==73||
  claimMap.size!==1135||pageMap.size!==2581||coverage.originalResearchCandidates!==2581||
  byType.mcq!==875||byType.short!==908||byType.long!==564||byType.numerical!==91||
  reasons.NO_AUTHENTICATED_SCHOOL_BOOK_ADOPTION!==2581||
  reasons.INDEPENDENT_MCQ_KEY_AND_DISTRACTOR_REVIEW!==875||
  reasons.INDEPENDENT_OVERLAP_PAIR_ADJUDICATION!==6||
  reasons.QUALIFIED_TEACHER_MUST_AUTHOR_MISSING_ANSWER!==1)
  fail('UNIFIED_UNIVERSE_TOTALS_DRIFT')
 return{schemaVersion:'assps-grade910-one-authoritative-academic-faculty-review-worklist-v1',
  researchQuestionCandidates:2581,originalSourceFiles:73,uniqueOriginalQuestionIds:2581,
  researchTypeCounts:byType,reviewFlags:reasons,
  publisherSelectable:0,approved:0,verifiedPublished:0,
  humanReviewerApprovalCannotBeInferred:true,
  editionYearAndSchoolAdoptionCannotBeInferred:true,
  notice:'Physical exercise reference is required for exercise-origin attribution, not for independently authored conceptual candidates. Source PDF page claims are never printed-page certifications.',
  rows}
}
if(require.main===module){
 const result=build()
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify({ids:result.uniqueOriginalQuestionIds,counts:result.researchTypeCounts,flags:result.reviewFlags,output:process.argv.includes('--write')?OUT:null,academicPublished:result.verifiedPublished}))
}
module.exports={build,OUT}
