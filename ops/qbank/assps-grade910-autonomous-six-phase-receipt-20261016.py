#!/usr/bin/env python3
"""One authoritative Grade IX-X phase checkpoint from read-only machine evidence.

No permissions to change question approval or edition adoption. Never
manufacture reviewer decisions or a green academic publication certificate.
"""
from __future__ import annotations
import datetime as dt
import json
import os
from pathlib import Path
import tempfile

SOURCE_DIR=Path("/var/lib/assps-grade910-sourceclaims")
TECH=Path("/var/lib/assps-technical-self-verification/latest.json")
ACADEMIC=Path("/var/lib/assps-grade910-weekly-qa/latest.json")
OUT=SOURCE_DIR/"autonomous-six-phase-checkpoint.json"

def read(path:Path):
    return json.loads(path.read_text(encoding="utf8")) if path.exists() else None

def evaluate(technical, weekly, source, held, pdf, text, ocr_pilot, full_ocr, answer, ocr_progress=None, live_collisions=None, adoption_inventory=None, review_delta=None, tenant_rls=None, revision_history=None, numerical_evidence=None):
    if not all(isinstance(x,dict) for x in (technical,weekly,source,held,pdf,text,ocr_pilot,answer)):
        raise ValueError("MANDATORY_MACHINE_EVIDENCE_MISSING")
    src=source.get("summary") or {}
    physical=pdf.get("summary") or {}
    txt=text.get("summary") or {}
    ocr=(ocr_pilot.get("summary") or {})
    qa=(weekly.get("academicSourceChecks") or {})
    candidates=answer.get("liveCandidateRows")
    unapproved=answer.get("unapprovedProvisionalRows")
    if candidates!=2411 or src.get("rows")!=2411:
        raise ValueError("CANDIDATE_CORPUS_INVENTORY_DRIFT")
    if held.get("sourceIdsNotInLive")!=170:
        raise ValueError("SOURCE_TO_LIVE_ORIGINAL_CROSSWALK_DRIFT")
    if unapproved!=2411 or answer.get("unexpectedApprovedWithoutAuthenticatedReviewerEvidence")!=0:
        raise ValueError("APPROVED_STATUS_WITHOUT_AUTHENTICATED_REVIEW_EVIDENCE")
    if physical.get("pdfPageCountConflicts")!=0 or physical.get("authorPageClaimsOutsideActualPdfRange")!=0:
        raise ValueError("PDF_SOURCE_PAGE_BOUNDS_REGRESSION")
    if answer.get("substantiveOrStructuralAnswerConflicts")!=0 or answer.get("recordCompletenessIssues")!={}:
        raise ValueError("LIVE_ANSWER_MAPPING_REGRESSION")
    source_integrity=(src.get("cachedPdfHashesMatchingManifest")==56 and src.get("cachedPdfHashesConflicting")==0
                    and physical.get("catalogPdfFilesVerified")==56 and physical.get("originalAuthorPageClaims")==998)
    source_text=(txt.get("claimsChecked")==998 and txt.get("independentlyVerifiedQuestionPages")==0
                 and txt.get("productionDatabaseWrites")==0)
    ocr_pilot_ok=(ocr.get("pagesScannedNow")==6 and ocr.get("claimsCoveredNow")==111
                  and ocr.get("independentQuestionContentPagesVerified")==0
                  and ocr.get("publishedQuestions")==0)
    full_ocr_done=bool(full_ocr and (full_ocr.get("summary") or {}).get("scope")=="ALL_ELIGIBLE_ENGLISH_SCANNED_PAGES"
                       and (full_ocr.get("summary") or {}).get("pagesScannedNow")==
                           (full_ocr.get("summary") or {}).get("uniquePagesEligibleForLastResortOCR")
                       and (full_ocr.get("summary") or {}).get("productionDatabaseWrites")==0)
    progressPages=0
    progressClaims=0
    if ocr_progress is not None:
        if (ocr_progress.get("schema")!="ASSPS_GRADE910_OCR_RESUME_V1"
                or ocr_progress.get("academicApproved") is not False
                or ocr_progress.get("published") is not False
                or ocr_progress.get("rawTextPersisted") is not False):
            raise ValueError("OCR_PROGRESS_UNTRUSTED_OR_FALSELY_PUBLISHED")
        pages=ocr_progress.get("completedPages")
        covered=ocr_progress.get("results")
        if not isinstance(pages,list) or not isinstance(covered,list) or len(set(pages))!=len(pages) or len(pages)>112:
            raise ValueError("OCR_PROGRESS_DUPLICATED_OR_UNBOUNDED")
        progressPages=len(pages)
        progressClaims=len(covered)
    if full_ocr_done:
        progressPages=112
    if live_collisions is not None:
        if (live_collisions.get('grade9And10Candidates')!=2411 or
            live_collisions.get('exactStemCollisionGroups')!=0 or
            live_collisions.get('exactStemDifferentAnswerGroups')!=0 or
            live_collisions.get('approvedQuestions')!=0 or
            live_collisions.get('sourceDatabaseWrites')!=0):
            raise ValueError('LIVE_DUPLICATE_OR_UNREVIEWED_APPROVAL_REGRESSION')
    if adoption_inventory is not None:
        if adoption_inventory.get('schema')!='ASSPS_SCHOOL1_VERSIONED_ADOPTION_EVIDENCE_INVENTORY_V1' or (
           adoption_inventory.get('schoolEditionAdoptionVerifiedByThisAudit') is not False) or (
           adoption_inventory.get('academicQuestionApprovalGained')!=0):
            raise ValueError('SCHOOL_ADOPTION_NOT_AUTHENTICALLY_VERIFIED')
    if review_delta is not None:
        if (review_delta.get('schema')!='ASSPS_GRADE910_2581_LIVE_SOURCE_EVIDENCE_DELTA_V1'
           or review_delta.get('originalResearchQuestionIds')!=2581
           or review_delta.get('liveProvisionalIds')!=2411
           or review_delta.get('protectedOriginalOnlyIds')!=170
           or review_delta.get('existingFacultyCohorts')!=56
           or review_delta.get('liveContentRevisionHashEntries')!=2411
           or review_delta.get('qualifiedFacultyDecisionsForged')!=0
           or review_delta.get('newlyApprovedQuestions')!=0
           or review_delta.get('verifiedPublisherSelectableQuestionsCreated')!=0):
            raise ValueError('FACULTY_REVIEW_DELTA_UNTRUSTED_OR_PUBLICATION_LEAK')
    if tenant_rls is not None:
        if (tenant_rls.get('schema')!='ASSPS_GRADE910_RESTRICTED_ROLE_QBANK_READ_ONLY_RLS_V1'
            or tenant_rls.get('crossTenantLeakCount')!=0
            or tenant_rls.get('school1PeerSchool5VisibleRows')!=0
            or tenant_rls.get('school5PeerSchool1VisibleRows')!=0
            or tenant_rls.get('noTenantContextVisibleRows')!=0
            or tenant_rls.get('forcedRLS') is not True
            or tenant_rls.get('CoreProductionSecurityCertificationGranted') is not False):
            raise ValueError('QUESTION_BANK_RESTRICTED_ROLE_TENANT_ISOLATION_REGRESSION')
    if revision_history is not None:
        if (revision_history.get('schema')!='ASSPS_GRADE910_LIVE_SHA_REVISION_CHANGE_HISTORY_V1'
            or revision_history.get('contentChangesObserved')!=len(revision_history.get('events',[]))
            or len(revision_history.get('lastSeenIdRevisionSha256',{}))!=2411
            or revision_history.get('academicReviewApprovalsFromJournal')!=0
            or revision_history.get('publishedQuestionsFromJournal')!=0
            or revision_history.get('everyChangedQuestionNeedsNewIndependentReview') is not True
            or revision_history.get('questionTextsPersisted') is not False):
            raise ValueError('LIVE_REVISION_HISTORY_APPROVAL_OR_ID_INTEGRITY_FAILED')
    if numerical_evidence is not None:
        if (numerical_evidence.get('schema')!='ASSPS_GRADE910_LIVE_NUMERICAL_REVISION_EVIDENCE_V1'
            or numerical_evidence.get('liveNumericals')!=80
            or numerical_evidence.get('liveNumericStemAndAnswerIdenticalToDeepOriginal')!=59
            or numerical_evidence.get('liveNumericalCurrentRevisionMissingDeepComputation')!=21
            or numerical_evidence.get('academicApprovals')!=0
            or numerical_evidence.get('productionDatabaseWrites')!=0
            or numerical_evidence.get('rawQuestionsOrAnswersStored') is not False):
            raise ValueError('NUMERICAL_LIVE_REVISION_OR_ACADEMIC_APPROVAL_EVIDENCE_REGRESSION')
    score=technical.get("metrics",{}).get("scores",{})
    integrity=technical.get("decision")=="OPERATIONAL" and score.get("total_score_rows",0)>=1763
    fullsuite_ok=(weekly.get("decision")=="QA_PASSED_NO_AUTOMATIC_ACADEMIC_PUBLICATION"
                  and qa.get("qualityVerified") is True
                  and qa.get("passedBatches")==30)
    mcq_ok=(answer.get("mcqCandidates")==809
            and answer.get("answerEqualsSelectedOptionExactly",0)+
                answer.get("terminalPunctuationOnlyDifferences",0)==809)
    phases=[
      {"phase":1,"title":"Checkpoint recovery and school-data protection",
       "status":"MACHINE_PASS" if integrity else "HOLD_LIVE_HEALTH_EVIDENCE",
       "evidence":"Current technical self-audit and exact zero-vs-null result aggregates"},
      {"phase":2,"title":"Official-source PDF integrity and actual page-content recovery",
       "status":"MACHINE_SOURCE_PASS_PAGE_CONTENT_PENDING" if source_integrity and source_text and ocr_pilot_ok else "HOLD_INCOMPLETE_SOURCE_EVIDENCE",
       "ocrFullCompleted":full_ocr_done,"ocrPagesCheckpointed":progressPages,
       "ocrPageClaimsCheckpointed":progressClaims,
       "ocrPagesRemaining":112-progressPages,
       "schoolVersionedAdoptionEvidenceChain":adoption_inventory.get("interpretation") if adoption_inventory else "NOT_AUDITED",
       "sourcePdfAssetsChecked":56,
       "claimsChecked":998,"independentVerifiedContentPages":0,
       "evidence":"SHA/page bounds, exact PDF text layer, and bounded English OCR pilot"},
      {"phase":3,"title":"Live Grade IX/X question and answer-key mechanical quality",
       "status":"MACHINE_PASS_NOT_SUBJECT_CORRECTNESS" if mcq_ok else "HOLD_MCQ_KEY_CONFLICT",
       "mcqsChecked":809,"actualQualifiedReviewDecisions":0,
       "evidence":"Read-only selected-option vs answer mapping, four-option structure and 2411 required academic metadata fields"},
      {"phase":4,"title":"Independent review evidence and approved-only publication firewall",
       "status":"SAFE_PUBLICATION_HOLD_EXPECTED",
       "signedIndependentRevisionApprovals":0,"publishedVerifiedQuestions":0,
       "existingFacultyCohortsReadyWithEvidence":review_delta.get('existingFacultyCohorts') if review_delta else 0,
       "liveQuestionRevisionsIndividuallySHA256Bound":review_delta.get('liveContentRevisionHashEntries') if review_delta else 0,
       "evidence":"170 private revision-bound unsigned forms, 2411 live provisional records, zero authentic review events"},
      {"phase":5,"title":"Paper Studio handoff and isolated integration QA",
       "status":"MACHINE_INTEGRATION_PASS_CORE_CUTOVER_NOT_CERTIFIED" if fullsuite_ok else "HOLD_FULL_QA_EVIDENCE",
       "fullQaBatchesPass":30 if fullsuite_ok else 0,
       "restrictedRoleTenantQBankReadOnlyEvidence":('PASS_NOT_REAL_STAFF_LOGIN_CERTIFICATION' if tenant_rls else 'NOT_AUDITED'),
       "evidence":"30-batch isolated source QA and approved-only data-contract tests; SaaS Core owns release"},
      {"phase":6,"title":"Production release certification and final report",
       "status":"TECHNICAL_EVIDENCE_STAGED_ACADEMIC_PUBLICATION_HOLD",
       "productionDbMutationCount":0,"productionDeployAuthorizedByAcademicAgent":False,
       "evidence":"One source-ledger, root-private machine receipts, no fabricated qualified teacher signatures"}
    ]
    return {
      "schema":"ASSPS_GRADE910_SIX_PHASE_AUTONOMOUS_MACHINE_CHECKPOINT_V1",
      "observedUTC":dt.datetime.now(dt.timezone.utc).isoformat(),
      "dataProtection":"READ_ONLY_NOT_A_RELEASE_OR_FACULTY_CERTIFICATE",
      "phaseCount":6,"phases":phases,
      "machinePassedPhases":sum(x["status"].startswith("MACHINE_PASS") or x["status"].startswith("MACHINE_SOURCE_PASS") or x["status"].startswith("MACHINE_INTEGRATION_PASS") for x in phases),
      "authenticIndependentAcademicApprovals":0,
      "academicVerifiedPublicationReady":False,
      "paperStudioAcademicallyApprovedSnapshotReady":False,
      "academicPublicationDecision":"BLOCK_UNVERIFIED_QUESTION_PUBLICATION",
      "actualQuestionContentPagesVerified":0,
      "ocrFullRunCompleted":full_ocr_done,
      "ocrResumablePagesCheckpointed":progressPages,
      "ocrResumablePageClaimsCheckpointed":progressClaims,
      "facultyReviewEvidenceCohorts":review_delta.get('existingFacultyCohorts') if review_delta else None,
      "liveQuestionRevisionHashes":review_delta.get('liveContentRevisionHashEntries') if review_delta else None,
      "independentlyReviewableLiveRevisionChangeEvents":revision_history.get("contentChangesObserved") if revision_history else None,
      "liveNumericalsMatchedToDeepRecomputedOriginal":numerical_evidence.get("liveNumericStemAndAnswerIdenticalToDeepOriginal") if numerical_evidence else None,
      "liveNumericalsStillNeedRevisionSpecificDeepRecomputation":numerical_evidence.get("liveNumericalCurrentRevisionMissingDeepComputation") if numerical_evidence else None,
      "everyChangedQuestionRevisionMustBeRereviewed":True,
      "questionBankCrossSchoolRlsDenied":tenant_rls.get("crossTenantLeakCount")==0 if tenant_rls else None,
      "liveQuestionDuplicateGroups":0 if live_collisions is not None else None,
      "unresolvedIndependentEvidence":["School-specific approved book edition and exact academic session adoption",
         "Question-revision and source-page/exercise content attribution",
         "Qualified independent academic subject and Urdu-language review per question revision",
         "Paper Studio/SaaS Core authorized release acceptance for actual approved snapshot"],
      "realStudentMarksChanged":False,"newPrinterJobsRequested":False
    }

