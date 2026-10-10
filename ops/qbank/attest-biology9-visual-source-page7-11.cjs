#!/usr/bin/env node
'use strict'
// Actual cached scan page fingerprints + original question SHA-bound research observation.
// PDF page visibility != school-adopted edition, exercise, or independent human approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {pathToFileURL}=require('node:url')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const originals=require('./attest-grade910-all-original-candidate-revisions.cjs')
const pageEvidence=require('./attest-grade910-original-page-exercise-evidence.cjs')
const ROOT=path.resolve(__dirname,'../..'),DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_BIOLOGY9_TWO_VISUALLY_INSPECTED_PDF_PAGES_20261010'
const PIN='833f40f990fff9721e8eedbde23efebabd624ec9ee139f5018eaed50d2122ef9'
const OFFICIAL_PDF_SHA='f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5'
const SHA=b=>crypto.createHash('sha256').update(b).digest('hex')
const fail=x=>{throw Error('BIOLOGY9_VISUAL_PAGE_'+x)}
const OBSERVED=Object.freeze([
 {pdfPageIndex:7,visiblePrintedPageNumber:7,chapterHeader:'THE SCIENCE OF BIOLOGY',
  observedTopicLabels:['Histology','Cytology','Genetics','Taxonomy'],
  renderedJpegSha256:'bf927237b0b57d3071d56eb452e18ebac91d86523dcac54f732f786019fbd687',
  originalQuestionIds:[
   'IX-BIO-2025-C01-T0101-M01','IX-BIO-2025-C01-T0101-L01',
   'IX-BIO-EM-RESEARCH-C01-T0101-S02','IX-BIO-EM-RESEARCH-C01-T0101-S04',
   'IX-BIO-EM-RESEARCH-C01-T0101-M01']},
 {pdfPageIndex:11,visiblePrintedPageNumber:11,chapterHeader:'THE SCIENCE OF BIOLOGY',
  observedTopicLabels:['Physiotherapy','Agriculture','Animal Husbandry','Horticulture'],
  renderedJpegSha256:'ac483cad415d9a4585240e34736480041f2be47f840ea1d70602942ee96d09fe',
  originalQuestionIds:[
   'IX-BIO-2025-C01-T0103-M01','IX-BIO-2025-C01-T0103-S01',
   'IX-BIO-2025-C01-T0103-S02']}
])
function loadInputs(){return{originals:originals.loadInputs(),
  oldPageEvidence:pageEvidence.loadInputs(),documents:collectDocuments()}}
