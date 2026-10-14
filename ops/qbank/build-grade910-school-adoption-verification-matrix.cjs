#!/usr/bin/env node
'use strict'
// Public catalogue PDF identity is NOT school-adopted textbook certification.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const lineage=require('./attest-grade910-original-pdf-lineage.cjs')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_SCHOOL_ADOPTION_111_CATALOG_CLAIMS_20261012.json')
const NOTE=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_SCHOOL_ADOPTION_APPROVAL_DECISIONS_20261012.md')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('GRADE910_SCHOOL_ADOPTION_MATRIX_'+x)}
function build(){
 const p=JSON.parse(fs.readFileSync(lineage.OUT,'utf8'))
 if(p.originalCandidates!==2581||p.catalogs.length!==111||p.cachedPdfByteHashMatches!==110||
  p.missingIndividualQuestionPdfShaClaim!==44)fail('SOURCE_PDF_PROVENANCE_CHANGED')
 const refs=new Map()
 for(const r of p.rows){
  if(!refs.has(r.declaredSourceCatalogRecordId))refs.set(r.declaredSourceCatalogRecordId,[])
  refs.get(r.declaredSourceCatalogRecordId).push(r)
 }
 const rows=p.catalogs.map(s=>{
  const q=refs.get(s.recordId)||[],warnings=[]
  if(q.length!==s.originalQuestionReferences)fail('CATALOG_ORIGINAL_QUESTION_COUNT_DRIFT')
  if(s.grade===0)warnings.push('NON_GRADE_SPECIFIC_CATALOG_ENTRY')
  if(s.sourceByteStatus!=='BYTE_SHA256_MATCH')warnings.push('UNVERIFIED_CATALOG_PDF_BYTES')
  if(String(s.publishedEditionLabel).includes('2025-26'))
   warnings.push('2025_26_NOT_AUTOMATICALLY_ASSPS_2026_27')
  const missing=q.filter(x=>x.candidateByteLineageStatus==='ORIGINAL_QUESTION_PDF_SHA_NOT_DECLARED').length
  if(missing)warnings.push('QUESTION_LEVEL_PDF_DIGEST_ABSENT')
  return{catalogId:s.recordId,gradeCatalogClaim:s.grade,subjectCatalogClaim:s.subject,
   mediumCatalogClaim:s.medium,editionCatalogLabel:s.publishedEditionLabel,
   sourcePdfSha256:s.sha256,byteSourceStatus:s.sourceByteStatus,
   originalResearchCandidateCount:q.length,
   originalQuestionPdfShaMissing:missing,
   originalQuestionRevisionSetSha256:SHA(q.map(x=>x.originalQuestionId+':'+x.originalQuestionRevisionSha256).sort().join('\n')),
   warnings,actualSchoolAdoptedBookVerified:false,
   academicSchoolSession:'2026-27',realAcademicCoordinatorId:null,
   schoolAdoptionEvidenceSha256:null,schoolActualMedium:null,
   applicableBoardExamYear:null,physicalTextbookExercisePagesChecked:false,
   qualifiedSubjectTeacherReviewed:false,verifiedPaperStudioSelectable:false}
 })
 const used=rows.filter(x=>x.originalResearchCandidateCount>0),no=rows.filter(x=>x.originalResearchCandidateCount===0),
  crossGrade=used.filter(x=>x.gradeCatalogClaim===0)
 if(used.length!==56||no.length!==55||crossGrade.length!==1||
  crossGrade[0].originalResearchCandidateCount!==70||
  rows.reduce((n,r)=>n+r.originalResearchCandidateCount,0)!==2581)
  fail('CATALOG_FACULTY_ADOPTION_COHORT_DRIFT')
 return{schemaVersion:'assps-grade910-school-textbook-adoption-queue-v1',
  originalCandidates:2581,catalogEntries:111,catalogReferencedByOriginals:56,
  catalogUnreferencedByOriginals:55,
  sharedGradeUnassignedCatalogOriginals:70,
  catalogGradeUnassignedUsedId:crossGrade[0].catalogId,
  originalsWithMissingOwnPdfSha256:44,
  schoolAdoptionCertificatesAuthenticated:0,
  gradeAndSubjectBookEditionSchoolVerified:0,
  reviewedSchoolApplicableExamYear:null,
  approvedQuestions:0,publishedQuestions:0,publisherSelectable:0,
  note:'Real school coordinator must independently attest actual textbooks/medium/session and board year. Cached PDF SHA or publicly published edition never proves school adoption, physical textbook page or answer correctness.',
  rows}
}
function markdown(x){return [
 '# Grade IX-X — Actual ASSPS textbook adoption decision queue','',
 '**111 public candidate catalogue records, but NO verified ASSPS adoption certificates.**',
 '56 catalog entries have source links from original questions (2,581 candidate IDs), 55 have no original question references.',
 'One used grade-unspecified catalog '+x.catalogGradeUnassignedUsedId+' refers to **70 Urdu writing original questions**; do not automatically assign its book to Grade IX or X.',
 '44 legacy English originals lack explicit question-level PDF SHA256; PDF matching alone cannot fix missing provenance.',
 'A 2025-26 catalogue label does not mean the school adopted it for 2026-27. The 7 Nov 2025 revised Grade IX notice applies to Annual Examination 2026, not necessarily 2027.',
 'Every school adoption field remains false or null; the principal/academic coordinator must verify actual book edition, medium and board scheme.',
 '**Approved 0, published 0, Paper Studio verified picker 0.**',''].join('\n')}
function write(){const x=build()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(NOTE,markdown(x))
 return{originals:2581,catalog:111,used:56,crossGradeOriginals:70,approved:0}}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build()))
module.exports={build,markdown,write,OUT,NOTE}
