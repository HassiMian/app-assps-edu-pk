'use strict'
const SCHOOL_ADOPTIONS=require('../data/asspsGrade910SchoolAdoptions.json')
const SHA=/^[0-9a-f]{64}$/
const id=v=>String(v??'').trim()
const lower=v=>id(v).toLowerCase()
const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0
function error(code,message,status=422){
 const e=new Error(message);e.code=code;e.status=status;return e
}
function requireAdoptedSource({tenantId,source,evidence,grade,question},ledger=SCHOOL_ADOPTIONS){
 // No caller-controlled evidence may replace the server-owned adoption registry.
 if(!positive(tenantId)||Number(tenantId)!==ledger.schoolId)
  throw error('SCHOOL_ADOPTION_TENANT_NOT_TRUSTED','Trusted school scope is required.',403)
 if(ledger.schemaVersion!=='assps-grade910-school-adoption-registry-v1' ||
    ledger.schoolBookAndExamYearApplicabilityCertified!==true)
  throw error('SCHOOL_BOOK_ADOPTION_NOT_CERTIFIED','No school-approved textbook/exam-year adoption certificate exists.')
 const session=id(evidence.schoolAcademicSession),examYear=Number(evidence.boardExamYear)
 const adoptionId=id(evidence.schoolAdoptionId)
 if(!adoptionId||session!==ledger.teachingSession||!positive(examYear))
  throw error('SCHOOL_ADOPTION_CONTEXT_REQUIRED','Specific school adoption, session and board exam year are required.')
 const match=(ledger.verifiedAdoptions||[]).find(row=>
   row.id===adoptionId && Number(row.schoolId)===Number(tenantId) &&
   row.academicSession===session && Number(row.boardExamYear)===examYear &&
   Number(row.grade)===Number(grade) &&
   lower(row.subject)===lower(question.subject) &&
   lower(row.medium)===lower(question.medium) &&
   row.sourceRecordId===source.recordId &&
   row.sourcePdfSha256===source.pdfSha256 &&
   row.edition===source.edition)
 if(!match)throw error('SCHOOL_EDITION_NOT_ADOPTED','No exactly matching school-certified textbook adoption.')
 if(match.status!=='school_academically_certified' ||
    !SHA.test(id(match.schoolCertificateSha256)) ||
    !SHA.test(id(match.officialBookPdfSha256)) ||
    match.officialBookPdfSha256!==source.pdfSha256 ||
    !positive(match.schoolApproverUserId)||
    !positive(match.independentEditionVerifierUserId)||
    Number(match.schoolApproverUserId)===Number(match.independentEditionVerifierUserId)||
    !/^\d{4}-\d{2}-\d{2}T/.test(id(match.certifiedAt)))
  throw error('SCHOOL_ADOPTION_EVIDENCE_INCOMPLETE','Independent source and school adoption attestation incomplete.')
 return Object.freeze({adoptionId:match.id,schoolAcademicSession:session,boardExamYear:examYear})
}
module.exports={requireAdoptedSource,SCHOOL_ADOPTIONS}
