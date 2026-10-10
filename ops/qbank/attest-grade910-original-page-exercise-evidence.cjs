#!/usr/bin/env node
'use strict'
// Read-only original page CLAIM integrity, never printed page/exercise certification.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const originals=require('./attest-grade910-all-original-candidate-revisions.cjs')
const claims=require('./attest-grade910-grade-medium-edition-claims.cjs')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const ROOT=path.resolve(__dirname,'../..')
const PHYSICAL=path.join(ROOT,'al-siddique-backend/src/data/asspsGrade910PhysicalPageEvidence.json')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_2581_ORIGINAL_PRINTED_PAGE_EXERCISE_REVIEW_20261010'
const PIN='7177179eb13ed0b2cc9f9aa99a3f1db42871814bd462c31b11ec70c1884d4248'
const PHYSICAL_SHA='291493041690df2a18d6f161087bfd340a0b10b189e15f9c421511a88a720a49'
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('GRADE910_PAGE_'+x)}
const rowsOf=x=>[...(x?.drafts||[]),...(x?.items||[])].filter(q=>
  q?.id&&(q.stem||q.question_text||q.questionText||q.content?.en?.stem||q.content?.ur?.stem))
function loadInputs(){
 return {originals:originals.loadInputs(),claims:claims.loadInputs(),
  documents:collectDocuments(),physicalBytes:fs.readFileSync(PHYSICAL)}
}
function evaluate(q){
 const page=q.source?.page,exercise=q.source?.exerciseRef
 let pageState
 if(page==null)pageState='ORIGINAL_PAGE_NOT_CLAIMED'
 else if(Number.isInteger(page)&&page>0)pageState='POSITIVE_PDF_PAGE_CLAIM_NOT_PHYSICALLY_VERIFIED'
 else fail('INVALID_NONPOSITIVE_OR_NONINTEGER_PAGE_CLAIM:'+q.id)
 const exState=exercise==null||exercise===''?'EXERCISE_REFERENCE_NOT_CLAIMED':
  typeof exercise==='string'&&exercise.trim()?'EXERCISE_REFERENCE_UNVERIFIED':
  fail('INVALID_EXERCISE_REFERENCE:'+q.id)
 if(exState==='EXERCISE_REFERENCE_UNVERIFIED'&&pageState==='ORIGINAL_PAGE_NOT_CLAIMED')
  fail('EXERCISE_WITHOUT_SOURCE_PAGE:'+q.id)
 const languages=q.source?.languages
 const languagePages=[]
 if(languages){
  if(!languages.en||!languages.ur)fail('BILINGUAL_PAGE_SOURCE_INCOMPLETE:'+q.id)
  for(const lang of ['en','ur']){
   const ref=languages[lang]
   if(!Number.isInteger(ref.page)||ref.page<=0||
    !Array.isArray(ref.pages)||ref.pages.length===0||
    ref.pages.some(p=>!Number.isInteger(p)||p<=0)||
    !ref.pages.includes(ref.page))
    fail('BILINGUAL_PAGE_ARRAY_NOT_CONSISTENT:'+q.id+':'+lang)
   languagePages.push({medium:lang,sourceCatalogId:ref.catalogRecordId,
    sourcePdfSha256:ref.pdfSha256,claimedPdfPage:ref.page,
    claimedPageListSha256:SHA(JSON.stringify(ref.pages))})
  }
  if(page!==languages.en.page)
   fail('PRIMARY_SOURCE_PAGE_NOT_ENGLISH_CLAIM:'+q.id)
 }
 return{pageState,exerciseState:exState,claimedPdfPage:page??null,
  claimedExerciseRef:exState==='EXERCISE_REFERENCE_UNVERIFIED'?exercise:null,
  languagePages}
}
function build({originals:old,claims:claimInputs,documents,physicalBytes}){
 const base=originals.assertFrozen(old)
 const prior=claims.assertFrozen(claimInputs)
 if(base.originalAuthoredQuestionCandidates!==2581||base.originalAuthoredFiles!==73||
    prior.originalQuestionResearchCandidates!==2581||prior.independentlyReviewedAndApproved!==0)
  fail('REQUIRED_ORIGINAL_SOURCE_RELEASE_STATE_DRIFT')
 if(!Buffer.isBuffer(physicalBytes)||SHA(physicalBytes)!==PHYSICAL_SHA)
  fail('SIGNED_PHYSICAL_PAGE_REGISTRY_RAW_SHA_DRIFT')
 let physical
 try{physical=JSON.parse(physicalBytes)}catch(_){fail('PHYSICAL_PAGE_REGISTRY_INVALID_JSON')}
 if(physical.academicPageEvidenceCertified!==false||
   physical.verifiedChapterAnchors?.length!==0||
   physical.verifiedExerciseAnchors?.length!==0)
  fail('UNAUTHENTICATED_PHYSICAL_PAGE_REVIEW_CLAIM')
 const fileByName=new Map(base.files.map(f=>[f.originalAuthoredFile,f]))
 const out=[],ids=new Set()
 let claimed=0,absent=0,exercise=0,withoutExercise=0,bilingual=0
 for(const doc of documents){
  const questions=rowsOf(doc.data)
  if(!questions.length)continue
  const file=fileByName.get(doc.file)
  if(!file||file.originalQuestionCount!==questions.length)
   fail('UNPINNED_SOURCE_OR_QUESTION_COHORT:'+doc.file)
  const src=new Map(file.originalQuestionRevisions.map(q=>[q.originalQuestionId,q]))
  for(const q of questions){
   const pinned=src.get(q.id)
   if(ids.has(q.id)||!pinned||pinned.originalQuestionRevisionSha256!==SHA(JSON.stringify(q)))
    fail('ORIGINAL_QUESTION_REVISION_DRIFT:'+q.id)
   ids.add(q.id)
   const ev=evaluate(q)
   if(ev.pageState==='ORIGINAL_PAGE_NOT_CLAIMED')absent++;else claimed++
   if(ev.exerciseState==='EXERCISE_REFERENCE_UNVERIFIED')exercise++;else withoutExercise++
   if(ev.languagePages.length)bilingual++
   out.push({originalQuestionId:q.id,originalQuestionSha256:pinned.originalQuestionRevisionSha256,
    originalSourceFile:doc.file,originalSourceFileSha256:file.originalFileSha256,
    originalCatalogId:q.source?.catalogRecordId||doc.data.sourceRecordId,
    originalCatalogPdfSha256:q.source?.pdfSha256||doc.data.sourcePdfSha256,
    ...ev,physicalPageReviewer:null,printedBookPageEvidence:null,
    independentlyPhysicallyVerified:false,actualExerciseVerified:false,
    schoolAdoptedEditionVerified:false,independentAcademicReviewerId:null,
    revisionApproved:false,academicallyApproved:false,verifiedPublished:false})
  }
 }
 if(ids.size!==2581||out.length!==2581||claimed!==1393||absent!==1188||
    exercise!==0||withoutExercise!==2581||bilingual!==48)
  fail('ORIGINAL_PAGE_EXERCISE_POPULATION_DRIFT')
 return {schemaVersion:'assps-original-grade910-printed-page-and-exercise-intake-hold-v1',
  originalCandidateRevisions:2581,sourceFiles:73,
  positiveSourcePdfPageClaims:1393,missingOriginalSourcePageClaims:1188,
  originalExerciseReferencesClaimed:0,originalExerciseReferencesMissing:2581,
  bilingualPageSourcePairsChecked:48,
  independentPrintedPageEvidencePairs:0,
  independentExerciseEvidencePairs:0,actualSchoolEditionPageCertification:false,
  academicallyApproved:0,verifiedPublished:0,
  sourcePageClaimIsNotPhysicalPageCertification:true,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  originalSourcePageAndExerciseResearchQueue:out}
}
function assertFrozen(inputs,override){
 const bytes=override??fs.readFileSync(path.join(DOC,NAME+'.json'))
 if(!Buffer.isBuffer(bytes)||SHA(bytes)!==PIN)
  fail('FROZEN_PAGE_EVIDENCE_MANIFEST_CHANGED')
 let saved
 try{saved=JSON.parse(bytes)}catch(_){fail('FROZEN_PAGE_EVIDENCE_MANIFEST_INVALID_JSON')}
 const actual=build(inputs)
 if(JSON.stringify(saved)!==JSON.stringify(actual))
  fail('SOURCE_PAGE_CLAIMS_OR_RESEARCH_QUEUE_CHANGED')
 return actual
}
function markdown(d){
 return ['# Grade IX-X — original source PDF page CLAIMS are not physically checked exercise pages','',
  '**Source-intake integrity only; not actual ASSPS approved textbook adoption, printed page signoff or question correctness.**','',
  'Original candidates: 2,581 in 73 files. Source PDF page CLAIMS: 1,393; missing source page claims: 1,188.',
  'Original exercise references: 0 of 2,581. Any claim of approved original textbook exercise extraction would be unsupported.',
  'Forty-eight original bilingual Biology source records have two structurally consistent language/PDF page claims; human printed-page and translation checks are still unverified.',
  'The separate school physical evidence registry has ZERO verified book/chapter and exercise anchors. All source page numbers remain research locator suggestions.',
  '','| Source original question ID | Question SHA256 | PDF page claim | Exercise claim | Source file |',
  '|---|---|---:|---|---|',
  ...d.originalSourcePageAndExerciseResearchQueue.map(q=>'| '+q.originalQuestionId+' | '+q.originalQuestionSha256+' | '+(q.claimedPdfPage??'NOT PROVIDED')+
    ' | NOT PROVIDED | '+q.originalSourceFile+' |'),
  '','Independent physical exercise page/print mapping approval: 0; human academic question approvals: 0.',
  'All original source and question revisions remain unchanged. Request actual adopted textbooks, edition-specific original page+exercise, authenticated qualified subject review, exact revision signoff.',
  '**'+d.publicationDecision+'**. SaaS Core solely controls production.',''
 ].join('\n')
}
function main(){
 const d=build(loadInputs()),dest=path.join(DOC,NAME)
 fs.writeFileSync(dest+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(dest+'.md',markdown(d))
 console.log(JSON.stringify({original:d.originalCandidateRevisions,pagesClaimed:d.positiveSourcePdfPageClaims,
  pagesAbsent:d.missingOriginalSourcePageClaims,exercisesClaimed:d.originalExerciseReferencesClaimed,
  bilingual:d.bilingualPageSourcePairsChecked,
  manifestSha256:SHA(fs.readFileSync(dest+'.json'))}))
}
if(require.main===module)main()
module.exports={loadInputs,build,evaluate,assertFrozen,markdown,NAME,SHA}
