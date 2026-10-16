"""Validate newly complete 80/80 arithmetic proof cannot silently become academic signoff."""
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
def load(name,file):
 spec=importlib.util.spec_from_file_location(name,file)
 module=importlib.util.module_from_spec(spec)
 spec.loader.exec_module(module)
 return module
m=load('assps_academic_six_phase_current',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
old=load('assps_existing_six_phase_fixtures',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
LEGACY={'schema':'ASSPS_GRADE910_LIVE_NUMERICAL_REVISION_EVIDENCE_V1',
'liveNumericals':80,'liveNumericStemAndAnswerIdenticalToDeepOriginal':59,
'liveNumericalCurrentRevisionMissingDeepComputation':21,
'academicApprovals':0,'productionDatabaseWrites':0,'rawQuestionsOrAnswersStored':False}
PROOF={
'schema':'ASSPS_GRADE910_21_NUMERICAL_DEEP_RECOMPUTATION_SOURCE_V1',
'sourceOriginalsIndependentlyRecomputed':21,
'existing59DeepVerifiedOriginalsExcludedFromThese21':59,
'prior59FullLiveRevisionAndStemReauthenticated':59,
'currentLiveStemsAndAnswersMatched':21,
'combined80NumericalReadOnlyProof':True,
'currentLiveFullRevisionSha256Verified':True,
'checkedAgainstLiveReadOnly':True,
'liveTextComparisonFailures':0,
'qualifiedFacultyApprovalsCreated':0,
'productionDatabaseWrites':0,
'paperStudioPublicationEnabled':False,
'schoolAdoptedTextbookEditionCertified':False,
'sourceQuestionTextOrAnswersStoredInReport':False}
def evaluate(proof,legacy=LEGACY):
 # Final two optional parameters are the old independent computation stage
 # and the new live revision cryptographic machine evidence stage.
 f=old.fixtures()
 return m.evaluate(*f,numerical_evidence=legacy,numerical_deep_proof=proof)
class NumericalPhaseRevisionTests(unittest.TestCase):
 def test_complete_machine_proof_never_grants_publication(self):
  result=evaluate(dict(PROOF))
  self.assertEqual(result['liveNumericalsMatchedToDeepRecomputedOriginal'],80)
  self.assertEqual(result['liveNumericalsStillNeedRevisionSpecificDeepRecomputation'],0)
  self.assertTrue(result['numericalCurrentFullLiveRevisionsAndMachineAnswersMatched'])
  self.assertEqual(result['machinePassedPhases'],4)
  self.assertFalse(result['academicVerifiedPublicationReady'])
  self.assertFalse(result['paperStudioAcademicallyApprovedSnapshotReady'])
 def test_legacy_only_retains_old_59_21_status(self):
  result=evaluate(None)
  self.assertEqual(result['liveNumericalsMatchedToDeepRecomputedOriginal'],59)
  self.assertEqual(result['liveNumericalsStillNeedRevisionSpecificDeepRecomputation'],21)
  self.assertFalse(result['numericalCurrentFullLiveRevisionsAndMachineAnswersMatched'])
 def test_missing_previous_evidence_denied(self):
  with self.assertRaisesRegex(ValueError,'80_NUMERICAL_MACHINE_RECEIPT_INVALID'):
   evaluate(dict(PROOF),legacy=None)
 def test_every_false_or_tampered_current_proof_is_denied(self):
  mutations={
   'sourceOriginalsIndependentlyRecomputed':20,
   'currentLiveStemsAndAnswersMatched':20,
   'prior59FullLiveRevisionAndStemReauthenticated':58,
   'liveTextComparisonFailures':1,
   'checkedAgainstLiveReadOnly':False,
   'currentLiveFullRevisionSha256Verified':False,
   'combined80NumericalReadOnlyProof':False,
   'paperStudioPublicationEnabled':True,
   'qualifiedFacultyApprovalsCreated':1,
   'productionDatabaseWrites':1,
   'schoolAdoptedTextbookEditionCertified':True,
   'sourceQuestionTextOrAnswersStoredInReport':True,
  }
  for k,v in mutations.items():
   with self.subTest(field=k):
    proof=dict(PROOF);proof[k]=v
    with self.assertRaisesRegex(ValueError,'80_NUMERICAL_MACHINE_RECEIPT_INVALID'):
     evaluate(proof)
 def test_invalid_old_snapshot_denied_even_with_new_receipt(self):
  legacy=dict(LEGACY);legacy['academicApprovals']=1
  with self.assertRaisesRegex(ValueError,'NUMERICAL_LIVE_REVISION_OR_ACADEMIC_APPROVAL'):
   evaluate(dict(PROOF),legacy=legacy)
if __name__=='__main__':unittest.main()
