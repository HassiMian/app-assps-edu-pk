#!/usr/bin/env node
'use strict'
// Real institutional publication gate. It NEVER turns research, simulated signatures,
// unsigned faculty forms, or Core QA into a production release authority.
const fs=require('node:fs'),path=require('node:path')
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const faculty=require('./aggregate-grade910-offline-faculty-decisions.cjs')
const signed=require('./reconcile-grade910-teacher-response-to-signed-school-packet.cjs')
const adoption=require('./build-grade910-school-adoption-verification-matrix.cjs')
const paper=require('./attest-grade910-paper-studio-publisher-boundary.cjs')
const coreObservation=require('./attest-grade910-core-live-readonly-observation.cjs')
const ROOT=path.resolve(__dirname,'../..')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_AUTHENTIC_INSTITUTIONAL_PUBLICATION_NO_GO_20261013.json')
const REPORT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ACTUAL_SCHOOL_REVIEW_PRODUCTION_ACCEPTANCE_20261013.md')
const deny=x=>{throw Error('ASSPS_GRADE910_INSTITUTIONAL_RELEASE_'+x)}
function ready(env=process.env){
 const baseline=original.loadInputs()
 original.assertFrozen(baseline)
 const books=adoption.build()
 const contract=paper.build()
 const index=faculty.originalIndex()
 if(index.size!==2581||books.originalCandidates!==2581||
  books.catalogReferencedByOriginals!==56||contract.originalQuestionCount!==2581||
  contract.teacherVerifiedSelectable!==0)
  deny('QUESTION_SOURCE_ADOPTION_COHORT_DRIFT')
 let submitted=0,verifiedTeacherEvidence=0
 if(env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR){
  const read=faculty.aggregate({reviewDir:env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR})
  submitted=read.unsignedTeacherResponsesReceived
  if(read.academicallyApproved!==0||read.verifiedPublished!==0)
   deny('UNSIGNED_REVIEW_WRONGLY_APPROVED')
 }
 // School signature verification is only invoked when the coordinator actually
 // provisions its trust inputs. The existing signing validator is authoritative.
 const signKeys=['ASSPS_ACADEMIC_SCHOOL_ROOT_PUBKEY_PATH',
  'ASSPS_ACADEMIC_SIGNED_REVIEW_BUNDLE_PATH','ASSPS_ACADEMIC_TRUSTED_ROOT_SPKI_SHA256',
  'ASSPS_ACADEMIC_SCHOOL_TENANT_ID','ASSPS_ACADEMIC_REVIEW_VERIFICATION_AT']
 const provided=signKeys.filter(k=>typeof env[k]==='string'&&env[k].length)
 if(provided.length!==0&&provided.length!==5)
  deny('PARTIAL_REAL_SCHOOL_ROOT_AND_SIGNED_BUNDLE_MUST_FAIL_CLOSED')
 if(provided.length===5){
  if(!env.ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR||!env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR)
   deny('SIGNED_SCHOOL_EVIDENCE_AND_REAL_FACULTY_INPUT_REQUIRED')
  // Avoid rewriting process.env in code by passing supported explicit connector args.
  const signedRecords=signed.loadReconciled({
   privateTeacherDirectory:env.ASSPS_QBANK_FACULTY_SUBMISSIONS_DIR,
   rootPublicKeyFile:env.ASSPS_ACADEMIC_SCHOOL_ROOT_PUBKEY_PATH,
   reviewBundleFile:env.ASSPS_ACADEMIC_SIGNED_REVIEW_BUNDLE_PATH,
   rootFingerprint:env.ASSPS_ACADEMIC_TRUSTED_ROOT_SPKI_SHA256,
   tenantId:env.ASSPS_ACADEMIC_SCHOOL_TENANT_ID,
   at:env.ASSPS_ACADEMIC_REVIEW_VERIFICATION_AT,
   evidenceObjectDirectory:env.ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR
  })
  verifiedTeacherEvidence=signedRecords.signedSchoolPacketsCryptographicallyAndEvidenceByteVerified
  if(signedRecords.paperStudioVerifiedSelectable!==false||signedRecords.academicallyPublished!==0)
   deny('SIGNED_SCHOOL_PACKET_MUST_NOT_BE_CONFLATED_WITH_PRODUCTION')
 }
 const used=books.rows.filter(x=>x.originalResearchCandidateCount>0)
 const adopted=used.filter(x=>x.actualSchoolAdoptedBookVerified===true||
   x.schoolAdoptionEvidenceSha256!==null)
 if(adopted.length!==0)deny('UNTRUSTED_LOCAL_SCHOOL_ADOPTION_SELF_ASSERTION')
 const coreEvidence=env.ASSPS_QBANK_CORE_READONLY_OBSERVATION_PATH?
  coreObservation.inspect(env.ASSPS_QBANK_CORE_READONLY_OBSERVATION_PATH):null
 const blockers=[
  {id:'ASSPS_ADOPTED_TEXTBOOK_EDITION_AND_MEDIUM',
   status:'UNVERIFIED',count:used.length,
   owner:'Actual ASSPS academic coordinator/principal',
   evidenceNeeded:'Signed institution-specific 2026-27 grade, subject, medium, edition and physical chapter/page adoption record'},
  {id:'QUALIFIED_INDEPENDENT_SUBJECT_AND_URDU_REVIEW',
   status:verifiedTeacherEvidence===2581?'SUBJECT_SIGNATURES_PRESENT_CONTENT_AUTHORITY_STILL_UNVALIDATED':'NOT_AUTHENTICATED_FOR_COMPLETE_2581_COHORT',
   count:2581-verifiedTeacherEvidence,
   owner:'Independent qualified subject and Urdu teachers',
   evidenceNeeded:'Question-by-question reviewed final answer/MCQ key, marks, grade, translation, source correctness and authentic revision-bound school signature'},
  {id:'ORIGINALS_HELD_OR_WITH_MISSING_METADATA',
   status:'OPEN',count:1,
   owner:'Specialist subject teacher',
   evidenceNeeded:'Separately held original Chemistry review; additionally resolve 44 grade/chapter and 50 medium source claims'},
  {id:'PAPER_STUDIO_RUNTIME_VERIFIED_ONLY_ACCEPTANCE',
   status:'OWNER_ACCEPTANCE_NOT_INDEPENDENTLY_EVIDENCED',count:1,
   owner:'Paper Studio Master',
   evidenceNeeded:'Tenant-scoped approved immutable revision selector, authenticated teacher Save/Open/Print and Urdu parity certification'},
  {id:'SAAS_CORE_LIVE_PRODUCTION_RLS_RELEASE_CERTIFICATE',
   status:coreEvidence?'HOLD_FRESH_STAGED_GREEN_BUT_NOT_ACTIVE':'HOLD_UNVERIFIED_CORE_RELEASE_CERTIFICATE',count:1,
   owner:'SaaS Core & Production Master',
   evidenceNeeded:'Core must independently certify active non-bypass signed runtime 77/77, tenant school JWT acceptance, Paper owner/restore ACL and rollback, real staff signoff and actual production cutover. Dormant green77 is not live cutover.'}
 ]
 return{schemaVersion:'assps-grade910-authentic-school-publication-gate-v1',
  auditedAsOf:'2026-10-12',originalImmutableCandidates:2581,
  sourceCatalogsRequiringASSPSDecision:56,
  actualAdoptedCatalogDocumentsVerified:0,
  realFacultyResponsesSubmitted:submitted,
  signedSchoolCryptographicAndEvidenceByteReceipts:verifiedTeacherEvidence,
  actuallyApprovedAcademicQuestionRevisions:0,
  paperStudioAcademicallyVerifiedSelectable:0,
  academicQuestionPublished:0,
  deployedByThisTask:false,
  productionSecurityLastIndependentIssueComment:'https://github.com/HassiMian/app-assps-edu-pk/issues/4#issuecomment-6137957891',
  currentCoreObservationEvidence:coreEvidence,
  coreLiveStagedGreenGuards:coreEvidence?.greenCoreSignedStagedGuards??null,
  coreActiveLegacyRuntimeSignedGuards:coreEvidence?.activeLegacyCoreSignedGuards??null,
  coreActiveLegacyLoginBypassRlsObserved:coreEvidence?.activeLegacyDbLoginHasBypassRls??null,
  productionSecurityReportedSignedGuards:coreEvidence?
   `active=${coreEvidence.activeLegacyCoreSignedGuards}/77; staged_green=${coreEvidence.greenCoreSignedStagedGuards}/77; released=false`:
   'UNVERIFIED_FROM_FRESH_PRIVATE_CORE_OBSERVATION; HOLD',
  releaseStatus:'DENIED_AUTHENTIC_HUMAN_AND_CORE_RELEASE_EVIDENCE_MISSING',
  gateAllowedToPromoteDrafts:false,
  machineQASuccessCannotOverrideInstitutionalBlocks:true,
  blockers,
  note:'A signed test fixture, empty teacher form, official web textbook link, privately computed PDF SHA, or externally unverified boolean can never create real human academic approval. Academic Master cannot certify SaaS Core live RLS.'
 }
}
function markdown(x){
 return ['# ASSPS Grade IX-X — Actual institution-level final publication certification','',
  '**RELEASE DENIED.** Green engineering QA is not qualified school textbook adoption, independent teacher academic approval or safe production certification.',
  '','Immutable original research questions: **'+x.originalImmutableCandidates+
  '**. ASSPS textbook-source catalog decision groups: **'+x.sourceCatalogsRequiringASSPSDecision+
  '**. School adoption certificates verified: **0**.',
  'Independent private teacher submissions received: **'+x.realFacultyResponsesSubmitted+
  '**. Cryptographically bound signed school subject-review receipts: **'+x.signedSchoolCryptographicAndEvidenceByteReceipts+
  '**. Final academically approved revisions: **0**. Published: **0**.',
  '','Latest 13 October 2026 Core read-only observation (if configured): '+x.productionSecurityReportedSignedGuards+'. The staged green runtime may have 77/77 restrictive signed guards and the legacy login BYPASSRLS flag may have been cleared, but signed guards on the still-active runtime remain 0/77 and production routing/real authorized staff acceptance remain pending. This is observation, NOT a signed Core owner release certificate.',
  '','Actual remaining owner gates:','',
  ...x.blockers.map(b=>'- '+b.id+' — **'+b.status+'** — '+b.owner+': '+b.evidenceNeeded),
  '','Real adoption book certificates and actual independent teacher-signing credentials are not in the available school project/Drive records; generic permission does not substitute for qualified individual verification.',
  '','All existing original authorship, finished papers, tenant data and production deploys are untouched. This fail-closed release gate must remain separate from green engineering unit tests.',
  '','Referenced current SaaS Core issue evidence: '+x.productionSecurityLastIndependentIssueComment,
  ''].join('\n')
}
function write(env=process.env){
 const x=ready(env)
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(REPORT,markdown(x))
 return x
}
if(require.main===module){
 try{
  const report=process.argv.includes('--write')?write():ready()
  console.log(JSON.stringify({status:report.releaseStatus,
   originalCandidates:report.originalImmutableCandidates,
   schoolBookDecisionsPending:report.sourceCatalogsRequiringASSPSDecision,
   teacherSubmissions:report.realFacultyResponsesSubmitted,
   realSchoolSignedReceipts:report.signedSchoolCryptographicAndEvidenceByteReceipts,
   academicallyApproved:0,verifiedPublished:0,coreSecurity:report.productionSecurityReportedSignedGuards,
   safeRelease:false}))
  process.exitCode=3 // Intentional actual release NO-GO, not broken test or completed academic certification.
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={ready,markdown,write,OUT,REPORT}
