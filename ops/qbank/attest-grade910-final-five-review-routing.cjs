#!/usr/bin/env node
'use strict'
// Academic-only read-only routing docket. Catalog identity is NOT school adoption.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const handoff=require('./attest-grade910-161-faculty-handoff.cjs')
const ROOT=path.resolve(__dirname,'../..')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_FINAL_FIVE_SOURCE_ALIGNED_REVIEW_ROUTING_20261010'
const PIN='4a93c0a1bebddd6e8285e6498b98680acb239a75b83aeb7672953c74c8eb340e'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const fail=code=>{throw Error('REVIEW_ROUTING_'+code)}
function loadInputs(){return {old:handoff.loadInputs()}}
function build({old}){
 const base=handoff.assertPinned(old)
 if(base.originalFiveFacultyReviewDocket.length!==5||
  base.academicApprovals!==0||base.verifiedPublished!==0||
  base.releaseDecision!=='DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT')
  fail('PRIOR_FACULTY_HANDOFF_RELEASE_DRIFT')
 const entries=old.registry?.entries
 if(!Array.isArray(entries)||new Set(entries.map(x=>x.recordId)).size!==entries.length)
  fail('CATALOG_SOURCE_REGISTRY_UNTRUSTWORTHY')
 const routes=[]
 for(const item of base.originalFiveFacultyReviewDocket){
  const bytes=old.originalOutstanding?.[item.sourceFile]
  if(!Buffer.isBuffer(bytes)||sha(bytes)!==item.sourceFileSha256)
   fail('ORIGINAL_SOURCE_BYTES_DRIFT')
  let source
  try{source=JSON.parse(bytes)}catch(_){fail('ORIGINAL_JSON_INVALID')}
  const q=source.drafts.find(x=>x.id===item.questionId)
  const catalog=entries.find(x=>x.recordId===q?.source?.catalogRecordId)
  const grade=q?.curriculum?.grade
  const subject=String(q?.curriculum?.subjectId||'').toLowerCase()
  const medium=String(q?.medium||'').toLowerCase()
  const catalogMedium=String(catalog?.medium||'').toLowerCase()
  const catalogSubject=String(catalog?.subject||'').toLowerCase()
  const sourceEdition=q?.curriculum?.edition
  const sourceHash=q?.source?.pdfSha256
  const gradePrefix=grade===9?'IX-CHEM-':grade===10?'X-CHEM-':''
  if(!gradePrefix||!q.id.startsWith(gradePrefix)||
   subject!=='chemistry'||medium!=='english'||q.marks!==5||
   q.review?.status!=='draft'||!q.review?.checks||
   Object.keys(q.review.checks).length<7||
   Object.values(q.review.checks).some(v=>v!==false)||
   !catalog||catalog.academicApproval!==false||
   catalog.grade!==grade||catalogSubject!=='chemistry'||catalogMedium!==medium||
   catalog.edition!==sourceEdition||catalog.pdfSha256!==sourceHash||
   source.sourcePdfSha256!==sourceHash||
   source.sourceRecordId!==catalog.recordId||
   item.originalQuestionRevisionSha256!==sha(JSON.stringify(q))||
   item.originalRubricSha256!==sha(q.content?.en?.answer||'')||
   item.catalogRecordClaim!==catalog.recordId||
   item.claimedPdfSha256!==catalog.pdfSha256)
   fail('GRADE_SUBJECT_MEDIUM_OR_CATALOG_MISMATCH:'+item.questionId)
  routes.push({
   questionId:item.questionId,originalQuestionRevisionSha256:item.originalQuestionRevisionSha256,
   originalRubricSha256:item.originalRubricSha256,
   grade:grade,subject:'Chemistry',medium:'English',
   sourceCatalogId:catalog.recordId,catalogEditionLabelNotSchoolAdoption:sourceEdition,
   catalogPdfSha256Claim:catalog.pdfSha256,
   originalPrintedPageClaimNotVerified:item.originalPageClaimNOTVerified,
   originalSourceFile:item.sourceFile,originalSourceFileSha256:item.sourceFileSha256,
   marks:item.marks,
   subjectReviewerRoute:'Independent Grade '+grade+' Chemistry qualified teacher',
   secondLanguageReviewerRoute:'Qualified Urdu equivalence reviewer only where an Urdu version applies',
   schoolAdoptionEvidenceOwner:'ASSPS authorized textbook coordinator',
   reviewerMustBeIndependentFromDraftAuthor:true,
   originalQuestionAndAnswerCorrectnessApproved:false,
   sourceSchoolAdoptionAndPrintedPageApproved:false,
   independentEnglishUrduReviewApproved:false,
   originalityOverlapReviewApproved:false,
   qualificationAndIdentityVerified:false,
   independentReviewerId:null,approvedRevisionSha256:null,
   academicallyApproved:false,verifiedPublished:false,
   publicationAccess:'DENY'
  })
 }
 const grade9=routes.filter(x=>x.grade===9)
 const grade10=routes.filter(x=>x.grade===10)
 if(routes.length!==5||grade9.length!==2||grade10.length!==3||
  new Set(routes.map(x=>x.questionId)).size!==5)
  fail('EXPECTED_REVIEW_ROUTING_DISTRIBUTION_DRIFT')
 return {schemaVersion:'assps-grade910-original-five-qualified-review-routing-v1',
  priorHandoff:'ASSPS_GRADE910_161_REVISION_AND_FIVE_PENDING_FACULTY_HANDOFF_20261010.json',
  totalOriginalReviewRequests:5,grade9ChemistryRequests:2,grade10ChemistryRequests:3,
  allRealReviewerSignaturesMissing:true,actualSchoolTextbookAdoptionProofMissing:true,
  academicApproved:0,verifiedPublished:0,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  distinction:'Grade/subject/medium and edition are matched to immutable candidate and PDF catalog identity; NOT verified ASSPS school adoption or printed exercise location.',
  reviewerRoutes:routes}
}
function assertPinned(inputs,override){
 const bytes=override??fs.readFileSync(path.join(DOC,NAME+'.json'))
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==PIN)fail('PINNED_REVIEW_ROUTING_SHA_DRIFT')
 let expected
 try{expected=JSON.parse(bytes)}catch(_){fail('PINNED_REVIEW_ROUTING_JSON_INVALID')}
 const current=build(inputs)
 if(JSON.stringify(expected)!==JSON.stringify(current))
  fail('REVIEW_ROUTING_DERIVATION_DRIFT')
 return current
}
function markdown(d){
 return ['# Grade IX–X Final Five — Qualified Faculty Review Routing (Unapproved)','',
  '**Research reviewer preparation only, NOT an approved ASSPS textbook or source verification.**','',
  'Existing final five original IDs routed by immutable original candidate grade, medium and catalog identity.',
  'Grade IX Chemistry English: **2**. Grade X Chemistry English: **3**.',
  'Printed page numbers and textbook edition labels below are unverified claims only.','',
  '| Original ID | Grade | Catalog label | Source page CLAIM | Independent subject reviewer |',
  '|---|---:|---|---:|---|',
  ...d.reviewerRoutes.map(x=>'| '+x.questionId+' | '+x.grade+' | '+x.catalogEditionLabelNotSchoolAdoption+
   ' | '+(x.originalPrintedPageClaimNotVerified??'—')+' | NOT ASSIGNED / NOT APPROVED |'),
  '','All qualified faculty identity/signatures, school adoption evidence, English–Urdu equivalence decisions and three conceptual originality decisions remain absent.',
  '**Publication decision: '+d.publicationDecision+'.** No Paper Studio verified question selection. Only SaaS Core certifies production.',''
 ].join('\n')
}
function main(){
 const d=build(loadInputs()),dest=path.join(DOC,NAME)
 fs.writeFileSync(dest+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(dest+'.md',markdown(d))
 console.log(JSON.stringify({grade9:d.grade9ChemistryRequests,grade10:d.grade10ChemistryRequests,
  approvals:d.academicApproved,jsonSha256:sha(fs.readFileSync(dest+'.json'))}))
}
if(require.main===module)main()
module.exports={loadInputs,build,assertPinned,markdown,sha,NAME}
