import importlib.util
import tempfile
import unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py'
s=importlib.util.spec_from_file_location('six_phase',P)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def fixtures():
 tech={'decision':'OPERATIONAL','metrics':{'scores':{'total_score_rows':1763}}}
 week={'decision':'QA_PASSED_NO_AUTOMATIC_ACADEMIC_PUBLICATION',
       'academicSourceChecks':{'qualityVerified':True,'passedBatches':30}}
 src={'summary':{'rows':2411,'cachedPdfHashesMatchingManifest':56,'cachedPdfHashesConflicting':0}}
 held={'sourceIdsNotInLive':170}
 pdf={'summary':{'catalogPdfFilesVerified':56,'originalAuthorPageClaims':998,
                 'pdfPageCountConflicts':0,'authorPageClaimsOutsideActualPdfRange':0}}
 text={'summary':{'claimsChecked':998,'independentlyVerifiedQuestionPages':0,'productionDatabaseWrites':0}}
 pilot={'summary':{'pagesScannedNow':6,'claimsCoveredNow':111,
                   'independentQuestionContentPagesVerified':0,'publishedQuestions':0}}
 ans={'liveCandidateRows':2411,'unapprovedProvisionalRows':2411,
      'unexpectedApprovedWithoutAuthenticatedReviewerEvidence':0,
      'substantiveOrStructuralAnswerConflicts':0,'recordCompletenessIssues':{},
      'mcqCandidates':809,'answerEqualsSelectedOptionExactly':803,'terminalPunctuationOnlyDifferences':6}
 return tech,week,src,held,pdf,text,pilot,None,ans
class ZeroHumanSixPhaseGuards(unittest.TestCase):
 def test_normal_machine_readiness_not_false_faculty_publication(self):
  p=m.evaluate(*fixtures())
  self.assertEqual(p['phaseCount'],6)
  self.assertEqual(p['machinePassedPhases'],4)
  self.assertFalse(p['academicVerifiedPublicationReady'])
  self.assertFalse(p['paperStudioAcademicallyApprovedSnapshotReady'])
  self.assertEqual(p['authenticIndependentAcademicApprovals'],0)
 def test_full_ocr_missing_is_properly_pending(self):
  p=m.evaluate(*fixtures())
  self.assertFalse(p['ocrFullRunCompleted'])
  self.assertFalse(p['phases'][1]['ocrFullCompleted'])
 def test_full_ocr_complete_only_counts_actual_eligible_pages(self):
  a=list(fixtures())
  a[7]={'summary':{'scope':'ALL_ELIGIBLE_ENGLISH_SCANNED_PAGES',
                   'pagesScannedNow':112,'uniquePagesEligibleForLastResortOCR':112,'productionDatabaseWrites':0}}
  self.assertTrue(m.evaluate(*a)['ocrFullRunCompleted'])
  a[7]['summary']['pagesScannedNow']=111
  self.assertFalse(m.evaluate(*a)['ocrFullRunCompleted'])
 def test_unsourced_approval_cannot_be_green(self):
  a=list(fixtures());a[8]['unapprovedProvisionalRows']=2410
  a[8]['unexpectedApprovedWithoutAuthenticatedReviewerEvidence']=1
  with self.assertRaises(ValueError):m.evaluate(*a)
 def test_pdf_sha_change_denies_source_ready(self):
  a=list(fixtures());a[2]['summary']['cachedPdfHashesConflicting']=1
  p=m.evaluate(*a)
  self.assertEqual(p['phases'][1]['status'],'HOLD_INCOMPLETE_SOURCE_EVIDENCE')
 def test_source_shrink_and_missing_zero_protection_fail_closed(self):
  a=list(fixtures());a[8]['liveCandidateRows']=2399
  with self.assertRaises(ValueError):m.evaluate(*a)
 def test_private_receipt_permissions(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'private'/'status.json'
   m.save(p,{'academicVerifiedPublicationReady':False})
   self.assertEqual(p.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
