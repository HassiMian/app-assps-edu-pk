#!/usr/bin/env node
'use strict'
// Dates/edition labels are source claims, NOT school textbook-adoption certificates.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_SCHOOL_ADOPTION_111_CATALOG_CLAIMS_20261012.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_2026_27_CATALOG_EDITION_APPLICABILITY_QUEUE_20261012.json')
const NOTE=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_2026_27_EDITION_BOARD_YEAR_WARNINGS_20261012.md')
const h=s=>crypto.createHash('sha256').update(s).digest('hex')
const fail=x=>{throw Error('ASSPS_GRADE910_SCHOOL_SESSION_APPLICABILITY_'+x)}
function category(r){
 const s=String(r.editionCatalogLabel||'')
 if(r.gradeCatalogClaim===0)return 'CROSS_GRADE_NO_ASSPS_CLASS_CERTIFICATE'
 if(s==='2026-27')return 'CATALOG_LABEL_EXPLICIT_2026_27_BUT_ASSPS_ADOPTION_UNKNOWN'
 if(s==='2025-26')return 'CATALOG_LABEL_2025_26_ASSPS_2026_27_APPLICABILITY_UNKNOWN'
 if(s.startsWith('CURRENT')||s.includes('VERIFY')||s.startsWith('CONTINUING'))
  return 'CATALOG_EDITION_YEAR_NOT_EXPLICITLY_CERTIFIED'
 return 'OTHER_HISTORICAL_OR_DATED_CATALOG_LABEL_UNCERTIFIED'
}
function make(){
 const input=JSON.parse(fs.readFileSync(INPUT,'utf8'))
 if(input.originalCandidates!==2581||input.catalogEntries!==111||
  input.schoolAdoptionCertificatesAuthenticated!==0)
  fail('SCHOOL_ACADEMIC_SOURCE_BASELINE_CHANGED')
 const counts={},graded={}
 const records=input.rows.map(x=>{
  const state=category(x),grade=x.gradeCatalogClaim
  if(!counts[state])counts[state]={catalogCount:0,originalQuestionCount:0}
  counts[state].catalogCount++;counts[state].originalQuestionCount+=x.originalResearchCandidateCount
  const key=String(grade)
  if(!graded[key])graded[key]={catalogCount:0,originalQuestionCount:0}
  graded[key].catalogCount++;graded[key].originalQuestionCount+=x.originalResearchCandidateCount
  return{catalogId:x.catalogId,catalogGradeClaim:x.gradeCatalogClaim,
   catalogSubjectClaim:x.subjectCatalogClaim,catalogMediumClaim:x.mediumCatalogClaim,
   sourceEditionLabel:x.editionCatalogLabel,
   declaredSourcePdfSha256:x.sourcePdfSha256,
   originalQuestionCount:x.originalResearchCandidateCount,
   originalQuestionRevisionSetSha256:x.originalQuestionRevisionSetSha256,
   catalogEditionClassification:state,
   ASSPS2026_27AdoptedEditionVerified:false,
   confirmedRelevantAnnualBoardExamYear:null,
   physicalSchoolTextbookExactEditionVerified:false,
   independentFacultyAnswerCheckComplete:false,
   academicallyApproved:false,studentPaperStudioSelectable:false}
 }).sort((a,b)=>a.catalogId.localeCompare(b.catalogId))
 if(records.length!==111||
    records.reduce((s,r)=>s+r.originalQuestionCount,0)!==2581||
    counts.CATALOG_LABEL_EXPLICIT_2026_27_BUT_ASSPS_ADOPTION_UNKNOWN?.originalQuestionCount!==599||
    counts.CATALOG_LABEL_2025_26_ASSPS_2026_27_APPLICABILITY_UNKNOWN?.originalQuestionCount!==844||
    counts.CROSS_GRADE_NO_ASSPS_CLASS_CERTIFICATE?.originalQuestionCount!==70)
   fail('EXACT_SOURCE_LABEL_COUNTS_CHANGED')
 return{schemaVersion:'assps-grade910-school-session-edition-year-source-risk-v1',
  originalResearchCandidates:2581,sourceCatalogRecords:111,academicSchoolSessionBeingEvaluated:'2026-27',
  onlyPublicationIssuerLabel2026_27NotSchoolAdoption:599,
  originalQuestionsWithGradeIXCatalog2025_26Label:844,
  officialSessionNoticeReference:'https://pectaa.edu.pk/downloads-2-2/',
  officialSourceEbookReference:'https://pectaa.edu.pk/curriculum-compliance/',
  source2026AnnualExamALPNotAutomaticallyExam2027:true,
  recordCountsByEditionStatus:counts,recordCountsByGradeClaim:graded,
  originalSourceRevisionSetSha256:h(records.map(x=>x.catalogId+':'+x.originalQuestionRevisionSetSha256).join('\n')),
  actualSchoolAdoptedBookEvidenceCount:0,teacherAnswerCorrectnessVerifiedCount:0,
  academicallyApproved:0,verifiedPublished:0,paperStudioSelectable:0,
  warning:'2026-27 issuer edition labels, 2025-26 grade IX references, September 2026 date labels and current or historical labels are NOT independent certification of school adoption or board-examination-year applicability.',
  records}
}
function markdown(x){return[
 '# ASSPS IX-X — Actual school textbook year and board-exam applicability REVIEW queue','',
 'Official PECTAA ebook catalog: https://pectaa.edu.pk/curriculum-compliance/',
 'PECTAA downloads list session-2026-27 textbook/security-label publications: https://pectaa.edu.pk/downloads-2-2/',
 '', '**599 provisional candidate questions** refer to book records explicitly labelled **2026-27**, but NONE has the ASSPS institution-signed adopted-book certificate.',
 '**844 original Grade IX question references** use a catalogue edition labelled **2025-26**. These are not automatically invalid for academic session 2026-27, but require school coordinator and current board-year confirmation.',
 'The cross-grade shared Urdu writing catalog has **70 originals** requiring school grade-specific applicability.',
 'A publisher year, book-print date, PECTAA catalogue link and Annual Examination date are different facts; do not conflate them.',
 'The revised Grade IX 07 Nov 2025 ALP explicitly concerns Annual Examination 2026 and does not automatically establish applicability to Annual Examination 2027.',
 '', 'Real adopted-book approvals 0. Real qualified answer approvals 0. Verified published 0. Paper Studio picker release HOLD.',
 '', 'Complete 111-catalog evidence ledger: ASSPS_GRADE910_2026_27_CATALOG_EDITION_APPLICABILITY_QUEUE_20261012.json',''].join('\n')}
function write(){const r=make();fs.writeFileSync(OUT,JSON.stringify(r,null,2)+'\n')
 fs.writeFileSync(NOTE,markdown(r))
 return{originalResearchCandidates:2581,explicit2026_27LabelQuestionCount:599,
  prior2025_26GradeIXQuestionCount:844,schoolAdoptionVerified:0}}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():make()))
module.exports={make,markdown,write,OUT,NOTE,category}
