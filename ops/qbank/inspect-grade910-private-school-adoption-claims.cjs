#!/usr/bin/env node
'use strict'
// RESEARCH-ONLY intake of real school adoption CLAIMS. Verified bytes are not authenticated signoffs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const adoption=require('./build-grade910-school-adoption-verification-matrix.cjs');
const faculty=require('./aggregate-grade910-offline-faculty-decisions.cjs');
const evidence=require('./verify-grade910-physical-evidence-objects.cjs');
const SHA=/^[0-9a-f]{64}$/;
const fail=x=>{throw Error('GRADE910_ADOPTION_CLAIM_INTAKE_'+x)};
const isText=x=>typeof x==='string'&&x.trim()===x&&x.length>=1&&x.length<=250;
const knownKeys=new Set([
 'schemaVersion','sourceCatalogRecordId','sourceCatalogPdfSha256','originalQuestionRevisionSetSha256',
 'schoolSessionUnderReview','claimDisposition','schoolGradeClaim','schoolSubjectClaim',
 'schoolMediumClaim','schoolBookTitleClaim','schoolPrintedEditionClaim','boardExamYearClaim',
 'schoolAdoptionEvidenceSha256'
]);
function inspectClaim(x,source,evidenceDir){
 if(!x||typeof x!=='object'||Array.isArray(x)||
    Object.keys(x).some(k=>!knownKeys.has(k)))fail('INVALID_OR_PRIVILEGED_FIELD');
 if(x.schemaVersion!=='assps-grade910-school-adoption-claim-v1'||
    x.sourceCatalogRecordId!==source.catalogId||
    x.sourceCatalogPdfSha256!==source.sourcePdfSha256||
    x.originalQuestionRevisionSetSha256!==source.originalQuestionRevisionSetSha256||
    x.schoolSessionUnderReview!=='2026-27')
  fail('ORIGINAL_CATALOG_SHA_OR_SESSION_MISMATCH');
 if(!['adopted','not-adopted','needs-evidence'].includes(x.claimDisposition))
  fail('INVALID_RESEARCH_DISPOSITION');
 const adopted=x.claimDisposition==='adopted';
 if(adopted){
  if([9,10].includes(source.gradeCatalogClaim)&&x.schoolGradeClaim!==source.gradeCatalogClaim)fail("SOURCE_CATALOG_GRADE_MISMATCH");
  if(![9,10].includes(x.schoolGradeClaim)||
     !isText(x.schoolSubjectClaim)||
     !['english','urdu','dual'].includes(x.schoolMediumClaim)||
     !isText(x.schoolBookTitleClaim)||
     !isText(x.schoolPrintedEditionClaim)||
     !Number.isInteger(x.boardExamYearClaim)||
     x.boardExamYearClaim<2026||x.boardExamYearClaim>2035||
     !SHA.test(String(x.schoolAdoptionEvidenceSha256||'')))
   fail('ADOPTED_BOOK_CLAIM_FIELDS_INCOMPLETE');
  if(x.schoolSubjectClaim.trim().toLowerCase()!==source.subjectCatalogClaim.trim().toLowerCase())
    fail('SOURCE_CATALOG_SUBJECT_MISMATCH');
  const originalMedium=String(source.mediumCatalogClaim||'').trim().toLowerCase();
  if(['english','urdu'].includes(originalMedium)&&x.schoolMediumClaim!==originalMedium)
    fail('SOURCE_CATALOG_MEDIUM_MISMATCH');
  if(x.boardExamYearClaim!==2027)fail('SCHOOL_2026_27_BOARD_EXAM_YEAR_MISMATCH');
  // Missing original medium and cross-grade labels remain unresolved, not auto-certified.
  // Archived or cross-grade source labels cannot establish session/grade applicability.
  // An adoption claim with genuine evidence bytes stays UNAUTHENTICATED until real staff signing.
  if(!evidenceDir)fail('ACTUAL_PRIVATE_EVIDENCE_BYTES_REQUIRED');
  evidence.readObject(evidence.safeDirectory(evidenceDir),x.schoolAdoptionEvidenceSha256);
 }else if(x.schoolAdoptionEvidenceSha256!=null){
  fail('NONADOPTED_CLAIM_MUST_NOT_ASSERT_CERTIFICATE_BYTES');
 }
 return {catalogId:source.catalogId,claimDisposition:x.claimDisposition,
  sourceResearchCandidateReferences:source.originalResearchCandidateCount,
  adoptionEvidenceBytesMatched:adopted,
  originalCatalogGradeUnassigned:source.gradeCatalogClaim===0,
  originalCatalogMediumUnspecified:!["English","Urdu"].includes(source.mediumCatalogClaim),
  realSchoolAdoptionAuthorityAuthenticated:false,
  independentTeacherApprovalAuthenticated:false,
  academicallyApproved:0,paperStudioVerifiedSelectable:false};
}
function aggregate({claimDirectory,evidenceDirectory}){
 const dir=faculty.secureDir(claimDirectory),catalog=adoption.build();
 const byId=new Map(catalog.rows.filter(r=>r.originalResearchCandidateCount>0).map(r=>[r.catalogId,r]));
 const list=fs.readdirSync(dir,{withFileTypes:true}),records=[],seen=new Set();
 if(list.length>56)fail('TOO_MANY_OR_UNKNOWN_ADOPTION_CLAIMS');
 for(const ent of list){
  if(!ent.isFile()||ent.isSymbolicLink()||
    !/^pectaa-catalog-[0-9]{3}\.school-adoption-claim\.json$/.test(ent.name))
   fail('UNTRUSTED_PRIVATE_CLAIM_FILE');
  const expectedId=ent.name.slice(0,18),source=byId.get(expectedId);
  if(!source||seen.has(expectedId))fail('UNREFERENCED_OR_DUPLICATE_SOURCE_CATALOG');
  seen.add(expectedId);
  const name=path.join(dir,ent.name),stat=fs.lstatSync(name);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
     stat.uid!==process.getuid()||(stat.mode&0o077)!==0||
     stat.size<80||stat.size>16*1024)fail('UNSAFE_PRIVATE_CLAIM_BYTES');
  const nofollow=fs.constants.O_NOFOLLOW||0;
  const fd=fs.openSync(name,fs.constants.O_RDONLY|nofollow);
  let bytes;
  try{
    const st=fs.fstatSync(fd);
    if(st.ino!==stat.ino||st.dev!==stat.dev||st.nlink!==1||st.size!==stat.size)
      fail('CLAIM_CHANGED_DURING_OPEN');
    bytes=fs.readFileSync(fd);
  }finally{fs.closeSync(fd)}
  let item;
  try{item=JSON.parse(bytes.toString('utf8'))}catch(_){fail('INVALID_CLAIM_JSON')}
  const row=inspectClaim(item,source,evidenceDirectory);
  records.push({...row,privateClaimDigest:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 const counts={adopted:0,'not-adopted':0,'needs-evidence':0};
 for(const item of records)counts[item.claimDisposition]++;
 return {schemaVersion:'assps-grade910-untrusted-school-adoption-claims-v1',
  originalQuestionCount:2581,sourceCatalogsWithOriginals:56,
  adoptionClaimFilesReceived:records.length,unresolvedSchoolBookDecisions:56-records.length,
  untrustedClaimDispositions:counts,physicalEvidenceByteMatches:counts.adopted,
  gradeUnassignedCatalogRequiresHumanConfirmation:true,
  schoolAdoptionCertificatesAuthenticated:0,qualifiedHumanSignaturesAuthenticated:0,
  independentTeacherReviewsApproved:0,academicallyApproved:0,academicallyPublished:0,
  paperStudioVerifiedSelectable:0,productionWrite:false,
  releaseDecision:'HOLD_REQUIRES_AUTHENTICATED_SCHOOL_ADOPTION_AND_QUALIFIED_FACULTY',
  sourceBoundRows:records.sort((a,b)=>a.catalogId.localeCompare(b.catalogId))};
}
function run(env=process.env){
 const d=env.ASSPS_QBANK_PRIVATE_ADOPTION_CLAIMS_DIR;
 if(!d)return {privateSchoolClaimIntakeConfigured:false,schoolAdoptionCertificatesAuthenticated:0,
  academicallyApproved:0,published:0,releaseDecision:'HOLD'};
 return aggregate({claimDirectory:d,evidenceDirectory:env.ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR});
}
if(require.main===module)try{
 const x=run();
 console.log(JSON.stringify({privateSchoolClaimIntakeConfigured:!!process.env.ASSPS_QBANK_PRIVATE_ADOPTION_CLAIMS_DIR,
  adoptionClaimFilesReceived:x.adoptionClaimFilesReceived||0,
  physicalEvidenceByteMatches:x.physicalEvidenceByteMatches||0,
  authenticatedSchoolBookAdoptions:0,academicallyApproved:0,
  paperStudioVerifiedSelectable:false,releaseDecision:'HOLD'}));
}catch(e){console.error(e.message);process.exitCode=2}
module.exports={inspectClaim,aggregate,run};