def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    if path.parent.stat().st_mode & 0o077:raise ValueError("PRIVATE_RECEIPT_DIRECTORY_REQUIRED")
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix=".phase-")
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,"w") as f:
            json.dump(data,f,sort_keys=True,indent=2);f.write("\n");f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

if __name__=="__main__":
    p=evaluate(read(TECH),read(ACADEMIC),
               read(SOURCE_DIR/"latest.json"),read(SOURCE_DIR/"held170.json"),
               read(SOURCE_DIR/"physical-page-count.json"),
               read(SOURCE_DIR/"question-page-textlayer.json"),
               read(SOURCE_DIR/"ocr-pilot-20261016.json"),
               read(SOURCE_DIR/"ocr-fallback.json"),
               read(SOURCE_DIR/"live-answer-integrity.json"),
               read(SOURCE_DIR/"ocr-progress.json"),
               read(SOURCE_DIR/"live-stem-collisions.json"),
               read(SOURCE_DIR/"school-adoption-inventory.json"),
               read(SOURCE_DIR/"faculty-source-evidence-delta.json"),
               read(SOURCE_DIR/"tenant-rls-qbank-readonly.json"),
               read(SOURCE_DIR/"live-revision-history.json"),
               read(SOURCE_DIR/"live-numerical-evidence.json"))
    save(OUT,p)
    print(json.dumps({k:v for k,v in p.items() if k!="phases"},sort_keys=True))
    for row in p["phases"]:print(f"PHASE_{row['phase']}={row['status']}")
    if any(x["status"].startswith("HOLD_LIVE") or x["status"].startswith("HOLD_INCOMPLETE") or x["status"].startswith("HOLD_MCQ") or x["status"].startswith("HOLD_FULL") for x in p["phases"]):
        raise SystemExit("OPERATIONAL_GUARD_HOLD_NO_PRODUCTION_CHANGES")
