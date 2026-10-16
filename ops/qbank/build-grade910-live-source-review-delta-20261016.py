#!/usr/bin/env python3
"""ASSPS authoritative 2581-original REVIEW-ONLY evidence overlay.

Merges School-1 source claims and live OCR provenance into the already frozen
56 faculty cohorts. No question text, PDF pages, private teacher data or
qualifications fabricated. No DB writes, import, approvals or publication.
"""
from __future__ import annotations
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import tempfile

BASE=Path('/root/workspace/assps-grade910-metadata-source-claim-20261016')
STATE=Path('/var/lib/assps-grade910-sourceclaims')
CROSS=(Path('/usr/local/libexec/assps-grade910-sourceclaims/originalReviewCrosswalk2581.json')
       if Path('/usr/local/libexec/assps-grade910-sourceclaims/originalReviewCrosswalk2581.json').exists()
       else BASE/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
OUT=STATE/'faculty-source-evidence-delta.json'

def read(p:Path):
    if not p.exists():raise ValueError('MISSING_SOURCE_RECEIPT_'+p.name)
    return json.loads(p.read_text())
def sha(p:Path):return hashlib.sha256(p.read_bytes()).hexdigest()

def index_unique(rows,key):
    values={}
    for row in rows:
        ident=row.get(key)
        if not isinstance(ident,str) or not ident or ident in values:
            raise ValueError('MISSING_OR_DUPLICATE_SOURCE_ID_'+key)
        values[ident]=row
    return values

def build(original,live,held,layer,pilot,ocr_progress,near,adoption,source_hashes,live_revisions,full_ocr=None):
    indexed=index_unique(original,'questionId')
    active=index_unique(live,'seedId')
    missing=index_unique(held,'questionId')
    pages=index_unique(layer,'questionId')
    pilot_map=index_unique(pilot,'questionId')
    current_map=index_unique(ocr_progress.get('results',[]),'questionId')
    duplicates=index_unique(near,'originalId')
    if set(active)-set(indexed):
        raise ValueError('UNKNOWN_LIVE_QUESTION_ID_NOT_IN_ORIGINAL_CROSSWALK')
    revs=index_unique(live_revisions['records'],'questionId')
    for ident,r in revs.items():
        rev=r.get('revisionSha256')
        if (ident not in active or not isinstance(rev,str) or len(rev)!=64 or
                any(c not in '0123456789abcdef' for c in rev) or
                r.get('grade')!=active[ident]['grade']):
            raise ValueError('LIVE_REVISION_HASH_OR_GRADE_INVALID')
    if (live_revisions.get('schema')!='ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1'
        or live_revisions.get('revisions')!=2411
        or live_revisions.get('academicallyApprovedRevisions')!=0
        or live_revisions.get('humanReviewerSignedRevisions')!=0
        or live_revisions.get('databaseWrites')!=0
        or set(revs)!=set(active)):
        raise ValueError('ACTUAL_LIVE_REVISION_IDENTITY_OR_APPROVAL_MISMATCH')
    if (len(indexed)!=2581 or len(active)!=2411 or len(missing)!=170
            or len(pages)!=998 or len(duplicates)!=170):
        raise ValueError('FROZEN_ORIGINAL_LIVE_SOURCE_COUNTS_DRIFT')
    if (set(active)-set(indexed) or set(missing)!=set(indexed)-set(active)
            or not set(pages)<=set(active)
            or not set(pilot_map)<=set(pages)
            or not set(current_map)<=set(pages)):
        raise ValueError('LIVE_RESEARCH_SOURCE_CROSSWALK_MISMATCH')
    if (adoption.get('schoolEditionAdoptionVerifiedByThisAudit') is not False
            or adoption.get('academicQuestionApprovalGained')!=0):
        raise ValueError('SCHOOL_ADOPTION_GUARD_REGRESSION')
    if ocr_progress.get('schema')!='ASSPS_GRADE910_OCR_RESUME_V1':
        raise ValueError('NO_AUTHENTIC_OCR_RESUME_PROVENANCE')
    if ocr_progress.get('academicApproved') is not False or ocr_progress.get('published') is not False:
        raise ValueError('OCR_AUTOPUBLICATION_NOT_ALLOWED')
    if len(set(ocr_progress['completedPages']))!=len(ocr_progress['completedPages']):
        raise ValueError('DUPLICATE_OCR_CHECKPOINT')
    completed_ocr=False
    final_map={}
    if full_ocr is not None:
        sm=full_ocr.get('summary',{})
        completed_ocr=(sm.get('scope')=='ALL_ELIGIBLE_ENGLISH_SCANNED_PAGES'
          and sm.get('pagesScannedNow')==sm.get('uniquePagesEligibleForLastResortOCR')==112
          and sm.get('productionDatabaseWrites')==0 and sm.get('publishedQuestions')==0
          and sm.get('independentQuestionContentPagesVerified')==0
          and sm.get('reviewerApprovals')==0
          and sm.get('claimsCoveredNow')==sm.get('eligibleEnglishOnlySourceClaims'))
        if not completed_ocr:raise ValueError('UNTRUSTED_FULL_OCR_COMPLETION_RECEIPT')
        final_map=index_unique(full_ocr.get('records',[]),'questionId')
        if len(final_map)!=sm['claimsCoveredNow'] or not set(final_map)<=set(pages):
            raise ValueError('FULL_OCR_SOURCE_ID_COHORT_MISMATCH')
    records=[]
    buckets=collections.Counter()
    review_checks=collections.Counter()
    corroborated=[]
    highest_near=[]
    for ident,q in indexed.items():
        live_row=active.get(ident)
        held_row=missing.get(ident)
        provenance=pages.get(ident)
        corroborations=[(tag,p.get('exactStemCandidate',False),p) for tag,p in (
            ('ocr_pilot',pilot_map.get(ident)),
            ('ocr_current',current_map.get(ident)),
            ('ocr_full',final_map.get(ident))) if p is not None]
        if live_row is not None and live_row['catalog']!=q['sourceCatalogId']:
            raise ValueError('CATALOG_ORIGINAL_TO_LIVE_CONFLICT_'+ident)
        if live_row is not None and live_row.get('dbApproved'):
            raise ValueError('UNAUTHENTICATED_LIVE_QUESTION_APPROVED')
        if held_row is not None and (held_row.get('approved') or
                                     not held_row.get('existingUnsignedFacultyForm')):
            raise ValueError('HELD_RESEARCH_SIGNATURE_OR_FORM_INVALID')
        if provenance is not None and (
          provenance['sourceCatalog']!=q['sourceCatalogId'] or
          not isinstance(provenance['originallyClaimedPdfPage'],int)):
            raise ValueError('PDF_TEXT_LAYER_MAPPING_MISMATCH_'+ident)
        for tag,exact,entry in corroborations:
            if entry['catalog']!=q['sourceCatalogId'] or (
                 provenance is not None and entry['page']!=provenance['originallyClaimedPdfPage']):
                raise ValueError('OCR_SOURCE_PAGE_CONFLICT_'+ident)
            if entry.get('qualifiedFacultyApproved') or entry.get('autoPublished'):
                raise ValueError('OCR_DERIVED_FAKE_QUALIFIED_APPROVAL')
        source_kind=(live_row or {}).get('claimKind','original_only_no_live_source')
        if live_row and source_kind=='author_page_claim' and provenance is None:
            raise ValueError('PAGE_CLAIM_LACKS_TEXT_LAYER_EVIDENCE_'+ident)
        if provenance is not None and source_kind!='author_page_claim':
            raise ValueError('TEXT_EVIDENCE_WITHOUT_ORIGINAL_PAGE_CLAIM_'+ident)
        context=provenance['category'] if provenance is not None else None
        exact_candidates=[(tag,v['page']) for tag,exact,v in corroborations if exact]
        if exact_candidates:
            lane='P0_MACHINE_CORROBORATED_NEEDS_EDITION_AND_FACULTY'
            corroborated.append(ident)
        elif held_row:
            lane='P1_PROTECTED_ORIGINAL_ONLY_REVIEW'
        elif source_kind=='author_page_claim' and context=='TEXT_LAYER_INSUFFICIENT':
            lane='P1_PAGE_SCAN_VISUAL_VERIFICATION'
        elif source_kind=='author_page_claim':
            lane='P1_EXACT_PAGE_CONTENT_OR_CONCEPT_REVIEW'
        elif source_kind=='toc_page':
            lane='P2_TOC_NOT_QUESTION_PAGE'
        else:
            lane='P2_CHAPTER_SOURCE_CONTEXT_OR_PENDING_LOCATION'
        near_row=duplicates.get(ident)
        if near_row is not None and near_row.get('potentialSimilarCount',0):
            highest_near.append(ident)
            review_checks['possibleHeldOriginalNearDuplicate']+=1
        checks=['AUTHENTICATED_ADOPTED_BOOK_SESSION_EDITION',
                'AUTHENTICATED_QUALIFIED_FACULTY_REVISION_REVIEW',
                'QUESTION_AND_ANSWER_CORRECTNESS',
                'STEM_AND_SOURCE_CHAPTER_TOPIC_LOCATION']
        if context=='TEXT_LAYER_INSUFFICIENT':
            checks.append('VERIFY_SCANNED_PAGE_VISUALLY')
        if source_kind=='toc_page':
            checks.append('TOC_ONLY_FIND_ACTUAL_QUESTION_CONTEXT')
        if near_row is not None and near_row.get('potentialSimilarCount',0):
            checks.append('COMPARE_POTENTIAL_EDITORIAL_REUSE')
        records.append({
          'questionId':ident,
          'originalRevisionSha256':q['originalRevisionSha256'],
          'actualLiveContentRevisionSha256':revs[ident]['revisionSha256'] if live_row else None,
          'existingGroupKey':q['groupKey'],
          'grade':q['provisionalReviewGrade'],
          'subject':q['provisionalReviewSubject'],
          'medium':q['provisionalReviewMedium'],
          'type':q['questionType'],
          'sourceCatalogId':q['sourceCatalogId'],
          'originalResearchFileSha256':q['originalResearchFileSha256'],
          'liveProvisionalRecordPresent':live_row is not None,
          'protectedOriginalNotLive':held_row is not None,
          'sourceClaimKind':source_kind,
          'originallyClaimedPdfPage':provenance['originallyClaimedPdfPage'] if provenance else None,
          'pdfNativeTextLayerCategory':context,
          'OCRPageWordCorroborationCandidates':[
              {'evidence':tag,'claimedPage':page} for tag,page in exact_candidates],
          'OCRFullRunComplete':completed_ocr,
          'originalHeldNearSimilarityReviewRequired':bool(near_row and near_row.get('potentialSimilarCount',0)),
          'independentPageExerciseVerification':False,
          'actualSchoolEditionAdoptionVerified':False,
          'humanVerifiedQuestionAndAnswer':False,
          'authenticQualifiedReviewerApproved':False,
          'paperStudioAcademicallyVerifiedSelectable':False,
          'evidenceReviewLane':lane,
          'reviewChecklist':checks,
        })
        buckets[lane]+=1
        review_checks.update(checks)
    if len(corroborated)>len(pilot)+len(current_map):
        raise ValueError('INVALID_OCR_CORROBORATION_COUNT')
    cohorts=collections.Counter(x['existingGroupKey'] for x in records)
    return {
       'schema':'ASSPS_GRADE910_2581_LIVE_SOURCE_EVIDENCE_DELTA_V1',
       'observedUTC':dt.datetime.now(dt.timezone.utc).isoformat(),
       'scope':'ONE_EXISTING_GRADE910_ACADEMIC_MASTER_NOT_A_PUBLICATION_RUN',
       'originalResearchQuestionIds':len(indexed),
       'liveProvisionalIds':len(active),
       'protectedOriginalOnlyIds':len(missing),
       'existingFacultyCohorts':len(cohorts),
       'originalPageClaimsWithNativeSourceTextEvidence':len(pages),
       'ocrPilotQuestionClaims':len(pilot),
       'ocrResumedQuestionClaims':len(current_map),
       'ocrFinalFullSourceQuestionClaims':len(final_map),
       'liveContentRevisionHashEntries':len(revs),
       'actualLiveRevisionsDifferentHashDomainFromFrozenResearch':True,
       'fullScannedOCRReceiptAuthenticTechnicalCompletionOnly':completed_ocr,
       'newlyApprovedQuestions':0,
       'qualifiedFacultyDecisionsForged':0,
       'verifiedPublisherSelectableQuestionsCreated':0,
       'databaseWrites':0,
       'sourceTextOrAnswersCopiedToReceipt':False,
       'confirmedExactExercisePageMappings':0,
       'OCRLexicalCorroboratedQuestionIDs':sorted(corroborated),
       'machineCorroborationsStillProvisional':len(corroborated),
       'possibleHeldOriginalEditorialNearRepeatIDs':sorted(highest_near),
       'countsByRequiredReviewLane':dict(sorted(buckets.items())),
       'pendingReviewCheckCounts':dict(sorted(review_checks.items())),
       'inputEvidenceSHA256':dict(sorted(source_hashes.items())),
       'facultyCohortReviewQueue':[
          {'existingGroupKey':cohort,
           'originalQuestionIdsInCohort':count,
           'P0MachineCorroboratedQuestionIds':sorted(x['questionId'] for x in records
              if x['existingGroupKey']==cohort and x['evidenceReviewLane'].startswith('P0_')),
           'qualifiedFacultySignedReviews':0,
           'approvalOrPublicationPermitted':False}
          for cohort,count in sorted(cohorts.items())],
       'records':sorted(records,key=lambda r:(r['evidenceReviewLane'],r['existingGroupKey'],r['questionId']))
    }

def save(path,data):
    path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    if path.parent.stat().st_mode&0o077:
        raise ValueError('ROOT_PRIVATE_REVIEW_RECEIPT_REQUIRED')
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.faculty-source-')
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(data,f,indent=2,sort_keys=True,ensure_ascii=False);f.write('\n')
            f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

if __name__=='__main__':
    files={
       'frozenOriginals':CROSS,
       'schoolLiveSource':STATE/'latest.json',
       'heldOriginals':STATE/'held170.json',
       'nativePDFText':STATE/'question-page-textlayer.json',
       'pilotOCR':STATE/'ocr-pilot-20261016.json',
       'currentOCR':STATE/'ocr-progress.json',
       'heldNearDuplicates':STATE/'held170-near-duplicate.json',
       'schoolAdoption':STATE/'school-adoption-inventory.json',
       'currentLiveRevisionHashInventory':STATE/'live-question-revisions.json',
    }
    payload={k:read(v) for k,v in files.items()}
    output=build(payload['frozenOriginals']['rows'],
                 payload['schoolLiveSource']['recordIdsAndClaimsOnly'],
                 payload['heldOriginals']['originalResearchCandidateRecords'],
                 payload['nativePDFText']['records'],payload['pilotOCR']['records'],
                 payload['currentOCR'],payload['heldNearDuplicates']['rows'],
                 payload['schoolAdoption'],{k:sha(v) for k,v in files.items()},
                 payload['currentLiveRevisionHashInventory'],
                 read(STATE/'ocr-fallback.json') if (STATE/'ocr-fallback.json').exists() else None)
    save(OUT,output)
    print(json.dumps({k:v for k,v in output.items() if k not in ('records','facultyCohortReviewQueue','pendingReviewCheckCounts','inputEvidenceSHA256')},
                     sort_keys=True))
