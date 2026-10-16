"""Grade IX Physics page 5 second OCR proof: current SHA pin, fail closed no school adoption."""
import copy,importlib.util
from pathlib import Path
import unittest
R=Path(__file__).resolve().parents[2]
def load(name,p):
 s=importlib.util.spec_from_file_location(name,p)
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
source=load('current998_phy_source',R/'ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py')
fixtures=load('source_claim_original_998_offline_fixture',R/'ops/tests/test_grade910_998_source_gap_review_queue_20261016.py')
def make():
 a,b,c,d=fixtures.fixtures()
 target='IX-PHY-2025-C01-S01'
 a['records'][1].update(questionId=target,sourceCatalog='pectaa-catalog-011',
                          originallyClaimedPdfPage=5)
 b['results'][1].update(questionId=target,catalog='pectaa-catalog-011',page=5)
 c['rows'][1].update(questionId=target,sourceCatalogId='pectaa-catalog-011',
                      contentOrigin='additional')
 live={'records':[{'questionId':x['questionId'],'grade':str(x['originalGradeClaim'])+'th',
                  'revisionSha256':'a'*64} for x in c['rows']]}
 pages=[{'physicalPDFPage':page,'ocrRecognizedWords':254,'ocrAverageConfidence':90.9,
          'exactNormalizedPhraseOccurrences':int(page==5),
          'reliability':'READABLE_OCR_RESEARCH_ONLY','rawPageTextPersisted':False}
          for page in (4,5,6)]
 physics={
  'schema':'ASSPS_GRADE9_PHYSICS_THREE_PDF_PAGES_UNAPPROVED_OCR_SECOND_PASS_V1',
  'candidateQuestionId':target,'sourceCatalogId':'pectaa-catalog-011',
  'immutablePDFSHA256':'a77c9b5fd12e35de2a08390c2b93d10a59fa94fb4603e3349908e75c6b189794',
  'originalFrozenResearchFileSHA256':'1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16',
  'exactCurrentLiveQuestionRevisionSHA256':'a'*64,'originalStemSHA256':'b'*64,
  'sourcePDFPhysicalPages':204,'claimedPDFPhysicalPage':5,
  'independentPagesChecked':3,'checkedPhysicalPDFPages':[4,5,6],
  'pageEvidence':pages,'claimedPageStrictExactMatchResearchEvidence':True,
  'sourceSchoolAdoptedEditionVerified':False,'curriculumAcademicSessionApplicabilityVerified':False,
  'officialBookPrintedExercisePageVerified':False,'independentPhysicsTeacherAuthenticated':False,
  'academicQuestionAnswerApproved':False,'paperStudioVerifiedSelectable':False,
  'rawCopyrightedPageTextPersisted':False,'productionDatabaseWrites':0}
 return a,b,c,d,live,physics

class IndependentlyRescannedQuestionEvidence(unittest.TestCase):
 def check(self,change=None):
  a,b,c,d,live,physics=make()
  if change:change(a,b,c,d,live,physics)
  return source.reconcile(a,b,c,d,strict=False,live=live,physics=physics)
 def test_one_actual_stem_rechecked_three_adjacent_pages_stays_unapproved(self):
  d=self.check()
  self.assertEqual(d['independentPhysicsSingleExactStemPageAndNeighborsRechecked'],1)
  self.assertTrue(d['physicsSecondPassTextMatchStillNotAcademicPrintedExerciseProof'])
  r=next(x for x in d['priorityEvidenceItems'] if x['questionId']=='IX-PHY-2025-C01-S01')
  self.assertTrue(r['secondPassPage5ExactOCRPhraseReproduced'])
  self.assertTrue(r['adjacentPages4And6NoExactPhrase'])
  self.assertFalse(r['specificTextbookQuestionPageVerified'])
  self.assertFalse(r['academicApproved'])
  self.assertEqual(r['originalQuestionOriginClaim'],'additional')
 def test_not_teacher_review_from_pdfjs_stem(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p.update(independentPhysicsTeacherAuthenticated=True))
 def test_not_verified_printed_exercise_page(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p.update(officialBookPrintedExercisePageVerified=True))
 def test_not_school_adopted_from_cached_pdf(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p.update(sourceSchoolAdoptedEditionVerified=True))
 def test_changed_current_live_revision_denied(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p.update(exactCurrentLiveQuestionRevisionSHA256='f'*64))
 def test_changed_source_pdf_sha_denied(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p.update(immutablePDFSHA256='f'*64))
 def test_alternative_page_duplicate_exact_text_denied_for_this_frozen_evidence(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p['pageEvidence'][0].update(exactNormalizedPhraseOccurrences=1))
 def test_claimed_pdf_page_renumbered_is_not_same_evidence(self):
  with self.assertRaisesRegex(ValueError,'OCR_QUESTION_PAGE_NOT_IN_TEXT_LAYER_998_SET'):
   self.check(lambda a,b,c,d,l,p:a['records'][1].update(originallyClaimedPdfPage=6))
 def test_origin_exercise_fraud_denied(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:c['rows'][1].update(contentOrigin='exercise'))
 def test_raw_page_text_in_ocr_aggregate_denied(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p['pageEvidence'][1].update(rawPageTextPersisted=True))
 def test_incorrect_previously_readable_ocr_category_denied(self):
  with self.assertRaisesRegex(ValueError,'OCR_EXACT_CANDIDATE_WITHOUT_CONFIDENCE_CATEGORY'):
   self.check(lambda a,b,c,d,l,p:b['results'][1].update(category='READABLE_OCR_NO_EXACT_STEM'))
 def test_no_production_write_allowed_in_research(self):
  with self.assertRaisesRegex(ValueError,'NO_ACADEMIC_APPROVAL'):
   self.check(lambda a,b,c,d,l,p:p.update(productionDatabaseWrites=1))
 def test_no_pdf_source_text_in_research_priority_item(self):
  d=self.check()
  r=next(x for x in d['priorityEvidenceItems'] if x['questionId']=='IX-PHY-2025-C01-S01')
  self.assertNotIn('rawPageText',r)
  self.assertNotIn('questionText',r)
  self.assertNotIn('answer',r)
 def test_real_independent_three_page_vps_proof_available(self):
  if not source.PHYSICS.exists():self.skipTest('VPS-only page evidence')
  x=source.load_real()
  self.assertEqual(x['independentPhysicsSingleExactStemPageAndNeighborsRechecked'],1)
  self.assertEqual(x['academicallyApprovedQuestions'],0)

if __name__=='__main__':unittest.main()
