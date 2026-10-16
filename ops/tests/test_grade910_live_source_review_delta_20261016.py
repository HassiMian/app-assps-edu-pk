import copy
import importlib.util
import tempfile
import unittest
from pathlib import Path

SRC=Path(__file__).resolve().parents[1]/'qbank/build-grade910-live-source-review-delta-20261016.py'
spec=importlib.util.spec_from_file_location('sourcequeue',SRC)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def datasets():
 orig=[]
 for i in range(2581):
  orig.append({'questionId':f'G-{i:04d}','originalRevisionSha256':'a'*64,
   'originalResearchFileSha256':'b'*64,'groupKey':f'cohort-{i%56}',
   'provisionalReviewGrade':9,'provisionalReviewSubject':'Physics',
   'provisionalReviewMedium':'english','questionType':'short',
   'sourceCatalogId':'book-001'})
 live=[{'seedId':f'G-{i:04d}','catalog':'book-001','grade':'9th',
        'claimKind':'author_page_claim' if i<998 else 'chapter_only',
        'dbApproved':False} for i in range(2411)]
 held=[{'questionId':f'G-{i:04d}','approved':False,
        'existingUnsignedFacultyForm':True} for i in range(2411,2581)]
 pages=[{'questionId':f'G-{i:04d}','sourceCatalog':'book-001',
         'originallyClaimedPdfPage':i%100+1,
         'category':'TEXT_LAYER_INSUFFICIENT'} for i in range(998)]
 pilot=[{'questionId':'G-0000','catalog':'book-001','page':1,
         'exactStemCandidate':True,'qualifiedFacultyApproved':False,'autoPublished':False}]
 progress={'schema':'ASSPS_GRADE910_OCR_RESUME_V1','academicApproved':False,
    'published':False,'completedPages':[],'results':[]}
 near=[{'originalId':f'G-{i:04d}','potentialSimilarCount':0}
       for i in range(2411,2581)]
 adoption={'schoolEditionAdoptionVerifiedByThisAudit':False,'academicQuestionApprovalGained':0}
 rev={'schema':'ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1','revisions':2411,
      'humanReviewerSignedRevisions':0,'academicallyApprovedRevisions':0,'databaseWrites':0,
      'records':[{'questionId':f'G-{i:04d}','revisionSha256':('c'*64),
                  'grade':'9th'} for i in range(2411)]}
 return [orig,live,held,pages,pilot,progress,near,adoption,
         {'frozenOriginals':'0'*64},rev,None]

class ReviewDeltaSafety(unittest.TestCase):
 def test_complete_2581_overlay_is_never_an_approval(self):
  q=m.build(*datasets())
  self.assertEqual(q['originalResearchQuestionIds'],2581)
  self.assertEqual(q['liveProvisionalIds'],2411)
  self.assertEqual(q['protectedOriginalOnlyIds'],170)
  self.assertEqual(q['existingFacultyCohorts'],56)
  self.assertEqual(q['countsByRequiredReviewLane']['P0_MACHINE_CORROBORATED_NEEDS_EDITION_AND_FACULTY'],1)
  self.assertEqual(q['qualifiedFacultyDecisionsForged'],0)
  self.assertEqual(q['verifiedPublisherSelectableQuestionsCreated'],0)
  self.assertTrue(all(not r['authenticQualifiedReviewerApproved'] for r in q['records']))
 def test_actual_live_revision_hash_separate_from_frozen_original_hash(self):
  q=m.build(*datasets());d=next(x for x in q['records'] if x['questionId']=='G-0001')
  self.assertNotEqual(d['originalRevisionSha256'],d['actualLiveContentRevisionSha256'])
  held=next(x for x in q['records'] if x['questionId']=='G-2411')
  self.assertIsNone(held['actualLiveContentRevisionSha256'])
  self.assertTrue(held['protectedOriginalNotLive'])
 def test_out_of_scope_live_identity_fails(self):
  a=datasets();a[1][0]['seedId']='UNKNOWN'
  with self.assertRaises(ValueError):m.build(*a)
 def test_bad_pdf_page_or_catalog_join_fails(self):
  a=datasets();a[3][0]['originallyClaimedPdfPage']=None
  with self.assertRaises(ValueError):m.build(*a)
  b=datasets();b[1][0]['catalog']='wrong'
  with self.assertRaises(ValueError):m.build(*b)
 def test_forged_original_and_ocr_publications_fail(self):
  a=datasets();a[2][0]['approved']=True
  with self.assertRaises(ValueError):m.build(*a)
  b=datasets();b[4][0]['qualifiedFacultyApproved']=True
  with self.assertRaises(ValueError):m.build(*b)
 def test_invalid_live_sha_or_approvals_fail(self):
  a=datasets();a[9]['records'][0]['revisionSha256']='not-a-hash'
  with self.assertRaises(ValueError):m.build(*a)
  b=datasets();b[9]['academicallyApprovedRevisions']=1
  with self.assertRaises(ValueError):m.build(*b)
 def test_truncated_full_ocr_receipt_never_claims_completion(self):
  a=datasets()
  a[10]={'summary':{'scope':'ALL_ELIGIBLE_ENGLISH_SCANNED_PAGES',
     'pagesScannedNow':111,'uniquePagesEligibleForLastResortOCR':112,
     'productionDatabaseWrites':0,'publishedQuestions':0}}
  with self.assertRaises(ValueError):m.build(*a)
 def test_private_atomic_receipt_permission(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'protected'/'faculty-delta.json'
   m.save(p,{'academicApproved':False})
   self.assertEqual(p.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
