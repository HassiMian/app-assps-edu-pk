#!/usr/bin/env python3
"""Final, strictly non-publishing 112-page legacy source OCR comparison.

The original 112-page canonical receipt is immutable; 62 old legacy PDF.js
render proofs are rechecked in a separate private source-only receipt.
No raw copyrighted source text or student/tenant details are exported.
"""
from __future__ import annotations
import hashlib,importlib.util,json,os,tempfile,sys
from collections import Counter
from pathlib import Path

HERE=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('assps_grade910_ocr_legacy_baseline',HERE/'ops/qbank/prepare-grade910-ocr-legacy-recheck-20261016.py')
legacy=importlib.util.module_from_spec(sp);sp.loader.exec_module(legacy)
TARGET=legacy.ROOT/'ocr-legacy-recheck-final-assessment-20261016.json'

def sha(b):return hashlib.sha256(b).hexdigest()

def build_assessment(canonical,recheck):
    review=legacy.verify_recheck(canonical,recheck)
    if review['verifiedRecheckedPages']!=112 or review['remainingLegacyPages']!=0:
        raise ValueError('FINAL_OCR_62_LEGACY_RECHECK_NOT_FULL_112')
    original_assets={x['catalog']+'|'+str(x['page']):x for x in canonical['assets']}
    corrected_assets={x['catalog']+'|'+str(x['page']):x for x in recheck['assets']}
    old_legacy={k for k,v in original_assets.items()
                if v.get('nodePdfJsFilesystemWasmLoaderPathConfigured') is not True}
    if len(old_legacy)!=62 or any(corrected_assets[k]['nodePdfJsFilesystemWasmLoaderPathConfigured'] is not True for k in old_legacy):
        raise ValueError('FINAL_OCR_62_VALIDATED_WASM_DECODER_NOT_COMPLETE')
    def rkey(x):return(x['catalog'],x['page'],x['questionId'])
    old={rkey(x):x for x in canonical['results']}
    new={rkey(x):x for x in recheck['results']}
    if len(old)!=765 or len(new)!=765 or set(old)!=set(new):
        raise ValueError('FINAL_OCR_QUESTION_ID_PAGE_MAPPING_CHANGED')
    categories_before=Counter()
    categories_after=Counter()
    category_transitions=Counter()
    exact_stem_candidates=0
    previous_untrusted_result_count=0
    old_confidence_total=0.0
    new_confidence_total=0.0
    for id in old:
        a=old[id];b=new[id]
        if a['catalog']+'|'+str(a['page']) not in old_legacy:continue
        previous_untrusted_result_count+=1
        categories_before[a.get('category','UNKNOWN')]+=1
        categories_after[b.get('category','UNKNOWN')]+=1
        category_transitions[a.get('category','UNKNOWN')+' -> '+b.get('category','UNKNOWN')]+=1
        if b.get('exactStemCandidate') is True:exact_stem_candidates+=1
        old_confidence_total+=float(a.get('averageConfidence') or 0)
        new_confidence_total+=float(b.get('averageConfidence') or 0)
    if previous_untrusted_result_count<1 or previous_untrusted_result_count+review['previousTrustedQuestionEvidenceUnchanged']!=765:
        raise ValueError('FINAL_OCR_QID_RECONCILIATION_INCOMPLETE')
    if any(x.get('academicQuestionContentPageVerified') is not False or x.get('qualifiedFacultyApproved') is not False or x.get('autoPublished') is not False for x in new.values()):
        raise ValueError('OCR_RECHECK_CANNOT_FORGE_FACULTY_OR_PAGE_APPROVAL')
    return {
       'schema':'ASSPS_GRADE910_112_PAGE_LEGACY_OCR_FULL_RECHECK_RESEARCH_AUDIT_V1',
       'decision':'ALL_62_OLD_OCR_PAGES_RECHECKED_EVIDENCE_RESEARCH_ONLY',
       'oldOriginal112PageReceiptSha256':legacy.EXPECTED_CANONICAL_SHA,
       'newFullRecheckSourceFingerprint':recheck['sourceFingerprint'],
       'newFullRecheckReceiptSha256':None,
       'originalCanonicalPagesPreserved':112,
       'previousReliablePagesPreservedExactly':50,
       'oldUnreliablePagesRecheckedWithDecoder':62,
       'rescanProgressCompleted':112,
       'allQuestionPageIdsStable':True,
       'totalQuestionPageCandidatesChecked':765,
       'previousReliableQuestionPageRecordsUnchanged':review['previousTrustedQuestionEvidenceUnchanged'],
       'newlyRecheckedLegacyQuestionPageRecords':previous_untrusted_result_count,
       'newlyRecheckedHighConfidenceExactStemCandidates':exact_stem_candidates,
       'originalLegacyCategories':dict(sorted(categories_before.items())),
       'recheckedLegacyCategories':dict(sorted(categories_after.items())),
       'legacyCategoryTransitions':dict(sorted(category_transitions.items())),
       'originalLegacyMeanOCRConfidence':round(old_confidence_total/previous_untrusted_result_count,2),
       'recheckedLegacyMeanOCRConfidence':round(new_confidence_total/previous_untrusted_result_count,2),
       'actualASSPSAdoptedTextbookEditionConfirmed':False,
       'independentQualifiedFacultyApproved':False,
       'individualPrintedTextbookExercisePageClaimVerified':False,
       'academicallyApprovedQuestionsCreated':0,
       'paperStudioVerifiedQuestionsPublished':0,
       'liveQuestionOrStudentDatabaseWrites':0,
       'rawTextOrPageImagesPersisted':False,
       'copyrightedSourceTextInThisReceipt':False,
    }

def write_private(path,data):
    if path.parent.stat().st_mode & 0o077:raise ValueError('PRIVATE_SOURCE_RECEIPT_DIR_EXPOSED')
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.ocr-final-integrity-')
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w',encoding='utf8') as f:
            json.dump(data,f,ensure_ascii=False,sort_keys=True,indent=2)
            f.write('\n')
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def run():
    oldbytes=legacy.SOURCE.read_bytes()
    if sha(oldbytes)!=legacy.EXPECTED_CANONICAL_SHA:
        raise ValueError('IMMUTABLE_112_CANONICAL_SOURCE_OCR_CHANGED')
    newbytes=legacy.TARGET.read_bytes()
    review=build_assessment(json.loads(oldbytes),json.loads(newbytes))
    review['newFullRecheckReceiptSha256']=sha(newbytes)
    if sys.argv[1:]==['--check']:
        if not TARGET.exists() or json.loads(TARGET.read_text())!=review:
            raise ValueError('FROZEN_112_FINAL_OCR_COMPARISON_RECEIPT_MISSING_OR_DRIFTED')
        print('ASSPS_OCR_112_FINAL_RECHECK_AUDIT_VALID_NO_SCHOOL_APPROVAL',
              review['previousReliableQuestionPageRecordsUnchanged'],
              review['newlyRecheckedLegacyQuestionPageRecords'])
    elif len(sys.argv)==1:
        write_private(TARGET,review)
        print(json.dumps(review,sort_keys=True))
    else:raise ValueError('ONLY_RUN_OR_CHECK')
if __name__=='__main__':run()
