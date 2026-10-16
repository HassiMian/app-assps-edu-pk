"""Hermetic revision-bound research-only recovery of 3 previously unscanned unknown-medium source claims."""
import copy,importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
def loaded(name,p):
 s=importlib.util.spec_from_file_location(name,p)
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=loaded('grade910_998_source_overlay_tech',ROOT/'ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py')
fx=loaded('grade910_998_source_fixture',ROOT/'ops/tests/test_grade910_998_source_gap_review_queue_20261016.py')
IDS=['X-HS-TECH-C17-L01','X-HS-TECH-C17-M01','X-HS-TECH-C17-S01']
def fixture():
 layer,ocr,original,final=fx.fixtures()
 for i,qid in enumerate(IDS,start=2):
  row=layer['records'][i]
  row.update(questionId=qid,sourceCatalog='pectaa-catalog-054',
             originallyClaimedPdfPage=102,category='TEXT_LAYER_INSUFFICIENT')
  item=original['rows'][i]
  item.update(questionId=qid,sourceCatalogId='pectaa-catalog-054',
              originalGradeClaim=10,originalSubjectClaim='health-sciences-tech',
              provisionalReviewSubject='health-sciences-tech')
 live={'records':[{'questionId':x['questionId'],
    'grade':str(x['originalGradeClaim'])+'th','revisionSha256':'a'*64}
     for x in original['rows']]}
 def lang(words,conf,status,exact=False):
  return {'tokenCount':words,'meanConfidence':conf,
    'reliability':status,'substantialExactStemResearchCandidate':exact}
 supplemental={
  'schema':'ASSPS_C054_PAGE102_BILINGUAL_OCR_RESEARCH_ONLY_V1',
  'grade':10,'catalog':'pectaa-catalog-054','page':102,
  'originalPDFSHA256':'f69e2553dc39f30fc2f76bda87934cd927c45a5b12e7c8e6305f6ccc6e3aa906',
  'originalFrozenQuestionFileSHA256':'544e7b9b1dfc157e9b1199606bf5a84d52120534d993b1249f9064c403244a74',
  'mediumNotEstablishedByOfficialCatalog':True,
  'officialSchoolStreamAdoptionVerified':False,
  'officialSchoolTextbookEditionVerified':False,
  'independentlyVerifiedPrintedQuestionPage':False,
  'authenticatedQualifiedReviewers':0,
  'academicApprovedQuestions':0,'publishedQuestions':0,'productionDatabaseWrites':0,
  'rawTextOrPDFImagesPersisted':False,'languagesTried':['eng','urd'],
  'results':[{
   'questionId':qid,'currentLiveQuestionRevisionSHA256':'a'*64,
   'originalQuestionStemSHA256':'b'*64,
   'languageDiagnostics':{
    'eng':lang(261,85.6,'OCR_RENDER_READABLE_NOT_SOURCE_PAGE_APPROVAL'),
    'urd':lang(309,32.1,'OCR_NOT_RELIABLE_FOR_EXACT_STEM')
   },'verifiedQuestionAnswerPage':False,'teacherApproved':False,
   'paperStudioVerifiedSelectable':False,
  }for qid in IDS]}
 return layer,ocr,original,final,live,supplemental
