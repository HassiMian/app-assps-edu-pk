"""Hermetic checks for Grade IX/X 998 textbook page evidence research-only routing."""
import copy,importlib.util,json
from pathlib import Path
import unittest
R=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('grade910_cross_source_readonly',R/'ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py')
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)

def fixtures():
    mapping=[
      ('Q1','cat1',5,'TEXT_LAYER_INSUFFICIENT','READABLE_OCR_NO_EXACT_STEM','math',9),
      ('Q2','cat1',6,'TEXT_LAYER_INSUFFICIENT','HIGH_CONFIDENCE_OCR_EXACT_STEM_CANDIDATE','physics',9),
      ('Q3','cat2',7,'STEM_TOO_SHORT_FOR_SAFE_EXACT_PHRASE',None,'health-sciences-tech',10),
      ('Q4','cat2',8,'READABLE_TEXT_NO_EXACT_STEM',None,'english',10),
      ('Q5','cat2',9,'TEXT_LAYER_INSUFFICIENT',None,'health-sciences-tech',10)]
    layer={'schema':'EXISTING_SOURCE_TEXT_LAYER','summary':{'claimsChecked':len(mapping),'strictExactStemMatches':0},'records':[]}
    ocr={'schema':'ASSPS_GRADE910_OCR_RESUME_V1','academicApproved':False,'published':False,'rawTextPersisted':False,'results':[]}
    frozen={'rows':[]}
    proof={'academicallyApprovedQuestionsCreated':0,'paperStudioVerifiedQuestionsPublished':0,'allQuestionPageIdsStable':True}
    for id,catalog,page,cat,ocr_cat,subject,grade in mapping:
      layer['records'].append({'questionId':id,'sourceCatalog':catalog,'originallyClaimedPdfPage':page,
      'pdfTextLayerSHA256':'d'*64,'category':cat,'strictExactStemPresent':False,
      'actualQuestionPageAcademicallyVerified':False,'genuineQualifiedFacultyApproved':False,'approvedForPaperStudio':False})
      frozen['rows'].append({'questionId':id,'sourceCatalogId':catalog,'originalRevisionSha256':id.zfill(64),
      'originalGradeClaim':grade,'originalSubjectClaim':subject,'provisionalReviewSubject':subject,
      'originalMediumClaim':'english','schoolAdoptionVerified':False,'approved':False,
      'published':False,'paperStudioSelectable':False,'independentHumanAccuracyReview':False,
      'reviewerIdentityVerified':False})
      if ocr_cat:
        ocr['results'].append({'questionId':id,'catalog':catalog,'page':page,
           'category':ocr_cat,'exactStemCandidate':ocr_cat.startswith('HIGH_'),
           'averageConfidence':94,
           'nodePdfJsFilesystemWasmLoaderPathConfigured':True,
           'pdfJsDecoderResourceUrlsExplicitlyConfigured':True,
           'academicQuestionContentPageVerified':False,
           'qualifiedFacultyApproved':False,'autoPublished':False})
    return layer,ocr,frozen,proof

