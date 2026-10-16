"""Hermetic proof of 112-page, 765-ID OCR recheck comparison; no textbook text."""
import copy,importlib.util,json
from pathlib import Path
import unittest
HERE=Path(__file__).resolve().parents[2]
def module(name,path):
 sp=importlib.util.spec_from_file_location(name,path)
 x=importlib.util.module_from_spec(sp);sp.loader.exec_module(x);return x
audit=module('grade910_ocr_full_quality_assessment',HERE/'ops/qbank/verify-grade910-ocr-legacy-full-comparison-20261016.py')
fixture=module('grade910_ocr_local_fixture',HERE/'ops/tests/test_grade910_ocr_legacy_recheck_immutability_20261016.py')
class OCRAll112ComparisonTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.base=fixture.fixture()
  cls.rechecked=fixture.enhanced(cls.base,62)
 def test_all_62_pages_complete_and_765_question_ids_preserved(self):
  s=audit.build_assessment(self.base,self.rechecked)
  self.assertEqual(s['oldUnreliablePagesRecheckedWithDecoder'],62)
  self.assertEqual(s['rescanProgressCompleted'],112)
  self.assertEqual(s['totalQuestionPageCandidatesChecked'],765)
  self.assertEqual(s['newlyRecheckedLegacyQuestionPageRecords'],415)
  self.assertEqual(s['previousReliableQuestionPageRecordsUnchanged'],350)
 def test_not_full_112_recheck_is_not_certifiable(self):
  with self.assertRaisesRegex(ValueError,'NOT_FULL_112'):
   audit.build_assessment(self.base,fixture.enhanced(self.base,61))
 def test_category_change_is_still_not_an_academic_approval(self):
  d=copy.deepcopy(self.rechecked)
  d['results'][-1]['category']='HIGH_CONFIDENCE_OCR_EXACT_STEM_CANDIDATE'
  d['results'][-1]['exactStemCandidate']=True
  s=audit.build_assessment(self.base,d)
  self.assertEqual(s['newlyRecheckedHighConfidenceExactStemCandidates'],1)
  self.assertFalse(s['individualPrintedTextbookExercisePageClaimVerified'])
  self.assertFalse(s['actualASSPSAdoptedTextbookEditionConfirmed'])
 def test_mapping_mutation_is_rejected(self):
  d=copy.deepcopy(self.rechecked)
  d['results'][-1]['questionId']='different-meaning'
  with self.assertRaisesRegex(ValueError,'QUESTION_ID_PAGE_MAPPING_CHANGED'):
   audit.build_assessment(self.base,d)
 def test_forged_teacher_approval_fails_closed(self):
  d=copy.deepcopy(self.rechecked)
  d['results'][-1]['qualifiedFacultyApproved']=True
  with self.assertRaisesRegex(ValueError,'RESULT_NOT_TRUSTED_RESEARCH_ONLY'):
   audit.build_assessment(self.base,d)
 def test_all_112_decoder_flags_required(self):
  d=copy.deepcopy(self.rechecked)
  d['assets'][-1]['nodePdfJsFilesystemWasmLoaderPathConfigured']=False
  with self.assertRaisesRegex(ValueError,'MISSING_VALIDATED_PDFJS_DECODER'):
   audit.build_assessment(self.base,d)
 def test_frozen_original_50_trusted_evidence_not_mutable(self):
  d=copy.deepcopy(self.rechecked)
  d['assets'][3]['ocrMeanConfidence']=0
  with self.assertRaisesRegex(ValueError,'PREVIOUS_50_TRUSTED_ASSETS_CHANGED'):
   audit.build_assessment(self.base,d)
 def test_raw_copyrighted_source_text_not_recorded_in_public_receipt(self):
  s=audit.build_assessment(self.base,self.rechecked)
  self.assertFalse(s['rawTextOrPageImagesPersisted'])
  self.assertFalse(s['copyrightedSourceTextInThisReceipt'])
  self.assertNotIn('questionText',json.dumps(s))
  self.assertNotIn('student',json.dumps(s))
 def test_approval_and_paperstudio_publication_remain_zero(self):
  s=audit.build_assessment(self.base,self.rechecked)
  self.assertFalse(s['independentQualifiedFacultyApproved'])
  self.assertEqual(s['academicallyApprovedQuestionsCreated'],0)
  self.assertEqual(s['paperStudioVerifiedQuestionsPublished'],0)
  self.assertEqual(s['liveQuestionOrStudentDatabaseWrites'],0)
 def test_evidence_confidence_aggregates_have_no_private_rows(self):
  s=audit.build_assessment(self.base,self.rechecked)
  self.assertEqual(sum(s['originalLegacyCategories'].values()),415)
  self.assertEqual(sum(s['recheckedLegacyCategories'].values()),415)
  self.assertEqual(sum(s['legacyCategoryTransitions'].values()),415)
  self.assertTrue(isinstance(s['recheckedLegacyMeanOCRConfidence'],float))
if __name__=='__main__':unittest.main()