function build({originals:source,oldPageEvidence,documents}){
 const all=originals.assertFrozen(source)
 const prior=pageEvidence.assertFrozen(oldPageEvidence)
 if(all.originalAuthoredQuestionCandidates!==2581||all.originalAuthoredFiles!==73||
   prior.positiveSourcePdfPageClaims!==1393||prior.independentPrintedPageEvidencePairs!==0||
   prior.academicallyApproved!==0)fail('ORIGINAL_SOURCE_OR_PAGE_STATUS_DRIFT')
 const byFile=new Map(all.files.map(f=>[f.originalAuthoredFile,f]))
 const found=new Map()
 for(const doc of documents){
  if(!['biology9Chapter1TopicDrafts.json','biology9TopicResearchDrafts.json'].includes(doc.file))continue
  const f=byFile.get(doc.file)
  if(!f)fail('UNFROZEN_BIOLOGY_SOURCE_FILE')
  const revision=new Map(f.originalQuestionRevisions.map(q=>[q.originalQuestionId,q.originalQuestionRevisionSha256]))
  for(const q of [...(doc.data?.drafts||[]),...(doc.data?.items||[])]){
   if(!q?.id||!revision.has(q.id))continue
   if(revision.get(q.id)!==SHA(JSON.stringify(q)))fail('ORIGINAL_BIOLOGY_QUESTION_REVISION_DRIFT:'+q.id)
   found.set(q.id,{q,file:f})
  }
 }
 const ids=new Set()
 const pages=OBSERVED.map(page=>{
  if(page.pdfPageIndex!==page.visiblePrintedPageNumber||
     page.observedTopicLabels.length!==4)fail('MANUALLY_INSPECTED_PAGE_RECORD_CHANGED')
  const questions=page.originalQuestionIds.map(id=>{
   const row=found.get(id),q=row?.q
   if(!q||ids.has(id)||q.source?.catalogRecordId!=='pectaa-catalog-009'||
      q.source?.pdfSha256!==OFFICIAL_PDF_SHA||q.source?.page!==page.pdfPageIndex||
      q.chapter?.number!==1||q.curriculum?.grade!==9||
      q.curriculum?.subjectId!=='biology'||q.source?.exerciseRef!==null)
    fail('EXACT_ORIGINAL_BIOLOGY_PAGE_ANCHOR_CHANGED:'+id)
   ids.add(id)
   return {originalQuestionId:id,sourceFile:row.file.originalAuthoredFile,
    originalSourceFileSha256:row.file.originalFileSha256,
    originalQuestionRevisionSha256:SHA(JSON.stringify(q)),
    originalPdfPageClaim:q.source.page,
    originalTopicId:q.topicId,
    originallyClaimedBilingualSource:!!q.source.languages,
    humanScientificAnswerAndLanguageParityApproved:false,
    actualBookAdoptionVerified:false,actualTextbookExerciseVerified:false,
    academicallyApproved:false,verifiedPublished:false}
  })
  return{pdfPageIndex:page.pdfPageIndex,
   printedPageNumberObservedVisuallyByAI:page.visiblePrintedPageNumber,
   chapterHeaderObservedVisually:page.chapterHeader,
   shortTopicLabelsObserved:page.observedTopicLabels,
   scannedPageRenderedJpegSha256:page.renderedJpegSha256,
   renderedJpegIdentityIsLibraryVersionSpecific:true,
   cachedPdfPhysicalPageHumanSchoolReviewer:null,
   originalQuestionCount:questions.length,questions}
 })
 if(ids.size!==8||pages[0].questions.length!==5||pages[1].questions.length!==3)
  fail('EIGHT_BIOLOGY_RESEARCH_PAGE_OBSERVATIONS_DRIFT')
 return{schemaVersion:'assps-biology9-two-scanned-pages-observed-research-only-v1',
  grade:9,subject:'Biology',sourceCatalogId:'pectaa-catalog-009',
  officialCachedSourcePdfSha256:OFFICIAL_PDF_SHA,sourcePdfPageCount:180,
  cachedPdfPageTextLayer:'IMAGE_ONLY_NO_TEXT_LAYER',
  actualScannedPdfPagesVisuallyObservedByAI:2,
  originalQuestionRevisionsLinkedToVisuallyObservedSourcePages:8,
  originalExerciseQuestionMappingsIndependentlyVerified:0,
  schoolAdoptedTextbookEditionAuthenticated:false,
  actualSchoolPhysicalBookAndExercisePageCertified:false,
  humanIndependentAcademicReviewerSignatures:0,
  academicallyApproved:0,verifiedPublished:0,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  warning:'Actual cached PDF scan was visually inspected for chapter/topic and visible printed page numbers; not a school-signed adoption, independent teacher answer, exercise, Urdu equivalence or publication certification.',
  pages}
}
async function verifyCachedPdf({pdfFile,pdfjsModuleFile,canvasModuleFile,readBytes}={}){
 if(!pdfFile||!pdfjsModuleFile||!canvasModuleFile)
  fail('CACHED_PDF_AND_RENDERER_MODULE_PATHS_REQUIRED')
 const bytes=readBytes??fs.readFileSync(pdfFile)
 if(!Buffer.isBuffer(bytes)||SHA(bytes)!==OFFICIAL_PDF_SHA)
  fail('CACHED_BIOLOGY9_OFFICIAL_PDF_SHA_MISMATCH')
 const pdfjs=await import(pathToFileURL(pdfjsModuleFile).href)
 const canvas=require(canvasModuleFile)
 const task=pdfjs.getDocument({
  data:new Uint8Array(bytes),disableFontFace:true,useSystemFonts:true,isEvalSupported:false,stopAtErrors:true
 })
 const doc=await task.promise
 try{
  if(doc.numPages!==180)fail('OFFICIAL_PDF_PAGE_COUNT_DRIFT')
  const renders=[]
  for(const item of OBSERVED){
   const page=await doc.getPage(item.pdfPageIndex)
   try{
    const original=page.getViewport({scale:1})
    const vp=page.getViewport({scale:Math.min(1.2,830/original.width)})
    const c=canvas.createCanvas(Math.ceil(vp.width),Math.ceil(vp.height))
    await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise
    const jpeg=await c.encode('jpeg',68)
    const digest=SHA(jpeg)
    if(digest!==item.renderedJpegSha256)
     fail('CACHED_RENDERED_SCANNED_PAGE_FINGERPRINT_CHANGED:'+item.pdfPageIndex)
    const text=await page.getTextContent()
    if(text.items.length!==0)fail('PREVIOUSLY_IMAGE_ONLY_PDF_PAGE_TEXT_LAYER_CHANGED')
    renders.push({pdfPageIndex:item.pdfPageIndex,renderedJpegSha256:digest,
     textLayerItems:text.items.length,visuallyObservedPrintedPage:item.visiblePrintedPageNumber})
   }finally{page.cleanup()}
  }
  return {originalPdfSha256:OFFICIAL_PDF_SHA,sourcePdfPages:doc.numPages,
   renderedPageFingerprintsPassed:2,printedPageNumbersObservedInPinnedRenderedScans:[7,11],
   certifiedPrintedBookExercisePages:0,approvedOriginalQuestions:0,renders}
 }finally{await doc.destroy()}
}
function assertFrozen(input,override){
 const bytes=override??fs.readFileSync(path.join(DOC,NAME+'.json'))
 if(!Buffer.isBuffer(bytes)||SHA(bytes)!==PIN)
  fail('FROZEN_VISUAL_OBSERVATION_RAW_SHA_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){fail('FROZEN_VISUAL_OBSERVATION_JSON_INVALID')}
 const fresh=build(input)
 if(JSON.stringify(saved)!==JSON.stringify(fresh))
  fail('QUESTION_TO_VISUAL_SOURCE_OBSERVATION_REVISION_CHANGED')
 return fresh
}
function markdown(d){
 return ['# Grade IX Biology — Two real visually inspected cached source PDF pages','',
  '**Observed source page locations; not independently teacher-reviewed textbook adoption, exercise extraction or approved answers.**','',
  'Official-source cached scanned PDF SHA256 '+d.officialCachedSourcePdfSha256+'; 180 PDF pages, image-only text layer.',
  'Verified by visually viewing rendered PDF page indexes 7 and 11: printed page numbers 7 and 11 are visible at page footers, chapter header THE SCIENCE OF BIOLOGY is visible.',
  'Page 7 visibly discusses Histology, Cytology, Genetics and Taxonomy. Page 11 visibly discusses Physiotherapy, Agriculture, Animal Husbandry and Horticulture.',
  'Five original Grade IX Biology candidate questions have a page-7 source claim; three have a page-11 claim. Their exact original revisions are bound below. These page-topic observations are **not** exercise Q numbering, a full teacher grading review, an independent school-book edition signoff or Urdu textual parity certification.',
  '','| Original ID | PDF/visible printed page | Question SHA | Original file |',
  '|---|---:|---|---|',
  ...d.pages.flatMap(p=>p.questions.map(q=>'| '+q.originalQuestionId+' | '+p.pdfPageIndex+' | '+q.originalQuestionRevisionSha256+' | '+q.sourceFile+' |')),
  '','Visual source-only observations 2; source-linked question revisions 8; approved/book exercises 0.',
  '**'+d.publicationDecision+'**. No original seed edits, teacher approvals or production import.',''
 ].join('\n')
}
async function main(){
 const manifest=build(loadInputs()),file=path.join(DOC,NAME)
 fs.writeFileSync(file+'.json',JSON.stringify(manifest,null,2)+'\n')
 fs.writeFileSync(file+'.md',markdown(manifest))
 console.log(JSON.stringify({researchPages:2,originalQuestions:8,
  manifestSha256:SHA(fs.readFileSync(file+'.json')),approved:manifest.academicallyApproved}))
 if(process.argv.includes('--verify-cached-pdf')){
  const r=await verifyCachedPdf({
   pdfFile:process.env.ASSPS_BIO9_OFFICIAL_PDF_PATH,
   pdfjsModuleFile:process.env.ASSPS_PDFJS_MODULE_FILE,
   canvasModuleFile:process.env.ASSPS_CANVAS_MODULE_FILE})
  console.log(JSON.stringify(r))
 }
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1})
module.exports={loadInputs,build,verifyCachedPdf,assertFrozen,markdown,NAME,SHA}