class SourceReviewRoutingTests(unittest.TestCase):
 def evaluate(self,layer=None,ocr=None,frozen=None,proof=None):
   a,b,c,d=fixtures()
   return m.reconcile(layer or a,ocr or b,frozen or c,proof or d,strict=False)
 def test_all_five_cases_route_with_zero_approval(self):
   r=self.evaluate()
   self.assertEqual(r['reviewCandidates'],5)
   self.assertEqual(r['academicallyApprovedQuestions'],0)
   self.assertEqual(r['publishedQuestions'],0)
   self.assertEqual(r['productionDatabaseWrites'],0)
   self.assertEqual(r['evidenceDistribution']['OCR_EXACT_STEM_RESEARCH_CANDIDATE_NOT_VERIFIED'],1)
   self.assertEqual(r['evidenceDistribution']['UNREADABLE_NO_ELIGIBLE_OCR'],1)
 def test_tech_stream_still_not_school_adopted(self):
   r=self.evaluate()
   self.assertEqual(sum(x['routing'].startswith('SCHOOL_TECH_') for x in r['priorityEvidenceItems']),2)
   self.assertTrue(all(x['specificTextbookQuestionPageVerified'] is False for x in r['priorityEvidenceItems']))
 def test_duplicate_textlayer_record_rejected(self):
   a,b,c,d=fixtures();a['records'][1]=copy.deepcopy(a['records'][0])
   with self.assertRaisesRegex(ValueError,'TEXT_LAYER_DUPLICATE'):
    self.evaluate(layer=a)
 def test_ocr_unknown_catalog_or_question_rejected(self):
   a,b,c,d=fixtures();b['results'][0]['questionId']='newid'
   with self.assertRaisesRegex(ValueError,'NOT_IN_TEXT_LAYER'):
    self.evaluate(ocr=b)
 def test_mismatched_frozen_catalog_rejected(self):
   a,b,c,d=fixtures();c['rows'][0]['sourceCatalogId']='other'
   with self.assertRaisesRegex(ValueError,'NOT_FROZEN_ORIGINAL'):
    self.evaluate(frozen=c)
 def test_fake_adoption_or_approved_original_rejected(self):
   a,b,c,d=fixtures();c['rows'][0]['schoolAdoptionVerified']=True
   with self.assertRaisesRegex(ValueError,'FAKE_APPROVAL'):
    self.evaluate(frozen=c)
 def test_fake_verified_text_layer_question_page_rejected(self):
   a,b,c,d=fixtures();a['records'][0]['actualQuestionPageAcademicallyVerified']=True
   with self.assertRaisesRegex(ValueError,'FAKE_VERIFIED_PAGE'):
    self.evaluate(layer=a)
 def test_fake_ocr_teacher_approval_rejected(self):
   a,b,c,d=fixtures();b['results'][0]['qualifiedFacultyApproved']=True
   with self.assertRaisesRegex(ValueError,'DECODER_OR_FACULTY'):
    self.evaluate(ocr=b)
 def test_fake_ocr_exact_without_correct_confidence_category_rejected(self):
   a,b,c,d=fixtures();b['results'][0]['exactStemCandidate']=True
   with self.assertRaisesRegex(ValueError,'OCR_EXACT_CANDIDATE_WITHOUT_CONFIDENCE'):
    self.evaluate(ocr=b)
 def test_ocr_missing_wasm_decoder_rejected(self):
   a,b,c,d=fixtures();b['results'][0]['nodePdfJsFilesystemWasmLoaderPathConfigured']=False
   with self.assertRaisesRegex(ValueError,'DECODER_OR_FACULTY'):
    self.evaluate(ocr=b)
 def test_publication_signaled_in_full_ocr_audit_rejected(self):
   a,b,c,d=fixtures();d['paperStudioVerifiedQuestionsPublished']=1
   with self.assertRaisesRegex(ValueError,'INVALID_FULL_OCR_INTEGRITY_PROOF'):
    self.evaluate(proof=d)
 def test_copied_source_text_never_exported(self):
   r=self.evaluate()
   s=json.dumps(r,ensure_ascii=False)
   for term in ['questionText','studentName','rawOCRText','rawPageImage']:
    self.assertNotIn(term,s)
 def test_all_entries_have_revision_binding(self):
   r=self.evaluate()
   self.assertEqual(len(set(x['originalRevisionSha256'] for x in r['priorityEvidenceItems'])),5)
   self.assertTrue(all(x['academicApproved'] is False and x['paperStudioVerifiedSelectable'] is False for x in r['priorityEvidenceItems']))
 def test_live_current_revision_id_and_hash_required(self):
   a,b,c,d=fixtures()
   live={'records':[{'questionId':r['questionId'],
           'grade':str(r['originalGradeClaim'])+'th','revisionSha256':'d'*64}
         for r in c['rows']]}
   ok=m.reconcile(a,b,c,d,strict=False,live=live)
   self.assertEqual(ok['originalSourceClaimIdsPresentInCurrentSchool1LiveBank'],5)
   self.assertTrue(all(x['currentLiveSchool1FullRevisionSha256']=='d'*64 for x in ok['priorityEvidenceItems']))
   live['records'][0]['grade']='10th'
   with self.assertRaisesRegex(ValueError,'NOT_IN_CURRENT_SCHOOL1_FULL_REVISION'):
     m.reconcile(a,b,c,d,strict=False,live=live)
 def test_changed_or_missing_current_live_question_revision_denied(self):
   a,b,c,d=fixtures()
   live={'records':[{'questionId':r['questionId'],
       'grade':str(r['originalGradeClaim'])+'th','revisionSha256':'d'*64}
       for r in c['rows']]}
   live['records'].pop()
   with self.assertRaisesRegex(ValueError,'NOT_IN_CURRENT_SCHOOL1_FULL_REVISION'):
     m.reconcile(a,b,c,d,strict=False,live=live)
 def test_duplicate_current_live_question_id_rejected(self):
   a,b,c,d=fixtures()
   live={'records':[{'questionId':r['questionId'],
       'grade':str(r['originalGradeClaim'])+'th','revisionSha256':'d'*64}
       for r in c['rows']]}
   live['records'].append(copy.deepcopy(live['records'][0]))
   with self.assertRaisesRegex(ValueError,'DUPLICATE_LIVE_SCHOOL1_REVISION_IDS'):
     m.reconcile(a,b,c,d,strict=False,live=live)
 def test_all_real_source_998_claims_and_765_ocr_validated_only_on_vps(self):
   if not m.TEXT.exists() or not m.OCR.exists() or not m.FINAL.exists():
    self.skipTest('Original source evidence restricted to VPS')
   a=m.load_real()
   self.assertEqual(a['reviewCandidates'],998)
   self.assertEqual(a['validatedDecoderOCRQuestionClaims'],765)
   self.assertEqual(a['originalSourceClaimIdsPresentInCurrentSchool1LiveBank'],998)
   self.assertEqual(a['evidenceDistribution']['OCR_READABLE_NO_EXACT_STEM'],764)
   self.assertEqual(a['evidenceDistribution']['OCR_EXACT_STEM_RESEARCH_CANDIDATE_NOT_VERIFIED'],1)

if __name__=='__main__': unittest.main()