class MediumUnknownOCRAcademicFirewall(unittest.TestCase):
 def evaluate(self,mutate=None):
  a,b,c,d,live,sup=fixture()
  if mutate:mutate(a,b,c,d,live,sup)
  return m.reconcile(a,b,c,d,strict=False,live=live,supplemental=sup)
 def test_three_previously_unscanned_now_readable_only_not_approved(self):
  r=self.evaluate()
  self.assertEqual(r['supplementalSourceClaimsIndependentlyOCRChecked'],3)
  self.assertEqual(r['totalClaimsWithSomeValidatedDecoderOCRScreening'],5)
  self.assertEqual(r['evidenceDistribution']['UNKNOWN_MEDIUM_BILINGUAL_OCR_READABLE_NO_EXACT_STEM'],3)
  self.assertEqual(r['academicallyApprovedQuestions'],0)
 def test_original_english_only_exclusion_not_erased(self):
  r=self.evaluate()
  got=[x for x in r['priorityEvidenceItems'] if x['questionId'] in IDS]
  self.assertEqual(len(got),3)
  self.assertTrue(all(x['originalEnglishOnlyOCRExclusion']=='UNKNOWN_CATALOG_MEDIUM_EXCLUDED_NOT_UNREADABLE_PDF' for x in got))
  self.assertTrue(all(x['sourceComparisonEvidenceCategory']=='UNKNOWN_MEDIUM_BILINGUAL_OCR_READABLE_NO_EXACT_STEM' for x in got))
 def test_source_medium_unverified_not_inferred_as_english(self):
  r=self.evaluate()
  self.assertFalse(r['schoolAdoptionAuthenticated'])
  self.assertTrue(all(x['originalBookEditionAdoptionAuthenticated'] is False for x in r['priorityEvidenceItems']))
 def test_wrong_revision_sha_rejected(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_SOURCE_CURRENT_REVISION_EVIDENCE_DRIFT'):
   self.evaluate(lambda a,b,c,d,l,s:s['results'][0].update(currentLiveQuestionRevisionSHA256='f'*64))
 def test_wrong_original_claimed_pdf_page_rejected(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_SOURCE_CURRENT_REVISION_EVIDENCE_DRIFT'):
   self.evaluate(lambda a,b,c,d,l,s:a['records'][2].update(originallyClaimedPdfPage=101))
 def test_unauthenticated_school_stream_is_never_auto_approved(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_BILINGUAL_OCR_RESEARCH_NOT_TRUSTED'):
   self.evaluate(lambda a,b,c,d,l,s:s.update(officialSchoolStreamAdoptionVerified=True))
 def test_english_not_readable_fail_closed(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_SOURCE_CURRENT_REVISION_EVIDENCE_DRIFT'):
   self.evaluate(lambda a,b,c,d,l,s:s['results'][0]['languageDiagnostics']['eng'].update(meanConfidence=20))
 def test_bilingual_stem_candidate_cannot_claim_exact_pdf_page(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_SOURCE_CURRENT_REVISION_EVIDENCE_DRIFT'):
   self.evaluate(lambda a,b,c,d,l,s:s['results'][0]['languageDiagnostics']['eng'].update(substantialExactStemResearchCandidate=True))
 def test_inconsistent_language_diagnostic_does_not_promote_urdu_to_verified(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_SOURCE_CURRENT_REVISION_EVIDENCE_DRIFT'):
   self.evaluate(lambda a,b,c,d,l,s:s['results'][0].update(verifiedQuestionAnswerPage=True))
 def test_stems_or_raw_ocr_text_cannot_be_attached_to_public_research_queue(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_SUPPLEMENTAL_METADATA_NOT_PRIVATE_OR_COMPLETE'):
   self.evaluate(lambda a,b,c,d,l,s:s['results'][0].update(ocrText='copyrighted page'))
 def test_missing_supplementary_qa_item_is_not_hidden(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_BILINGUAL_OCR_RESEARCH_NOT_TRUSTED'):
   self.evaluate(lambda a,b,c,d,l,s:s['results'].pop())
 def test_changed_qualified_reviewer_flag_denied(self):
  with self.assertRaisesRegex(ValueError,'UNKNOWN_MEDIUM_SOURCE_CURRENT_REVISION_EVIDENCE_DRIFT'):
   self.evaluate(lambda a,b,c,d,l,s:s['results'][0].update(teacherApproved=True))
 def test_real_root_only_provenance_when_available(self):
  if not m.SUPPLEMENT.exists():self.skipTest('VPS only protected source PDF OCR proof')
  r=m.load_real()
  self.assertEqual(r['reviewCandidates'],998)
  self.assertEqual(r['supplementalSourceClaimsIndependentlyOCRChecked'],3)
  self.assertEqual(r['totalClaimsWithSomeValidatedDecoderOCRScreening'],768)
  self.assertEqual(r['evidenceDistribution'].get('UNREADABLE_NO_ELIGIBLE_OCR',0),0)
if __name__=='__main__':unittest.main()
