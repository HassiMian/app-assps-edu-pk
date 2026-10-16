"""VPS + hermetic 230 Grade X source-page evidence firewall integration."""
from __future__ import annotations
import copy,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
s=importlib.util.spec_from_file_location('grade10_230_current_source_review',ROOT/'ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
COUNTS={
'pectaa-recovered-chemistry10-en-2026':65,
'pectaa-catalog-017':60,'pectaa-catalog-057':30,'pectaa-catalog-049':27,
'pectaa-catalog-054':24,'pectaa-catalog-062':24}
def fixture():
 manifest=json.loads((ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json').read_text())
 entry={x['recordId']:x for x in manifest['entries']}
 frozen={'rows':[]}
 layer={'schema':'TEST_TEXT_LAYER_ONLY','summary':{'claimsChecked':230,'strictExactStemMatches':0},'records':[]}
 ocr={'schema':'ASSPS_GRADE910_OCR_RESUME_V1','academicApproved':False,'published':False,'rawTextPersisted':False,'results':[]}
 proof={'academicallyApprovedQuestionsCreated':0,'paperStudioVerifiedQuestionsPublished':0,'allQuestionPageIdsStable':True}
 live={'records':[]}
 audit={'schema':'ASSPS_GRADE10_230_SHORT_NATIVE_SOURCE_PAGE_BOUNDED_V1',
  'scopedExistingClaims':230,'originalNativeTextNotVerifiedClaims':124,
  'originalShortAmbiguousClaims':106,'numberOfOriginalSourcePDFs':6,
  'numberOfOriginalSourcePhysicalClaimPages':49,
  'examinedWindowRadiusInPhysicalPDFPages':1,'pdfs':[],'rows':[],
  'dispositionCounts':{'SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN':106,
   'READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW':124},
  'asspsAdoptedBookEditionVerified':False,'independentlyVerifiedExactExercisePageClaims':0,
  'qualifiedSubjectOrUrduAcademicReviews':0,'academicallyApprovedQuestions':0,
  'paperStudioVerifiedSelectableQuestions':0,'productionDatabaseWrites':0,
  'originalQuestionsAndTextbookExtractsPersisted':False}
 for cat,n in COUNTS.items():
  src=entry[cat]
  audit['pdfs'].append({'sourceCatalogId':cat,'sourcePDFSHA256':src['pdfSha256'],
   'physicalPDFPages':src['pdfPageCount'],'originalOfficialCatalogMedium':src['medium'],
   'uniquePhysicalPagesNativeTextChecked':3,'pagesWithInsufficientNativeText':0})
  for j in range(n):
   index=len(frozen['rows'])
   id='X-ORIGINAL-RESEARCH-CLAIM-'+str(index).zfill(4)
   short=index<106
   src_category='STEM_TOO_SHORT_FOR_SAFE_EXACT_PHRASE' if short else 'READABLE_TEXT_NO_EXACT_STEM'
   review_category='SHORT_STEM_NEEDS_EXERCISE_REVIEW' if short else 'TEXT_LAYER_READABLE_NO_EXACT_STEM'
   disposal='SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN' if short else 'READABLE_NATIVE_TEXT_NO_EXACT_STEM_IN_BOUNDED_WINDOW'
   frozen['rows'].append({'questionId':id,'sourceCatalogId':cat,'originalGradeClaim':10,
    'originalRevisionSha256':'b'*64,'originalSubjectClaim':'mathematics','originalMediumClaim':'english',
    'provisionalReviewSubject':'mathematics','schoolAdoptionVerified':False,
    'approved':False,'published':False,'paperStudioSelectable':False,
    'independentHumanAccuracyReview':False,'reviewerIdentityVerified':False})
   layer['records'].append({'questionId':id,'sourceCatalog':cat,
    'originallyClaimedPdfPage':2,'category':src_category,'pdfTextLayerSHA256':'c'*64,
    'strictExactStemPresent':False,
    'actualQuestionPageAcademicallyVerified':False,'genuineQualifiedFacultyApproved':False,
    'approvedForPaperStudio':False})
   live['records'].append({'questionId':id,'grade':'10th','revisionSha256':'a'*64})
   audit['rows'].append({
    'questionId':id,'grade':10,'sourceCatalogId':cat,'originalClaimedPhysicalPDFPage':2,
    'currentLiveRevisionSHA256':'a'*64,'frozenOriginalStemSHA256':'d'*64,'reason':review_category,
    'fullStemSafeForExactPhrase':not short,'checkedPhysicalPages':[1,2,3],
    'claimedPhysicalPageExactPhraseOccurrences':0,'neighboringPhysicalPageExactPhraseOccurrences':0,
    'claimedPDFPhysicalPageNativeTextReadable':True,'evidenceDisposition':disposal,
    'authenticASSPSBookAdoptionProven':False,
    'academicallyVerifiedPrintedExercisePage':False,
    'academicReviewerAuthenticated':False,'paperStudioSelectable':False})
 return layer,ocr,frozen,proof,live,audit
class Native230RevisionAcademicHold(unittest.TestCase):
 def evaluate(self,edit=None):
  x=list(fixture())
  if edit:edit(*x)
  return m.reconcile(*x[:4],strict=False,live=x[4],native230=x[5])
 def test_full_230_revision_join_preserves_zero_approval(self):
  r=self.evaluate()
  self.assertEqual(r['grade10OriginalNativeTextAndShortClaimWindowsIndependentlyChecked'],230)
  self.assertEqual(r['grade10ShortAndNativeSourcePagesAcademicallyApproved'],0)
  self.assertEqual(r['academicallyApprovedQuestions'],0)
  self.assertEqual(r['publishedQuestions'],0)
 def test_no_230_alias_collision_with_existing_998_category(self):
  r=self.evaluate()
  self.assertEqual(len(r['priorityEvidenceItems']),230)
  self.assertEqual(sum(x['newSourceEvidenceDisposition']=='SHORT_OR_AMBIGUOUS_STEM_NOT_PROVEN'
                       for x in r['priorityEvidenceItems']),106)
 def test_wrong_current_revision_denied(self):
  with self.assertRaisesRegex(ValueError,'CURRENT_SHA_SOURCE_PAGE_MISMATCH'):
   self.evaluate(lambda a,b,c,d,e,f:f['rows'][0].update(currentLiveRevisionSHA256='f'*64))
 def test_fabricated_school_adoption_denied(self):
  with self.assertRaisesRegex(ValueError,'FALSE_TEXTBOOK_CERTIFICATION'):
   self.evaluate(lambda a,b,c,d,e,f:f.update(asspsAdoptedBookEditionVerified=True))
 def test_manual_short_question_cannot_be_auto_promoted(self):
  with self.assertRaisesRegex(ValueError,'NATIVE_106_AMBIGUOUS'):
   self.evaluate(lambda a,b,c,d,e,f:f['rows'][0].update(
     evidenceDisposition='EXACT_NATIVE_TEXT_ON_CLAIMED_PHYSICAL_PAGE_RESEARCH_ONLY'))
 def test_claimed_page_changed_denied(self):
  with self.assertRaisesRegex(ValueError,'CURRENT_SHA_SOURCE_PAGE_MISMATCH'):
   self.evaluate(lambda a,b,c,d,e,f:f['rows'][0].update(originalClaimedPhysicalPDFPage=7))
 def test_wrong_pdf_hash_denied(self):
  with self.assertRaisesRegex(ValueError,'PDF_SOURCE_FINGERPRINT'):
   self.evaluate(lambda a,b,c,d,e,f:f['pdfs'][0].update(sourcePDFSHA256='0'*64))
 def test_native_page_was_not_readable_denied(self):
  with self.assertRaisesRegex(ValueError,'PDF_SOURCE_FINGERPRINT'):
   self.evaluate(lambda a,b,c,d,e,f:f['pdfs'][0].update(pagesWithInsufficientNativeText=1))
 def test_raw_text_leak_denied(self):
  with self.assertRaisesRegex(ValueError,'CURRENT_SHA_SOURCE_PAGE_MISMATCH'):
   self.evaluate(lambda a,b,c,d,e,f:f['rows'][0].update(rawPageText='copyrighted page'))
 def test_fake_textbook_exercise_page_denied(self):
  with self.assertRaisesRegex(ValueError,'FALSE_TEXTBOOK_CERTIFICATION'):
   self.evaluate(lambda a,b,c,d,e,f:f.update(independentlyVerifiedExactExercisePageClaims=1))
 def test_real_vps_bounded_230_proof_when_connected(self):
  if not m.NATIVE230.exists():self.skipTest('VPS-only private source proof')
  r=m.load_real()
  self.assertEqual(r['grade10OriginalNativeTextAndShortClaimWindowsIndependentlyChecked'],230)
  self.assertEqual(r['academicallyApprovedQuestions'],0)
if __name__=='__main__':unittest.main()
