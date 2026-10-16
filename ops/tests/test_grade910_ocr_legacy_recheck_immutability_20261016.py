"""Hermetic adversarial tests for immutable Grade IX/X PDF scanned source OCR legacy recheck."""
from __future__ import annotations
import copy,importlib.util
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('grade910_ocr_legacy_protection',HERE/'ops/qbank/prepare-grade910-ocr-legacy-recheck-20261016.py')
m=importlib.util.module_from_spec(sp)
sp.loader.exec_module(m)

def fixture():
    original={'schema':'ASSPS_GRADE910_OCR_RESUME_V1','academicApproved':False,
              'published':False,'rawTextPersisted':False,'sourceFingerprint':'source-fingerprint-example',
              'completedPages':[],'assets':[],'results':[]}
    for i in range(112):
        catalog='catalog1' if i<56 else 'catalog2'
        page=i+1
        key=catalog+'|'+str(page)
        good=i<50
        original['completedPages'].append(key)
        original['assets'].append(dict(catalog=catalog,page=page,
            ocrWords=95,ocrMeanConfidence=92,
            pdfJsDecoderResourceUrlsExplicitlyConfigured=good,
            nodePdfJsFilesystemWasmLoaderPathConfigured=good,
            rawPageImagePersisted=False,rawOCRTextPersisted=False))
        n=7 if i<93 else 6
        for j in range(n):
            original['results'].append(dict(questionId=f'q{i:03d}-{j}',
                catalog=catalog,page=page,category='NO_SOURCE_CONTENT_PROOF',
                recognizedWords=45,averageConfidence=92,
                exactStemCandidate=False,
                pdfJsDecoderResourceUrlsExplicitlyConfigured=good,
                nodePdfJsFilesystemWasmLoaderPathConfigured=good,
                academicQuestionContentPageVerified=False,
                qualifiedFacultyApproved=False,autoPublished=False))
    assert len(original['results'])==765
    return original

def enhanced(c,extra=1):
    base=m.build(c)
    if extra:
        trusted=set(base['completedPages'])
        keys=lambda row:row['catalog']+'|'+str(row['page'])
        added=0
        for asset in c['assets']:
            k=keys(asset)
            if k in trusted:continue
            if added>=extra:break
            base['completedPages'].append(k)
            n=copy.deepcopy(asset)
            n['nodePdfJsFilesystemWasmLoaderPathConfigured']=True
            n['pdfJsDecoderResourceUrlsExplicitlyConfigured']=True
            base['assets'].append(n)
            for r in c['results']:
                if keys(r)==k:
                    v=copy.deepcopy(r)
                    v['nodePdfJsFilesystemWasmLoaderPathConfigured']=True
                    v['pdfJsDecoderResourceUrlsExplicitlyConfigured']=True
                    base['results'].append(v)
            added+=1
    return base

class OCRLegacyFailClosedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.c=fixture()
    def test_all_112_original_frozen_split_exactly(self):
        original=m.build(self.c)
        self.assertEqual(len(original['completedPages']),50)
        self.assertEqual(len(original['assets']),50)
        self.assertEqual(len(original['results']),350)
    def test_no_recheck_is_valid_preserved_50(self):
        x=m.verify_recheck(self.c,enhanced(self.c,0))
        self.assertEqual(x['remainingLegacyPages'],62)
        self.assertEqual(x['academicQuestionContentPagesApproved'],0)
    def test_one_trusted_decoder_recheck_addition(self):
        x=m.verify_recheck(self.c,enhanced(self.c))
        self.assertEqual(x['verifiedRecheckedPages'],51)
        self.assertEqual(x['newPagesWithValidatedDecoder'],1)
    def test_complete_112_rechecks_still_not_academic_approval(self):
        x=m.verify_recheck(self.c,enhanced(self.c,62))
        self.assertEqual(x['verifiedRecheckedPages'],112)
        self.assertEqual(x['remainingLegacyPages'],0)
        self.assertEqual(x['academicQuestionContentPagesApproved'],0)
    def test_duplicate_page_denied(self):
        d=enhanced(self.c);d['completedPages'].append(d['completedPages'][0])
        with self.assertRaisesRegex(ValueError,'PAGE_DUPLICATE'):
            m.verify_recheck(self.c,d)
    def test_unknown_page_denied(self):
        d=enhanced(self.c);d['completedPages'][-1]='unknown|567'
        with self.assertRaisesRegex(ValueError,'OUTSIDE_FROZEN_SCOPE'):
            m.verify_recheck(self.c,d)
    def test_old_trusted_asset_change_denied(self):
        d=enhanced(self.c);d['assets'][0]['ocrMeanConfidence']=1
        with self.assertRaisesRegex(ValueError,'PREVIOUS_50_TRUSTED_ASSETS_CHANGED'):
            m.verify_recheck(self.c,d)
    def test_old_trusted_question_result_change_denied(self):
        d=enhanced(self.c);d['results'][0]['averageConfidence']=0
        with self.assertRaisesRegex(ValueError,'PREVIOUS_50_TRUSTED_RESULTS_CHANGED'):
            m.verify_recheck(self.c,d)
    def test_missing_decoder_proof_denied(self):
        d=enhanced(self.c);d['assets'][-1]['nodePdfJsFilesystemWasmLoaderPathConfigured']=False
        with self.assertRaisesRegex(ValueError,'MISSING_VALIDATED_PDFJS_DECODER'):
            m.verify_recheck(self.c,d)
    def test_raw_source_text_leak_denied(self):
        d=enhanced(self.c);d['assets'][-1]['rawOCRTextPersisted']=True
        with self.assertRaisesRegex(ValueError,'UNAUTHORIZED_RAW_IMAGE_OR_TEXT'):
            m.verify_recheck(self.c,d)
    def test_forged_academic_review_denied(self):
        d=enhanced(self.c);d['results'][-1]['qualifiedFacultyApproved']=True
        with self.assertRaisesRegex(ValueError,'RESULT_NOT_TRUSTED_RESEARCH_ONLY'):
            m.verify_recheck(self.c,d)
    def test_forged_claim_of_textbook_question_page_verification_denied(self):
        d=enhanced(self.c);d['results'][-1]['academicQuestionContentPageVerified']=True
        with self.assertRaisesRegex(ValueError,'RESULT_NOT_TRUSTED_RESEARCH_ONLY'):
            m.verify_recheck(self.c,d)
    def test_question_result_outside_page_denied(self):
        d=enhanced(self.c);d['results'][-1]['page']=999
        with self.assertRaisesRegex(ValueError,'RESULT_OUTSIDE_COMPLETED_PAGE'):
            m.verify_recheck(self.c,d)
    def test_duplicate_question_page_denied(self):
        d=enhanced(self.c);d['results'].append(copy.deepcopy(d['results'][-1]))
        with self.assertRaisesRegex(ValueError,'DUPLICATE_QUESTION_PAGE'):
            m.verify_recheck(self.c,d)
    def test_source_fingerprint_changed_denied(self):
        d=enhanced(self.c);d['sourceFingerprint']='modified'
        with self.assertRaisesRegex(ValueError,'SOURCE_FINGERPRINT_DRIFT'):
            m.verify_recheck(self.c,d)
    def test_forged_publish_denied(self):
        d=enhanced(self.c);d['published']=True
        with self.assertRaisesRegex(ValueError,'RELEASE_OR_RAW_TEXT_FORGED'):
            m.verify_recheck(self.c,d)
    def test_original_research_evidence_not_automatically_approved(self):
        d=copy.deepcopy(self.c);d['results'][0]['academicQuestionContentPageVerified']=True
        with self.assertRaisesRegex(ValueError,'UNAUTHORIZED_SOURCE_APPROVAL'):
            m.build(d)
if __name__=='__main__':unittest.main()
