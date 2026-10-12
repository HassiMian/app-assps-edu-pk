#!/usr/bin/env node
'use strict'
// Academic contract evidence only, no Paper Studio owner source or signed school approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const faculty=require('./build-grade910-one-faculty-quality-worklist.cjs')
const pdf=require('./attest-grade910-original-pdf-lineage.cjs')
const legacy=require('./propose-grade910-original-metadata-remediation.cjs')
const adoption=require('./build-grade910-school-adoption-verification-matrix.cjs')
const HOME=path.resolve(__dirname,'../../docs/question-bank')
const OUT=path.join(HOME,'ASSPS_GRADE910_PAPER_STUDIO_PENDING_SIGNATURE_CONTRACT_20261012.json')
const REPORT=path.join(HOME,'ASSPS_GRADE910_PAPER_STUDIO_REVIEW_GATE_HANDOFF_20261012.md')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('ASSPS_PAPER_STUDIO_ACADEMIC_CONTRACT_'+x)}
function row(q){
 if(!q||!/^[0-9a-f]{64}$/.test(q.originalQuestionRevisionSha256||'')||
  !/^[0-9a-f]{64}$/.test(q.originalSourceFileSha256||'')||
  q.academicallyApproved!==false||q.verifiedPaperStudioSelectable!==false)
  fail('RESEARCH_REVISION_OR_APPROVAL_IDENTITY_DRIFT')
 return{originalQuestionId:q.originalQuestionId,
  originalQuestionRevisionSha256:q.originalQuestionRevisionSha256,
  originalSourceFileSha256:q.originalSourceFileSha256,
  gradeClaim:q.gradeClaim,subjectClaim:q.subjectClaim,mediumClaim:q.mediumClaim,
  type:q.questionType,marksClaim:q.marks,originalCatalogRecordId:q.originalSourceCatalogId,
  lifecycle:'RESEARCH_CANDIDATE',
  finalQuestionAndAnswerReviewSignature:null,
  schoolAdoptedEditionAndExamYearVerified:false,
  independentQualifiedAnswerCorrectnessVerified:false,
  authenticatedSchoolAcademicApproval:false,
  paperStudioVerifiedSelectable:false,academicPublished:false}
}
function build(){
 const source=faculty.build(),lineage=JSON.parse(fs.readFileSync(pdf.OUT,'utf8')),
  proposals=legacy.build(),books=adoption.build()
 if(source.researchOriginalCandidates!==2581||source.independentlyApproved!==0||
  lineage.originalCandidates!==2581||
  lineage.candidateStatusCounts.ORIGINAL_PDF_SHA_EXACT_BYTE_VERIFIED!==2537||
  lineage.candidateStatusCounts.ORIGINAL_QUESTION_PDF_SHA_NOT_DECLARED!==44)
  fail('FROZEN_SOURCE_AND_PDF_EVIDENCE_DRIFT')
 if(books.originalCandidates!==2581||books.schoolAdoptionCertificatesAuthenticated!==0||
   books.catalogReferencedByOriginals!==56)fail('INSTITUTIONAL_ADOPTION_CERTIFICATION_NOT_PRESENT')
 const byBook=new Map(books.rows.map(b=>[b.catalogId,b]))
 const byId=new Map(proposals.rows.map(p=>[p.originalQuestionId,p]))
 const rows=source.rows.map(q=>{
  const r=row(q),p=byId.get(r.originalQuestionId),book=byBook.get(r.originalCatalogRecordId)
  if(!book||book.actualSchoolAdoptedBookVerified!==false)
   fail('UNREVIEWED_SCHOOL_BOOK_AUTO_ACCEPTED')
  r.schoolAdoptionCatalogGradeUnassigned=book.gradeCatalogClaim===0
  r.sourceEvidenceObjectBytesIndependentlyVerifiedForQuestion=false
  if(p){
   if(p.originalQuestionRevisionSha256!==r.originalQuestionRevisionSha256||
      p.originalSourceFileSha256!==r.originalSourceFileSha256)fail('LEGACY_SOURCE_PROPOSAL_SHA_DRIFT')
   r.pendingHumanLegacyMetadataProposal={grade:p.academicResearchProposalOnly.grade,
    subject:p.academicResearchProposalOnly.subject,medium:p.academicResearchProposalOnly.medium,
    tentativeLegacyMcqPosition:p.academicResearchProposalOnly.originalMcqPositionFromMatchingAnswerText,
    independentReviewerRequired:true,automaticallyAppliesToPaperStudio:false}
  }
  return r
 }).sort((a,b)=>a.originalQuestionId.localeCompare(b.originalQuestionId))
 if(rows.length!==2581||new Set(rows.map(x=>x.originalQuestionId)).size!==2581)
  fail('DUPLICATED_CANDIDATE_IDS')
 const digest=SHA(rows.map(r=>r.originalQuestionId+':'+r.originalQuestionRevisionSha256+':'+r.originalSourceFileSha256).join('\n'))
 return{schemaVersion:'assps-grade910-original-to-paperstudio-academic-handoff-v1',
  academicOwner:'ASSPS Grade IX-X Academic Master',paperStudioOwner:'Paper Studio Master',
  tenantAndProductionOwner:'SaaS Core & Production Master',
  originalQuestionCount:2581,allOriginalRevisionSetSha256:digest,
  catalogEntriesAwaitingRealASSPSBookAdoption:56,
  crossGradeUrduOriginalsAwaitingTextbookGradeResolution:70,
  realSchoolAdoptionObjectBytesIndependentlyAuthorized:0,
  requireActualShaVerifiedPrivateEvidenceObjects:true,
  questionPdfDigestByteMatching:2537,questionPdfDigestUnstated:44,
  researchMetadataProposalsAwaitIndependentReview:50,
  originalLegacyMcqPositionProposalsAwaitTeacherReview:24,
  originalBilingualBiologyQuestionProposalsAwaitUrduReview:2,
  trustedHumanApprovals:0,academicallyApproved:0,academicallyPublished:0,
  teacherVerifiedSelectable:0,
  cannotPublishWithoutRealInstitutionApproval:true,
  requiredServerGates:[
   'School adoption: actual grade, subject, medium, edition, academic session and board year',
   'Verified physical printed page only when textbook exercise origin is claimed',
   'Independent qualified subject reviewer and accurate answer/option/marks',
   'Urdu specialist equivalence when Urdu or bilingual content',
   'Final question revision SHA and final answer revision SHA with independent institutional signed review',
   'School-pinned authenticated reviewer and school-approver signatures',
   'Actual tenant-specific authenticated server RLS and approved-only versioned picker',
   'Paper Studio integration acceptance and independent SaaS Core release certification'
  ],
  provisionalContentTextIncluded:false,productionWritePermitted:false,
  releaseDecision:'DENY_PENDING_AUTHENTICATED_FACULTY_AND_SCHOOL_ACCEPTANCE',
  rows}
}
function render(r){
 return ['# ASSPS IX-X Academic to Paper Studio and SaaS Core approved-only contract','',
  'Every one of the 2,581 original question revisions is immutable and remains a RESEARCH CANDIDATE, not selectable as academically verified.',
  '','Original question ID + revision SHA + original source file SHA set: '+r.allOriginalRevisionSetSha256,
  '','2,537 questions explicitly match original-source PDF SHA hashes against locally byte-reverified PDFs; 44 legacy English originals lack question-level PDF hash claims.',
  'This does not prove physical printed exercise/page mapping or school adoption and does not validate answer correctness.',
  '56 used source catalog books have zero ASSPS-certified textbook adoption records. One shared-grade Urdu writing source supports 70 original questions and needs exact grade applicability verification.',
  'Signed school academic packet evidence SHA claims must match actual owner-private content-addressed evidence bytes before school review can pass; content hashes are not independent human correctness or authority.',
  'Exactly 50 SHA-bound original language/medium/grade metadata correction proposals are pending independent review, including 24 legacy option-position proposals and two bilingual Biology originals. All proposals are explicitly nonapplicable to the verified question picker without signed qualified review.',
  '','Paper Studio owner must enforce an approved-only server-side tenant-scoped snapshot contract. Client-supplied approved booleans, URL source metadata and synthetic signatures may not authorize verified publication.',
  '','The signed institution review remains an external human and school authority gate. Real approvals = 0; verified published = 0; production deployment = false.',
  '','Release ownership: Academic Master owns source and academic accuracy; Paper Studio owns teacher picker/export; SaaS Core owns RLS and production.',''].join('\n')
}
function write(){const r=build();fs.writeFileSync(OUT,JSON.stringify(r,null,2)+'\n')
 fs.writeFileSync(REPORT,render(r));return{originals:2581,sourceSetSha256:r.allOriginalRevisionSetSha256,approved:0,picker:0}}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build()))
module.exports={row,build,render,write,OUT,REPORT}
