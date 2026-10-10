#!/usr/bin/env node
'use strict'
// Evidence-bound public authority/context check. Never asserts school textbook adoption or academic review.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const old=require('./attest-grade910-all-original-candidate-revisions.cjs')
const ROOT=path.resolve(__dirname,'../..'),DATA=path.join(ROOT,'al-siddique-backend/src/data')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_GRADE910_PUBLIC_BOARD_AND_EXAM_YEAR_APPLICABILITY_20261010'
const PIN='c304b0920b58c989f25a9b786be639c64c9cb8f89f652e671094f858c2bc1d6b'
const SHA=v=>crypto.createHash('sha256').update(v).digest('hex')
const fail=code=>{throw Error('GRADE910_AUTHORITY_'+code)}
const sources=Object.freeze([
 {id:'gujranwala-board-official',authority:'BISE Gujranwala',
  url:'https://www.bisegrw.online/',kind:'BOARD_OFFICIAL_EXAM_SITE',
  scope:'Regional examination board public portal',evidenceYear:2026,
  officialPdfSha256:null,actualSchoolAffiliationProven:false,schoolTextbookAdoptionProven:false},
 {id:'punjab-geographic-administration',authority:'Government of Punjab',
  url:'https://lgcd.punjab.gov.pk/node/629',kind:'GOVERNMENT_DIVISION_DISTRICT_DIRECTORY',
  scope:'Narowal listed under Gujranwala Division',evidenceYear:null,
  officialPdfSha256:null,actualSchoolAffiliationProven:false,schoolTextbookAdoptionProven:false},
 {id:'pectaa-official-textbook-catalog',authority:'PECTAA',
  url:'https://pectaa.edu.pk/books-and-publications/',kind:'OFFICIAL_TEXTBOOK_LISTING',
  scope:'Multiple Grade IX/X book titles and edition labels; not school adoption',evidenceYear:null,
  officialPdfSha256:null,actualSchoolAffiliationProven:false,schoolTextbookAdoptionProven:false},
 {id:'pectaa-2026-27-publication-session',authority:'PECTAA',
  url:'https://pectaa.edu.pk/downloads-2-2/',kind:'PUBLIC_SESSION_PUBLICATION_NOTICE',
  scope:'PECTAA notices include 2026-27 textbooks/publisher allocation, not ASSPS adoption',evidenceYear:null,
  officialPdfSha256:null,actualSchoolAffiliationProven:false,schoolTextbookAdoptionProven:false},
 {id:'pectaa-grade9-2026-alp',authority:'PECTAA',
  url:'https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf',
  kind:'YEAR_SCOPED_SMART_SYLLABUS_NOTIFICATION',
  scope:'Grade IX forthcoming Annual Examination 2026 only; cannot auto-extend to 2027 or 2028',
  evidenceYear:2026,grade:9,notificationDate:'2025-11-07',
  officialPdfSha256:null,actualSchoolAffiliationProven:false,schoolTextbookAdoptionProven:false},
 {id:'lahore-board-2025-27-not-gujranwala-proof',authority:'BISE Lahore',
  url:'https://biselahore.com/notifications',kind:'DIFFERENT_BOARD_NOTIFICATION_INDEX',
  scope:'BISE Lahore public notifications cannot by themselves prove a school in Narowal adopted their 2025-27 scheme',
  evidenceYear:null,officialPdfSha256:null,actualSchoolAffiliationProven:false,schoolTextbookAdoptionProven:false}
])
function loadInputs(){
 return{originals:old.loadInputs(),
  adoption:JSON.parse(fs.readFileSync(path.join(DATA,'asspsGrade910SchoolAdoptions.json'))),
  physical:JSON.parse(fs.readFileSync(path.join(DATA,'asspsGrade910PhysicalPageEvidence.json')))}
}
function assessRule({authorityId,grade,examYear,schoolBoard='BISE Gujranwala'}){
 // Never let a caller inject a substitute official-source record.
 const ref=sources.find(x=>x.id===authorityId)
 if(!ref||![9,10].includes(grade)||!Number.isInteger(examYear)||examYear<2025||examYear>2100)
  fail('INVALID_APPLICABILITY_CLAIM')
 if(schoolBoard!=='BISE Gujranwala')fail('SCHOOL_REGION_BOARD_MISMATCH')
 if(ref.kind==='DIFFERENT_BOARD_NOTIFICATION_INDEX'||ref.authority==='BISE Lahore')
  return{decision:'DENY_CROSS_BOARD_AUTO_APPLICABILITY',requiresIndependentBoardConfirmation:true}
 if(ref.kind==='YEAR_SCOPED_SMART_SYLLABUS_NOTIFICATION'){
  if(ref.grade!==grade||ref.evidenceYear!==examYear)
   return{decision:'DENY_WRONG_GRADE_OR_EXAM_YEAR_AUTO_APPLICATION',requiresIndependentBoardConfirmation:true}
  return{decision:'PUBLIC_NOTIFICATION_YEAR_MATCH_ONLY_SCHOOL_APPLICABILITY_UNVERIFIED',
   requiresIndependentBoardConfirmation:true}
 }
 return{decision:'PUBLIC_OFFICIAL_CONTEXT_ONLY_NO_SCHOOL_ADOPTION',
  requiresIndependentBoardConfirmation:true}
}
function build({originals,adoption,physical}){
 const prior=old.assertFrozen(originals)
 if(prior.originalAuthoredQuestionCandidates!==2581||prior.originalAuthoredFiles!==73||
    prior.academicallyApproved!==0||prior.verifiedPublished!==0)
  fail('INHERITED_ORIGINAL_QUESTION_REGISTRY_DRIFT')
 if(adoption?.schoolCode!=='assps'||adoption?.schoolId!==1||
    adoption?.teachingSession!=='2026-27'||adoption?.schoolBookAndExamYearApplicabilityCertified!==false||
    !Array.isArray(adoption?.verifiedAdoptions)||adoption.verifiedAdoptions.length!==0)
  fail('SCHOOL_ADOPTION_EVIDENCE_IS_MISSING_OR_NOT_REATTESTED')
 if(physical?.academicPageEvidenceCertified!==false||
    !Array.isArray(physical?.verifiedChapterAnchors)||physical.verifiedChapterAnchors.length!==0||
    !Array.isArray(physical?.verifiedExerciseAnchors)||physical.verifiedExerciseAnchors.length!==0)
  fail('PHYSICAL_PAGE_EVIDENCE_NOT_REATTESTED')
 const seen=new Set()
 for(const source of sources){
  if(seen.has(source.id)||!['https://www.bisegrw.online/','https://lgcd.punjab.gov.pk/node/629',
   'https://pectaa.edu.pk/books-and-publications/','https://pectaa.edu.pk/downloads-2-2/',
   'https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf',
   'https://biselahore.com/notifications'].includes(source.url))
   fail('PUBLIC_EVIDENCE_URL_OR_ID_DRIFT')
  seen.add(source.id)
  if(source.actualSchoolAffiliationProven!==false||source.schoolTextbookAdoptionProven!==false||
    source.officialPdfSha256!==null)fail('UNPROVEN_PUBLIC_EVIDENCE_CERTIFIED')
 }
 const sampleClaims=[
  {sourceId:'pectaa-grade9-2026-alp',grade:9,examYear:2026,
   result:assessRule({authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:2026})},
  {sourceId:'pectaa-grade9-2026-alp',grade:9,examYear:2027,
   result:assessRule({authorityId:'pectaa-grade9-2026-alp',grade:9,examYear:2027})},
  {sourceId:'lahore-board-2025-27-not-gujranwala-proof',grade:10,examYear:2027,
   result:assessRule({authorityId:'lahore-board-2025-27-not-gujranwala-proof',grade:10,examYear:2027})}
 ]
 if(sampleClaims[0].result.decision!=='PUBLIC_NOTIFICATION_YEAR_MATCH_ONLY_SCHOOL_APPLICABILITY_UNVERIFIED'||
   sampleClaims[1].result.decision!=='DENY_WRONG_GRADE_OR_EXAM_YEAR_AUTO_APPLICATION'||
   sampleClaims[2].result.decision!=='DENY_CROSS_BOARD_AUTO_APPLICABILITY')
  fail('EXPECTED_EXAM_YEAR_OR_CROSS_BOARD_DENIAL_DRIFT')
 return{schemaVersion:'assps-grade910-board-public-evidence-and-session-applicability-v1',
  evidenceResearchedOn:'2026-10-10',
  schoolLocationForBoardAssessment:'Narowal District, Punjab',
  likelyRegionalBoard:'BISE Gujranwala',specificSchoolBoardAffiliationIndependentlyCertified:false,
  schoolTeachingSession:'2026-27',schoolSpecificExamYearForGrade9Verified:false,
  schoolSpecificExamYearForGrade10Verified:false,
  officialWebEvidenceClassification:'PUBLIC_AUTHORITATIVE_WEB_LISTINGS_NO_CRYPTOGRAPHIC_PDF_REVALIDATION',
  publicOfficialEvidenceCount:sources.length,
  publicAuthoritySources:sources,
  separatelyTestedApplicabilityClaims:sampleClaims,
  actualAdoptedTextbookEvidenceRecords:0,
  independentPhysicalExercisePageVerifications:0,
  independentQualifiedSubjectTeacherRevisionApprovals:0,
  sourceQuestionCandidateRevisionsPreserved:2581,
  academicallyApproved:0,verifiedPublished:0,
  releaseDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  actionNeeded:'Signed ASSPS adoption and actual exam-cohort/board documents, licensed/physical book edition-page proof and independent qualified question revision review; public links alone cannot supply these facts.'}
}
function assertPinned(inputs,override){
 const bytes=override??fs.readFileSync(path.join(DOC,NAME+'.json'))
 if(!Buffer.isBuffer(bytes)||SHA(bytes)!==PIN)fail('FROZEN_AUTHORITY_MANIFEST_SHA_CHANGED')
 let frozen
 try{frozen=JSON.parse(bytes)}catch(_){fail('FROZEN_AUTHORITY_JSON_INVALID')}
 const actual=build(inputs)
 if(JSON.stringify(frozen)!==JSON.stringify(actual))
  fail('PUBLIC_SOURCE_OR_EXAM_COHORT_CONTEXT_DRIFT')
 return actual
}
function markdown(d){
 const lines=[
 '# Grade IX-X ASSPS — Public board and exam-year applicability evidence',
 '',
 'Public records do not establish independent teacher approval or actual school-adopted textbook editions.',
 '',
 'Narowal is in Gujranwala region; verify school-specific affiliation separately with BISE Gujranwala.',
 'PECTAA Grade IX revised smart syllabus notification is for annual examination 2026 only, not a blanket authorization for 2027.',
 'BISE Lahore notification indexes are a different board and cannot automatically govern ASSPS Narowal.',
 'Published textbook labels are not a school principal signed adoption register.',
 '',
 '| Public source | Published scope | School evidence |',
 '|---|---|---|'
 ]
 for(const item of d.publicAuthoritySources)
  lines.push('| '+item.authority+' — '+item.url+' | '+item.scope+' | NOT VERIFIED |')
 lines.push('','Adopted books 0; independently verified physical exercise pages 0; qualified independent teacher approvals 0.',
 '**Release '+d.releaseDecision+'.** Production only after SaaS Core certification.','')
 return lines.join('\n')
}
function main(){
 const d=build(loadInputs()),file=path.join(DOC,NAME)
 fs.writeFileSync(file+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(file+'.md',markdown(d))
 console.log(JSON.stringify({
  originalCount:d.sourceQuestionCandidateRevisionsPreserved,
  officialPublicReferences:d.publicOfficialEvidenceCount,
  documentedSchoolBookAdoptions:d.actualAdoptedTextbookEvidenceRecords,
  exam2027AlpDecision:d.separatelyTestedApplicabilityClaims[1].result.decision,
  rawManifestSha256:SHA(fs.readFileSync(file+'.json')),
  independentlyAcademicApproved:d.academicallyApproved}))
}
if(require.main===module)main()
module.exports={loadInputs,build,assessRule,assertPinned,markdown,SHA,NAME,sources}
