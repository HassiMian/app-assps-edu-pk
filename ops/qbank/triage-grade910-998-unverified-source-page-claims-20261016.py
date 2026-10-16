#!/usr/bin/env python3
"""Fail-closed, no-text Grade IX/X 998-source-claim evidence gap routing.

Collates existing 998 PDF text-layer and 765 corrected 112-page OCR receipts
against 2581 frozen original question IDs without claiming school adoption,
authentic exercise-page correspondence, or qualified teacher approval.
No database writes, no original question text or textbook-page excerpts output.
"""
from __future__ import annotations
import collections,hashlib,json,os,sys,tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
PRIVATE=Path('/var/lib/assps-grade910-sourceclaims')
TEXT=PRIVATE/'question-page-textlayer.json'
OCR=PRIVATE/'ocr-recheck-legacy-progress-20261016.json'
FINAL=PRIVATE/'ocr-legacy-recheck-final-assessment-20261016.json'
LIVE=PRIVATE/'live-question-revisions.json'
SUPPLEMENT=PRIVATE/'health-sciences10-tech-c17-page102-bilingual-ocr-20261016.json'
PHYSICS=PRIVATE/'physics9-c01-s01-three-page-independent-text-proof-20261016.json'
NATIVE230=PRIVATE/'grade10-230-native-text-source-page-neighborhood-review-20261016.json'
PUBLIC=ROOT/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json'
TARGET=PRIVATE/'998-text-and-ocr-question-page-review-routing-20261016.json'
EXPECTED_ORIGINAL_OCR_SHA='fc73d62fb4606a9a89a41aad70fe0fce24d199cb44158e6d8aeb296e2b79c4c6'
EXPECTED_COMPLETED_CATEGORIES={'TEXT_LAYER_INSUFFICIENT':768,'READABLE_TEXT_NO_EXACT_STEM':124,'STEM_TOO_SHORT_FOR_SAFE_EXACT_PHRASE':106}
APPROVAL_FIELDS=('schoolAdoptionVerified','approved','published','paperStudioSelectable',
                 'independentHumanAccuracyReview','reviewerIdentityVerified')
def sha(b):return hashlib.sha256(b).hexdigest()
def ident(row):
    return (str(row.get('questionId')),
            str(row.get('sourceCatalog',row.get('catalog'))),
            int(row.get('originallyClaimedPdfPage',row.get('page'))))
