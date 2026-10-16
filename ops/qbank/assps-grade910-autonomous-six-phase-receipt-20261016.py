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

def evaluate(technical, weekly, source, held, pdf, text, ocr_pilot, full_ocr, answer, ocr_progress=None, live_collisions=None, adoption_inventory=None, review_delta=None, tenant_rls=None, revision_history=None, numerical_evidence=None, numerical_deep_proof=None, subjective_risk=None, historic_answer_drafts=None):
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
    # Current 80/80 machine proofs are a separate, newer layer than the historical
    # 59/21 deep-original crosswalk. Neither is qualified faculty approval.
    all80_current=False
    if numerical_deep_proof is not None:
        if (numerical_evidence is None
            or numerical_deep_proof.get('schema')!='ASSPS_GRADE910_21_NUMERICAL_DEEP_RECOMPUTATION_SOURCE_V1'
            or numerical_deep_proof.get('sourceOriginalsIndependentlyRecomputed')!=21
            or numerical_deep_proof.get('existing59DeepVerifiedOriginalsExcludedFromThese21')!=59
            or numerical_deep_proof.get('prior59FullLiveRevisionAndStemReauthenticated')!=59
            or numerical_deep_proof.get('currentLiveStemsAndAnswersMatched')!=21
            or numerical_deep_proof.get('combined80NumericalReadOnlyProof') is not True
            or numerical_deep_proof.get('currentLiveFullRevisionSha256Verified') is not True
            or numerical_deep_proof.get('checkedAgainstLiveReadOnly') is not True
            or numerical_deep_proof.get('liveTextComparisonFailures')!=0
            or numerical_deep_proof.get('qualifiedFacultyApprovalsCreated')!=0
            or numerical_deep_proof.get('productionDatabaseWrites')!=0
            or numerical_deep_proof.get('paperStudioPublicationEnabled') is not False
            or numerical_deep_proof.get('schoolAdoptedTextbookEditionCertified') is not False
            or numerical_deep_proof.get('sourceQuestionTextOrAnswersStoredInReport') is not False):
            raise ValueError('80_NUMERICAL_MACHINE_RECEIPT_INVALID_OR_UNAPPROVED')
        all80_current=True
    # Subjective answer depth is an editorial RISK queue. Never promote it to
    # signed academic approval or force-short answers to become incorrect.
    subjective_depth_checked=False
    if subjective_risk is not None:
        if (subjective_risk.get('schema')!='ASSPS_GRADE910_SUBJECTIVE_ANSWER_DEPTH_TRIAGE_V1'
            or subjective_risk.get('currentLiveQuestionRevisionsChecked')!=2411
            or subjective_risk.get('subjectiveItemsChecked')!=1522
            or subjective_risk.get('longQuestionsTotal')!=545
            or subjective_risk.get('longAtMost25Words')!=332
            or subjective_risk.get('longAtMost40Words')!=523
            or subjective_risk.get('essayAtMost25Words')!=25
            or subjective_risk.get('subjectiveRiskReviewCandidates')!=604
            or subjective_risk.get('highPriorityReviewCandidates')!=357
            or subjective_risk.get('riskFlagsAreEditorialAdvisoryNotIncorrectAnswerProof') is not True
            or subjective_risk.get('qualifiedAcademicApprovalsCreated')!=0
            or subjective_risk.get('publishedVerifiedQuestionsCreated')!=0
            or subjective_risk.get('sourcePdfOrEditionAuthenticatedByThisAudit') is not False
            or subjective_risk.get('productionDatabaseWrites')!=0
            or subjective_risk.get('questionTextOrAnswerStoredInReceipt') is not False
            or len(subjective_risk.get('records',[]))!=604):
            raise ValueError('SUBJECTIVE_DEPTH_EVIDENCE_UNVERIFIED_OR_PUBLICATION_UNSAFE')
        subjective_depth_checked=True
    # Existing historical explanatory drafts are strictly UNAPPROVED research,
    # not a newly manufactured independent faculty review decision.
    prior_long_explanations_linked=False
    if historic_answer_drafts is not None:
        x=historic_answer_drafts
        if (x.get('schema')!='ASSPS_GRADE910_EXISTING_166_LONG_ANSWER_RESEARCH_LIVE_CROSSWALK_V1'
            or x.get('liveQuestionRevisionsLinked')!=2411
            or x.get('uniqueHistoricalResearchLongIds')!=166
            or x.get('historicalLongIdsWithAnySupplementalExplanatoryDraft')!=165
            or x.get('historicalLongIdsWithoutSupplementalDraft')!=1
            or x.get('liveLongQuestionIdsWithPriorResearchDraft')!=164
            or x.get('liveRiskIdsWithPriorResearchDraft')!=154
            or x.get('liveRiskIdsWithoutPriorResearchDraft')!=450
            or x.get('highPriorityRiskIdsWithPriorResearchDraft')!=128
            or x.get('highPriorityRiskIdsWithoutPriorResearchDraft')!=229
            or x.get('previousTwentyPacketsAuthenticatedOriginalSha')!=20
            or x.get('publicOutputContainsNoSchoolStemOrModelAnswer') is not True
            or x.get('researchCandidatesAreNotIndependentTeacherReviews') is not True
            or x.get('schoolAdoptedEditionVerifiedByThisAudit') is not False
            or x.get('qualifiedAcademicApprovalsCreated')!=0
            or x.get('academicallySelectableCreated')!=0
            or x.get('productionDatabaseWrites')!=0
            or len(x.get('records',[]))!=166
            or not subjective_depth_checked):
            raise ValueError('HISTORICAL_ANSWER_RESEARCH_CROSSWALK_INVALID_OR_UNREVIEWED')
        if (x.get('newIndependentHighPriorityUrduBiologyResearchCandidates') is not None
            and x.get('newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates') is None):
            if (x.get('newIndependentHighPriorityUrduBiologyResearchCandidates')!=10
                or x.get('remainingLiveReviewDepthFlagsWithoutAnyDraft')!=440
                or x.get('remainingHighPriorityFlagsWithoutAnyDraft')!=219
                or len(x.get('unlinkedCurrentRevisionResearchQueue',[]))!=440
                or sum(y.get('priority')=='HIGH' for y in x['unlinkedCurrentRevisionResearchQueue'])!=219):
                raise ValueError('NEW_URDU_BIOLOGY_MODEL_RESEARCH_FRAUDULENT_APPROVAL_OR_DRIFT')
        elif (x.get('newIndependentHighPriorityUrduBiologyResearchCandidates') is None
              and x.get('newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates') is None
              and 'unlinkedCurrentRevisionResearchQueue' in x
              and len(x['unlinkedCurrentRevisionResearchQueue'])!=450):
            raise ValueError('HISTORICAL_ORIGINAL_RESEARCH_BACKLOG_LEDGER_DRIFT')
        if (x.get('newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates') is not None
            and x.get('newGrade10ChemistryUrduConceptualResearchCandidates') is None):
            if (x.get('newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates')!=14
                or x.get('newIndependentHighPriorityUrduBiologyResearchCandidates')!=10
                or x.get('remainingLiveReviewDepthFlagsWithoutAnyDraft')!=426
                or x.get('remainingHighPriorityFlagsWithoutAnyDraft')!=205
                or len(x.get('unlinkedCurrentRevisionResearchQueue',[]))!=426
                or sum(y.get('priority')=='HIGH' for y in x['unlinkedCurrentRevisionResearchQueue'])!=205):
                raise ValueError('SECOND_URDU_RESEARCH_CROSSWALK_FRAUD_OR_COUNT_DRIFT')
        if (x.get('newGrade10ChemistryUrduConceptualResearchCandidates') is not None
            and x.get('newEnglishGrade9And10IllustrativeParagraphCandidates') is None):
            if (x.get('newGrade10ChemistryUrduConceptualResearchCandidates')!=10
                or x.get('newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates')!=14
                or x.get('newIndependentHighPriorityUrduBiologyResearchCandidates')!=10
                or x.get('remainingLiveReviewDepthFlagsWithoutAnyDraft')!=416
                or x.get('remainingHighPriorityFlagsWithoutAnyDraft')!=195
                or len(x.get('unlinkedCurrentRevisionResearchQueue',[]))!=416
                or sum(y.get('priority')=='HIGH' for y in x['unlinkedCurrentRevisionResearchQueue'])!=195):
                raise ValueError('GRADE10_10_SAFE_CHEMISTRY_RESEARCH_CROSSWALK_INVALID_OR_FABRICATED')
        if (x.get('newEnglishGrade9And10IllustrativeParagraphCandidates') is not None
            and x.get('newGrade9ChemistryUrduOriginalConceptualResearchCandidates') is None):
            if (x.get('newEnglishGrade9And10IllustrativeParagraphCandidates')!=21
                or x.get('newGrade10ChemistryUrduConceptualResearchCandidates')!=10
                or x.get('newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates')!=14
                or x.get('newIndependentHighPriorityUrduBiologyResearchCandidates')!=10
                or x.get('remainingLiveReviewDepthFlagsWithoutAnyDraft')!=395
                or x.get('remainingHighPriorityFlagsWithoutAnyDraft')!=174
                or len(x.get('unlinkedCurrentRevisionResearchQueue',[]))!=395
                or sum(r.get('priority')=='HIGH' for r in x['unlinkedCurrentRevisionResearchQueue'])!=174):
                raise ValueError('ENGLISH_21_NOT_UNIQUE_ESSAY_RESEARCH_OR_FALSE_APPROVAL')
        if x.get('newGrade9ChemistryUrduOriginalConceptualResearchCandidates') is not None:
            if (x.get('newGrade9ChemistryUrduOriginalConceptualResearchCandidates')!=8
                or x.get('newEnglishGrade9And10IllustrativeParagraphCandidates')!=21
                or x.get('newGrade10ChemistryUrduConceptualResearchCandidates')!=10
                or x.get('newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates')!=14
                or x.get('newIndependentHighPriorityUrduBiologyResearchCandidates')!=10
                or x.get('remainingLiveReviewDepthFlagsWithoutAnyDraft')!=387
                or x.get('remainingHighPriorityFlagsWithoutAnyDraft')!=166
                or len(x.get('unlinkedCurrentRevisionResearchQueue',[]))!=387
                or sum(r.get('priority')=='HIGH' for r in x['unlinkedCurrentRevisionResearchQueue'])!=166
                or x.get('remainingHighPriorityStreamSpecificSubjectLabelsAwaitSchoolAdoption')!=137
                or x.get('remainingHighPriorityOtherSubjectLabelsStillNeedBookAdoption')!=29
                or x.get('streamSpecificLabelsAreNotAutomaticInapplicabilityOrApproval') is not True):
                raise ValueError('GRADE9_CHEMISTRY_EIGHT_RESEARCH_REVISION_DRIFT_OR_FALSE_APPROVAL')
        prior_long_explanations_linked=True
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
      "liveNumericalsMatchedToDeepRecomputedOriginal":80 if all80_current else numerical_evidence.get("liveNumericStemAndAnswerIdenticalToDeepOriginal") if numerical_evidence else None,
      "liveNumericalsStillNeedRevisionSpecificDeepRecomputation":0 if all80_current else numerical_evidence.get("liveNumericalCurrentRevisionMissingDeepComputation") if numerical_evidence else None,
      "numericalCurrentFullLiveRevisionsAndMachineAnswersMatched":all80_current,
      "numericalMachineProofIsNotFacultyReview":True,
      "subjectiveAnswerDepthRiskQueue":subjective_risk.get("subjectiveRiskReviewCandidates") if subjective_depth_checked else None,
      "highPrioritySubjectiveModelAnswerReviewQueue":subjective_risk.get("highPriorityReviewCandidates") if subjective_depth_checked else None,
      "subjectiveLengthFlagsAreNotAcademicCorrectnessJudgments":True,
      "liveLongQuestionsWithPriorUnapprovedExplanatoryResearch":164 if prior_long_explanations_linked else None,
      "subjectiveDepthRiskFlagsWithPriorResearch":154 if prior_long_explanations_linked else None,
      "subjectiveDepthRiskFlagsNeedingFreshModelResearch":450 if prior_long_explanations_linked else None,
      "highPriorityAnswerRiskWithoutPriorResearch":229 if prior_long_explanations_linked else None,
      "priorLongAnswerDraftsAreNotTeacherReviews":True,
      "newGrade10UrduBiologyUnapprovedAnswerResearchCandidates":historic_answer_drafts.get("newIndependentHighPriorityUrduBiologyResearchCandidates") if prior_long_explanations_linked else None,
      "newGrade9Biology8AndGrade10Computer6UrduUnapprovedAnswers":historic_answer_drafts.get("newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates") if prior_long_explanations_linked else None,
      "newGrade10ChemistryUrdu10UnapprovedConceptualAnswers":historic_answer_drafts.get("newGrade10ChemistryUrduConceptualResearchCandidates") if prior_long_explanations_linked else None,
      "newGrade9And10English21FlexibleExampleAnswersNotKeys":historic_answer_drafts.get("newEnglishGrade9And10IllustrativeParagraphCandidates") if prior_long_explanations_linked else None,
      "newGrade9ChemistryUrdu8UnapprovedExplanations":historic_answer_drafts.get("newGrade9ChemistryUrduOriginalConceptualResearchCandidates") if prior_long_explanations_linked else None,
      "highPriorityTechStreamLabelsAdoptionNotAuthenticated":historic_answer_drafts.get("remainingHighPriorityStreamSpecificSubjectLabelsAwaitSchoolAdoption") if prior_long_explanations_linked else None,
      "highPriorityOtherSubjectLabelsAdoptionNotAuthenticated":historic_answer_drafts.get("remainingHighPriorityOtherSubjectLabelsStillNeedBookAdoption") if prior_long_explanations_linked else None,
      "subjectiveDepthFlagsNeedingFreshAnswerResearchAfterNewDrafts":historic_answer_drafts.get("remainingLiveReviewDepthFlagsWithoutAnyDraft") if prior_long_explanations_linked else None,
      "highPriorityResearchFlagsStillUnlinkedAfterNewDrafts":historic_answer_drafts.get("remainingHighPriorityFlagsWithoutAnyDraft") if prior_long_explanations_linked else None,
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
               read(SOURCE_DIR/"live-numerical-evidence.json"),
               read(SOURCE_DIR/"numerical-deep-recomputation-21.json"),
               read(SOURCE_DIR/"subjective-answer-depth-risk-20261016.json"),
               read(SOURCE_DIR/"live-existing-answer-proposal-crosswalk-20261016.json"))
    save(OUT,p)
    print(json.dumps({k:v for k,v in p.items() if k!="phases"},sort_keys=True))
    for row in p["phases"]:print(f"PHASE_{row['phase']}={row['status']}")
    if any(x["status"].startswith("HOLD_LIVE") or x["status"].startswith("HOLD_INCOMPLETE") or x["status"].startswith("HOLD_MCQ") or x["status"].startswith("HOLD_FULL") for x in p["phases"]):
        raise SystemExit("OPERATIONAL_GUARD_HOLD_NO_PRODUCTION_CHANGES")