def reconcile(layer,ocr,old,recheck_proof,strict=True,live=None,supplemental=None,physics=None,native230=None):
    if layer.get('schema') is None or not isinstance(layer.get('records'),list):
        raise ValueError('TEXT_LAYER_RESEARCH_NOT_PRESENT')
    if ocr.get('schema')!='ASSPS_GRADE910_OCR_RESUME_V1' or ocr.get('academicApproved') is not False or ocr.get('published') is not False or ocr.get('rawTextPersisted') is not False:
        raise ValueError('UNAPPROVED_OCR_LEDGER_REQUIRED')
    if not isinstance(ocr.get('results'),list) or not isinstance(old.get('rows'),list):
        raise ValueError('QUESTION_SOURCE_CROSSWALK_MISSING')
    if (recheck_proof.get('academicallyApprovedQuestionsCreated')!=0
        or recheck_proof.get('paperStudioVerifiedQuestionsPublished')!=0
        or recheck_proof.get('allQuestionPageIdsStable') is not True):
        raise ValueError('INVALID_FULL_OCR_INTEGRITY_PROOF')
    text_rows=layer['records'];ocr_rows=ocr['results'];frozen=old['rows']
    if strict:
        if (len(text_rows)!=998 or len(ocr_rows)!=765 or len(frozen)!=2581
            or layer['summary'].get('claimsChecked')!=998
            or layer['summary'].get('strictExactStemMatches')!=0
            or recheck_proof.get('totalQuestionPageCandidatesChecked')!=765
            or recheck_proof.get('oldUnreliablePagesRecheckedWithDecoder')!=62
            or recheck_proof.get('rescanProgressCompleted')!=112):
            raise ValueError('COMPLETE_998_TEXT_765_OCR_2581_FROZEN_SCOPE_REQUIRED')
    current_live=None
    if live is not None:
        entries=live.get('records')
        if (not isinstance(entries,list) or
            (strict and (live.get('revisions')!=2411 or len(entries)!=2411
                         or live.get('actualLiveAcademicRevisionContentHashed') is not True
                         or live.get('academicallyApprovedRevisions')!=0
                         or live.get('databaseWrites')!=0))):
            raise ValueError('LIVE_SCHOOL1_REVISION_LEDGER_UNTRUSTED')
        current_live={x['questionId']:x for x in entries}
        if len(current_live)!=len(entries):
            raise ValueError('DUPLICATE_LIVE_SCHOOL1_REVISION_IDS')
    source={r['questionId']:r for r in frozen}
    if len(source)!=len(frozen):raise ValueError('FROZEN_ORIGINAL_DUPLICATE_QUESTION_ID')
    ocr_map={}
    for row in ocr_rows:
        k=ident(row)
        if k in ocr_map:raise ValueError('OCR_QUESTION_PAGE_MAPPING_DUPLICATED')
        if (row.get('nodePdfJsFilesystemWasmLoaderPathConfigured') is not True
            or row.get('pdfJsDecoderResourceUrlsExplicitlyConfigured') is not True
            or row.get('academicQuestionContentPageVerified') is not False
            or row.get('qualifiedFacultyApproved') is not False
            or row.get('autoPublished') is not False):
            raise ValueError('OCR_PAGE_DECODER_OR_FACULTY_PROOF_INVALID')
        ocr_map[k]=row
    items=[];seen=set()
    for row in text_rows:
        key=ident(row)
        if key in seen:raise ValueError('TEXT_LAYER_DUPLICATE_QUESTION_PAGE')
        seen.add(key)
        qid,catalog,page=key
        f=source.get(qid)
        if f is None or catalog!=f.get('sourceCatalogId'):
            raise ValueError('OCR_SOURCE_QUESTION_CATALOG_NOT_FROZEN_ORIGINAL')
        curr=current_live.get(qid) if current_live is not None else None
        if current_live is not None:
            if curr is None or curr.get('grade')!=str(f.get('originalGradeClaim'))+'th' or len(str(curr.get('revisionSha256','')))!=64:
                raise ValueError('SOURCE_998_CLAIM_NOT_IN_CURRENT_SCHOOL1_FULL_REVISION')
        if any(f.get(k) is not False for k in APPROVAL_FIELDS):
            raise ValueError('FROZEN_AUTHORING_QUESTION_CLAIMS_FAKE_APPROVAL')
        if any(row.get(k) is not False for k in (
            'actualQuestionPageAcademicallyVerified','genuineQualifiedFacultyApproved','approvedForPaperStudio')):
            raise ValueError('TEXT_LAYER_CLAIMS_FAKE_VERIFIED_PAGE')
        if row.get('strictExactStemPresent') is not False:raise ValueError('UNEXPECTED_EXACT_TEXT_LAYER_PROOF')
        layer_type=row.get('category')
        if layer_type not in EXPECTED_COMPLETED_CATEGORIES:
            raise ValueError('UNKNOWN_TEXT_LAYER_EVIDENCE_CATEGORY')
        ocr_row=ocr_map.get(key)
        evidence='NOT_OCR_SCANNED'
        if ocr_row is not None:
            if ocr_row.get('exactStemCandidate') is True:
                if ocr_row.get('category')!='HIGH_CONFIDENCE_OCR_EXACT_STEM_CANDIDATE':
                    raise ValueError('OCR_EXACT_CANDIDATE_WITHOUT_CONFIDENCE_CATEGORY')
                evidence='OCR_EXACT_STEM_RESEARCH_CANDIDATE_NOT_VERIFIED'
            else:
                if ocr_row.get('category')!='READABLE_OCR_NO_EXACT_STEM':
                    raise ValueError('OCR_NO_EXACT_STEM_CATEGORY_CONFLICT')
                evidence='OCR_READABLE_NO_EXACT_STEM'
        elif layer_type=='TEXT_LAYER_INSUFFICIENT':
            evidence='UNREADABLE_NO_ELIGIBLE_OCR'
        elif layer_type=='STEM_TOO_SHORT_FOR_SAFE_EXACT_PHRASE':
            evidence='SHORT_STEM_NEEDS_EXERCISE_REVIEW'
        elif layer_type=='READABLE_TEXT_NO_EXACT_STEM':
            evidence='TEXT_LAYER_READABLE_NO_EXACT_STEM'
        is_tech='tech' in str(f.get('provisionalReviewSubject') or '').lower()
        item={'questionId':qid,'originalGradeClaim':f.get('originalGradeClaim'),
              'originalSubjectClaim':f.get('originalSubjectClaim'),
              'originalMediumClaim':f.get('originalMediumClaim'),
              'originalRevisionSha256':f.get('originalRevisionSha256'),
              'currentLiveSchool1FullRevisionSha256':curr.get('revisionSha256') if curr else None,
              'sourceCatalogId':catalog,'unverifiedOriginalClaimedPdfPage':page,
              'textLayerEvidenceCategory':layer_type,
              'sourceComparisonEvidenceCategory':evidence,
              'pdfTextLayerSHA256':row.get('pdfTextLayerSHA256'),
              'ocrConfidence':ocr_row.get('averageConfidence') if ocr_row else None,
              'originalBookEditionAdoptionAuthenticated':False,
              'specificTextbookQuestionPageVerified':False,
              'qualifiedAcademicReviewerAuthenticated':False,
              'academicApproved':False,'paperStudioVerifiedSelectable':False,
              'routing':('SCHOOL_TECH_STREAM_ADOPTION_AND_EXERCISE_PROOF_REQUIRED' if is_tech
                        else 'SCHOOL_STANDARD_SUBJECT_ADOPTION_AND_EXERCISE_PROOF_REQUIRED')}
        items.append(item)
    if set(ocr_map)-seen:
        raise ValueError('OCR_QUESTION_PAGE_NOT_IN_TEXT_LAYER_998_SET')
    supplementary_count=0
    if supplemental is not None:
        ids={'X-HS-TECH-C17-L01','X-HS-TECH-C17-M01','X-HS-TECH-C17-S01'}
        if (supplemental.get('schema')!='ASSPS_C054_PAGE102_BILINGUAL_OCR_RESEARCH_ONLY_V1'
            or supplemental.get('catalog')!='pectaa-catalog-054'
            or supplemental.get('page')!=102
            or supplemental.get('grade')!=10
            or supplemental.get('originalPDFSHA256')!='f69e2553dc39f30fc2f76bda87934cd927c45a5b12e7c8e6305f6ccc6e3aa906'
            or supplemental.get('originalFrozenQuestionFileSHA256')!='544e7b9b1dfc157e9b1199606bf5a84d52120534d993b1249f9064c403244a74'
            or supplemental.get('mediumNotEstablishedByOfficialCatalog') is not True
            or supplemental.get('officialSchoolStreamAdoptionVerified') is not False
            or supplemental.get('officialSchoolTextbookEditionVerified') is not False
            or supplemental.get('independentlyVerifiedPrintedQuestionPage') is not False
            or supplemental.get('authenticatedQualifiedReviewers')!=0
            or supplemental.get('academicApprovedQuestions')!=0
            or supplemental.get('publishedQuestions')!=0
            or supplemental.get('productionDatabaseWrites')!=0
            or supplemental.get('rawTextOrPDFImagesPersisted') is not False
            or supplemental.get('languagesTried')!=['eng','urd']
            or len(supplemental.get('results',[]))!=3
            or {r.get('questionId') for r in supplemental['results']}!=ids):
            raise ValueError('UNKNOWN_MEDIUM_BILINGUAL_OCR_RESEARCH_NOT_TRUSTED')
        mapped={r['questionId']:r for r in items}
        for z in supplemental['results']:
            id=z['questionId']
            r=mapped.get(id)
            english=z.get('languageDiagnostics',{}).get('eng',{})
            urdu=z.get('languageDiagnostics',{}).get('urd',{})
            allowed={'questionId','currentLiveQuestionRevisionSHA256','originalQuestionStemSHA256',
                     'languageDiagnostics','verifiedQuestionAnswerPage','teacherApproved',
                     'paperStudioVerifiedSelectable'}
            if (set(z)!=allowed
                or len(str(z.get('originalQuestionStemSHA256','')))!=64
                or set(z.get('languageDiagnostics',{}))!={'eng','urd'}
                or any(set(stats)!={'tokenCount','meanConfidence',
                                     'substantialExactStemResearchCandidate','reliability'}
                       for stats in z.get('languageDiagnostics',{}).values())):
                raise ValueError('UNKNOWN_MEDIUM_SUPPLEMENTAL_METADATA_NOT_PRIVATE_OR_COMPLETE')
            if (r is None
                or r.get('sourceCatalogId')!='pectaa-catalog-054'
                or r.get('unverifiedOriginalClaimedPdfPage')!=102
                or r.get('textLayerEvidenceCategory')!='TEXT_LAYER_INSUFFICIENT'
                or r.get('sourceComparisonEvidenceCategory')!='UNREADABLE_NO_ELIGIBLE_OCR'
                or r.get('currentLiveSchool1FullRevisionSha256')!=z.get('currentLiveQuestionRevisionSHA256')
                or r.get('originalGradeClaim')!=10
                or r.get('routing')!='SCHOOL_TECH_STREAM_ADOPTION_AND_EXERCISE_PROOF_REQUIRED'
                or english.get('reliability')!='OCR_RENDER_READABLE_NOT_SOURCE_PAGE_APPROVAL'
                or english.get('tokenCount',0)<40 or english.get('meanConfidence',0)<70
                or english.get('substantialExactStemResearchCandidate') is not False
                or urdu.get('substantialExactStemResearchCandidate') is not False
                or z.get('verifiedQuestionAnswerPage') is not False
                or z.get('teacherApproved') is not False
                or z.get('paperStudioVerifiedSelectable') is not False
                or 'ocrText' in z or 'originalQuestionStem' in z):
                raise ValueError('UNKNOWN_MEDIUM_SOURCE_CURRENT_REVISION_EVIDENCE_DRIFT')
            r['originalEnglishOnlyOCRExclusion']='UNKNOWN_CATALOG_MEDIUM_EXCLUDED_NOT_UNREADABLE_PDF'
            r['sourceComparisonEvidenceCategory']='UNKNOWN_MEDIUM_BILINGUAL_OCR_READABLE_NO_EXACT_STEM'
            r['supplementalOCRDiagnosticEnglishWordCount']=english['tokenCount']
            r['supplementalOCRDiagnosticEnglishMeanConfidence']=english['meanConfidence']
            r['supplementalOCRDiagnosticUrduMeanConfidence']=urdu.get('meanConfidence')
            supplementary_count+=1
        if supplementary_count!=3:
            raise ValueError('SUPPLEMENTAL_3_QUESTION_PAGE_EVIDENCE_INCOMPLETE')
    independently_reconfirmed_physics=0
    if physics is not None:
        original_id='IX-PHY-2025-C01-S01'
        record=next((r for r in items if r['questionId']==original_id),None)
        source_record=source.get(original_id)
        pages=physics.get('pageEvidence',[])
        checks={p.get('physicalPDFPage'):p for p in pages} if isinstance(pages,list) else {}
        allowed={'physicalPDFPage','ocrRecognizedWords','ocrAverageConfidence',
                 'exactNormalizedPhraseOccurrences','reliability','rawPageTextPersisted'}
        if (physics.get('schema')!='ASSPS_GRADE9_PHYSICS_THREE_PDF_PAGES_UNAPPROVED_OCR_SECOND_PASS_V1'
            or physics.get('candidateQuestionId')!=original_id
            or physics.get('sourceCatalogId')!='pectaa-catalog-011'
            or physics.get('immutablePDFSHA256')!='a77c9b5fd12e35de2a08390c2b93d10a59fa94fb4603e3349908e75c6b189794'
            or physics.get('originalFrozenResearchFileSHA256')!='1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16'
            or physics.get('sourcePDFPhysicalPages')!=204
            or physics.get('claimedPDFPhysicalPage')!=5
            or physics.get('independentPagesChecked')!=3
            or physics.get('checkedPhysicalPDFPages')!=[4,5,6]
            or len(pages)!=3 or set(checks)!={4,5,6}
            or any(set(p)!=allowed for p in pages)
            or any(p.get('reliability')!='READABLE_OCR_RESEARCH_ONLY'
                   or p.get('ocrAverageConfidence',0)<70 or p.get('ocrRecognizedWords',0)<40
                   or p.get('rawPageTextPersisted') is not False for p in pages)
            or checks.get(4,{}).get('exactNormalizedPhraseOccurrences')!=0
            or checks.get(5,{}).get('exactNormalizedPhraseOccurrences')!=1
            or checks.get(6,{}).get('exactNormalizedPhraseOccurrences')!=0
            or physics.get('claimedPageStrictExactMatchResearchEvidence') is not True
            or record is None or source_record is None
            or record.get('sourceCatalogId')!='pectaa-catalog-011'
            or record.get('unverifiedOriginalClaimedPdfPage')!=5
            or record.get('currentLiveSchool1FullRevisionSha256')!=physics.get('exactCurrentLiveQuestionRevisionSHA256')
            or record.get('sourceComparisonEvidenceCategory')!='OCR_EXACT_STEM_RESEARCH_CANDIDATE_NOT_VERIFIED'
            or source_record.get('contentOrigin')!='additional'
            or physics.get('sourceSchoolAdoptedEditionVerified') is not False
            or physics.get('curriculumAcademicSessionApplicabilityVerified') is not False
            or physics.get('officialBookPrintedExercisePageVerified') is not False
            or physics.get('independentPhysicsTeacherAuthenticated') is not False
            or physics.get('academicQuestionAnswerApproved') is not False
            or physics.get('paperStudioVerifiedSelectable') is not False
            or physics.get('rawCopyrightedPageTextPersisted') is not False
            or physics.get('productionDatabaseWrites')!=0):
            raise ValueError('PHYSICS_SECOND_OCR_EXACT_REPRODUCIBLE_BUT_NO_ACADEMIC_APPROVAL')
        record['secondPassPage5ExactOCRPhraseReproduced']=True
        record['adjacentPages4And6NoExactPhrase']=True
        record['originalQuestionOriginClaim']='additional'
        record['corroborationScope']='THREE_PHYSICAL_PDF_PAGES_OCR_ONLY_NOT_EDITION_OR_EXERCISE_CERTIFICATION'
        independently_reconfirmed_physics=1
    native230_count=0
    if native230 is not None:
        expected_source_counts={
            'pectaa-recovered-chemistry10-en-2026':65,
            'pectaa-catalog-017':60,
            'pectaa-catalog-057':30,
            'pectaa-catalog-049':27,
            'pectaa-catalog-054':24,
            'pectaa-catalog-062':24}
        allowed_dispositions={
            'SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN',
            'READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW',
            'EXACT_NATIVE_TEXT_ON_CLAIMED_PHYSICAL_PAGE_RESEARCH_ONLY',
            'ONLY_ADJACENT_PHYSICAL_PAGE_TEXT_RESEARCH_ONLY'}
        if (native230.get('schema')!='ASSPS_GRADE10_230_SHORT_NATIVE_SOURCE_PAGE_BOUNDED_V1'
            or native230.get('scopedExistingClaims')!=230
            or native230.get('originalNativeTextNotVerifiedClaims')!=124
            or native230.get('originalShortAmbiguousClaims')!=106
            or native230.get('numberOfOriginalSourcePDFs')!=6
            or native230.get('numberOfOriginalSourcePhysicalClaimPages')!=49
            or native230.get('examinedWindowRadiusInPhysicalPDFPages')!=1
            or native230.get('asspsAdoptedBookEditionVerified') is not False
            or native230.get('independentlyVerifiedExactExercisePageClaims')!=0
            or native230.get('qualifiedSubjectOrUrduAcademicReviews')!=0
            or native230.get('academicallyApprovedQuestions')!=0
            or native230.get('paperStudioVerifiedSelectableQuestions')!=0
            or native230.get('productionDatabaseWrites')!=0
            or native230.get('originalQuestionsAndTextbookExtractsPersisted') is not False
            or not isinstance(native230.get('rows'),list)
            or len(native230['rows'])!=230
            or not isinstance(native230.get('pdfs'),list)
            or len(native230['pdfs'])!=6):
            raise ValueError('NATIVE_230_RESEARCH_CAN_NOT_BECOME_FALSE_TEXTBOOK_CERTIFICATION')
        page_sources={v['sourceCatalogId']:v for v in native230['pdfs']}
        if set(page_sources)!=set(expected_source_counts) or len(page_sources)!=6:
            raise ValueError('NATIVE_230_SOURCE_CATALOG_DIVERGED')
        manifest=json.loads((ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json').read_text())
        manifest_by={r['recordId']:r for r in manifest['entries']}
        for cat,one in page_sources.items():
            official=manifest_by[cat]
            if (one.get('sourcePDFSHA256')!=official['pdfSha256']
                or one.get('physicalPDFPages')!=official['pdfPageCount']
                or one.get('originalOfficialCatalogMedium')!=official['medium']
                or one.get('uniquePhysicalPagesNativeTextChecked',0)<2
                or one.get('pagesWithInsufficientNativeText')!=0):
                raise ValueError('NATIVE_230_PDF_SOURCE_FINGERPRINT_OR_NATIVE_READABILITY_CHANGED')
        byid={r['questionId']:r for r in items}
        used=set()
        distribution=collections.Counter()
        catalogs=collections.Counter()
        for row in native230['rows']:
            id=row.get('questionId')
            old=byid.get(id)
            cat=row.get('sourceCatalogId')
            if (id in used or old is None or cat not in expected_source_counts
                or row.get('grade')!=10 or old.get('originalGradeClaim')!=10
                or old.get('sourceCatalogId')!=cat
                or row.get('currentLiveRevisionSHA256')!=old.get('currentLiveSchool1FullRevisionSha256')
                or row.get('originalClaimedPhysicalPDFPage')!=old.get('unverifiedOriginalClaimedPdfPage')
                or row.get('reason')!=old.get('sourceComparisonEvidenceCategory')
                or row.get('reason') not in ('SHORT_STEM_NEEDS_EXERCISE_REVIEW','TEXT_LAYER_READABLE_NO_EXACT_STEM')
                or row.get('evidenceDisposition') not in allowed_dispositions
                or not isinstance(row.get('checkedPhysicalPages'),list)
                or row['checkedPhysicalPages']!=list(range(
                    max(1,row['originalClaimedPhysicalPDFPage']-1),
                    min(page_sources[cat]['physicalPDFPages'],row['originalClaimedPhysicalPDFPage']+1)+1))
                or row.get('authenticASSPSBookAdoptionProven') is not False
                or row.get('academicallyVerifiedPrintedExercisePage') is not False
                or row.get('academicReviewerAuthenticated') is not False
                or row.get('paperStudioSelectable') is not False
                or row.get('claimedPDFPhysicalPageNativeTextReadable') is not True
                or len(str(row.get('frozenOriginalStemSHA256','')))!=64
                or 'rawPageText' in row or 'originalQuestionText' in row):
                raise ValueError('NATIVE_230_CURRENT_SHA_SOURCE_PAGE_MISMATCH_OR_FRAUD')
            if row['reason']=='SHORT_STEM_NEEDS_EXERCISE_REVIEW' and (
                row.get('fullStemSafeForExactPhrase') is not False
                or row['evidenceDisposition']!='SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN'):
                raise ValueError('NATIVE_106_AMBIGUOUS_QUESTION_CANNOT_BECOME_EXACT_PAGE_EVIDENCE')
            if row['reason']=='TEXT_LAYER_READABLE_NO_EXACT_STEM' and (
                row['evidenceDisposition']!='READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW'
                or row.get('claimedPhysicalPageExactPhraseOccurrences')!=0
                or row.get('neighboringPhysicalPageExactPhraseOccurrences')!=0):
                raise ValueError('NATIVE_124_NO_MATCH_CANNOT_INVENT_EXACT_STEM')
            used.add(id);catalogs[cat]+=1;distribution[row['evidenceDisposition']]+=1
            old['independentBoundedNativePDFSourceResearch']='CLAIMED_PAGE_AND_IMMEDIATE_NEIGHBORS_ONLY'
            old['newSourceEvidenceDisposition']=row['evidenceDisposition']
            old['boundedOriginalPhysicalPDFAreaChecked']=row['checkedPhysicalPages']
            native230_count+=1
        if catalogs!=collections.Counter(expected_source_counts) or (
            distribution!=collections.Counter({
                'SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN':106,
                'READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW':124})):
            raise ValueError('NATIVE_230_EXACT_CURRENT_RESEARCH_CLASSIFICATIONS_DRIFT')
    grade=collections.Counter(str(x['originalGradeClaim']) for x in items)
    evidence=collections.Counter(x['sourceComparisonEvidenceCategory'] for x in items)
    subject=collections.Counter(x['routing'] for x in items)
    pdfs=collections.Counter(x['sourceCatalogId'] for x in items)
    texttypes=collections.Counter(x['textLayerEvidenceCategory'] for x in items)
    if strict:
        if (len(items)!=998 or len(ocr_map)!=765
            or dict(texttypes)!=EXPECTED_COMPLETED_CATEGORIES
            or evidence.get('OCR_EXACT_STEM_RESEARCH_CANDIDATE_NOT_VERIFIED')!=1
            or evidence.get('OCR_READABLE_NO_EXACT_STEM')!=764
            or sum(evidence.values())!=998
            or evidence.get('UNKNOWN_MEDIUM_BILINGUAL_OCR_READABLE_NO_EXACT_STEM',0)!=supplementary_count
            or evidence.get('UNREADABLE_NO_ELIGIBLE_OCR',0)!=3-supplementary_count
            or len(pdfs)!=15):
            raise ValueError('AUTHORITATIVE_998_SOURCE_CLAIM_LEDGER_DRIFT')
    order={'UNREADABLE_NO_ELIGIBLE_OCR':0,'OCR_EXACT_STEM_RESEARCH_CANDIDATE_NOT_VERIFIED':1,
           'UNKNOWN_MEDIUM_BILINGUAL_OCR_READABLE_NO_EXACT_STEM':2,'SHORT_STEM_NEEDS_EXERCISE_REVIEW':3,'TEXT_LAYER_READABLE_NO_EXACT_STEM':4,
           'OCR_READABLE_NO_EXACT_STEM':5}
    items.sort(key=lambda x:(order[x['sourceComparisonEvidenceCategory']],
                             x['originalGradeClaim'] if isinstance(x['originalGradeClaim'],int) else 999,
                             x['sourceCatalogId'],x['questionId']))
    return {
       'schema':'ASSPS_GRADE910_998_SOURCE_CLAIMS_20261016_REVIEW_ONLY_V1',
       'reviewCandidates':len(items),
       'frozenResearchQuestionCount':len(frozen),
       'sourceTextLayerQuestionClaims':len(text_rows),
       'validatedDecoderOCRQuestionClaims':len(ocr_rows),
       'supplementalUnknownOfficialMediumPDFPagesOCRChecked':1 if supplementary_count else 0,
       'supplementalSourceClaimsIndependentlyOCRChecked':supplementary_count,
       'independentPhysicsSingleExactStemPageAndNeighborsRechecked':independently_reconfirmed_physics,
       'grade10OriginalNativeTextAndShortClaimWindowsIndependentlyChecked':native230_count,
       'grade10ShortAndNativeSourcePagesAcademicallyApproved':0,
       'physicsSecondPassTextMatchStillNotAcademicPrintedExerciseProof':True,
       'totalClaimsWithSomeValidatedDecoderOCRScreening':len(ocr_rows)+supplementary_count,
       'originalEnglishOnlyOCRExcludedClaimsRecovered':supplementary_count,
       'originalSourceClaimIdsPresentInCurrentSchool1LiveBank':sum(x['currentLiveSchool1FullRevisionSha256'] is not None for x in items),
       'originalCanonicalOCRPagesPreserved':112,
       'allOriginalQuestionPageCandidateMatchEvidenceProven':False,
       'schoolAdoptionAuthenticated':False,
       'qualifiedIndependentReviewComplete':False,
       'academicallyApprovedQuestions':0,
       'publishedQuestions':0,
       'productionDatabaseWrites':0,
       'containsRawCopyrightedTextOrStudentData':False,
       'evidenceDistribution':dict(sorted(evidence.items())),
       'textLayerCategoryDistribution':dict(sorted(texttypes.items())),
       'sourceCatalogCounts':dict(sorted(pdfs.items())),
       'sourceGradeDistribution':dict(sorted(grade.items())),
       'streamApplicabilityRouting':dict(sorted(subject.items())),
       'priorityEvidenceItems':items}
def load_real():
    ocr_bytes=OCR.read_bytes()
    if sha(ocr_bytes)!=EXPECTED_ORIGINAL_OCR_SHA:
        raise ValueError('CURRENT_VALIDATED_OCR_PROGRESS_SHA_CHANGED')
    layer=json.loads(TEXT.read_text())
    corrected=json.loads(ocr_bytes)
    old=json.loads(PUBLIC.read_text())
    final=json.loads(FINAL.read_text())
    current=json.loads(LIVE.read_text())
    bilingual=json.loads(SUPPLEMENT.read_text()) if SUPPLEMENT.exists() else None
    physics=json.loads(PHYSICS.read_text()) if PHYSICS.exists() else None
    native230=json.loads(NATIVE230.read_text()) if NATIVE230.exists() else None
    if final.get('newFullRecheckReceiptSha256')!=sha(ocr_bytes):
        raise ValueError('FINAL_OCR_SIGNED_RECEIPT_SOURCE_NOT_MATCHING')
    return reconcile(layer,corrected,old,final,live=current,supplemental=bilingual,physics=physics,native230=native230)
def write_private(path,obj):
    if path.parent.stat().st_mode & 0o077:raise ValueError('UNSAFE_PRIVATE_RESEARCH_DIRECTORY_PERMISSIONS')
    fd,tmp=tempfile.mkstemp(prefix='.998-source-review-',dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w',encoding='utf8') as f:
            json.dump(obj,f,sort_keys=True,ensure_ascii=False,indent=2)
            f.write('\n')
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
def main():
    result=load_real()
    if sys.argv[1:]==['--check']:
        if not TARGET.exists() or json.loads(TARGET.read_text())!=result:
            raise ValueError('PRIVATE_998_SOURCE_ROUTING_LEDGER_MISSING_OR_CHANGED')
        print('998_SOURCE_CLAIMS_AND_765_OCR_JOIN_VALID_NO_ACADEMIC_PUBLICATION')
    elif len(sys.argv)==1:
        write_private(TARGET,result)
        print(json.dumps({k:v for k,v in result.items() if k!='priorityEvidenceItems'},sort_keys=True))
    else:raise ValueError('USAGE_NO_ARGS_OR_CHECK')
if __name__=='__main__':main()
