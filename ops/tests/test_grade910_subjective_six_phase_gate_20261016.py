"""Fail-closed six-phase integration for live subjective model-answer depth risks."""
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
def load(name,path):
 sp=importlib.util.spec_from_file_location(name,path)
 x=importlib.util.module_from_spec(sp);sp.loader.exec_module(x);return x
phase=load('assps_phase',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
prior=load('assps_existing_phase_test',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
RISKS={
'schema':'ASSPS_GRADE910_SUBJECTIVE_ANSWER_DEPTH_TRIAGE_V1',
'currentLiveQuestionRevisionsChecked':2411,
'subjectiveItemsChecked':1522,
'longQuestionsTotal':545,'longAtMost25Words':332,'longAtMost40Words':523,
'essayAtMost25Words':25,'subjectiveRiskReviewCandidates':604,
'highPriorityReviewCandidates':357,
'riskFlagsAreEditorialAdvisoryNotIncorrectAnswerProof':True,
'qualifiedAcademicApprovalsCreated':0,'publishedVerifiedQuestionsCreated':0,
'sourcePdfOrEditionAuthenticatedByThisAudit':False,
'productionDatabaseWrites':0,'questionTextOrAnswerStoredInReceipt':False,
'records':[{'questionId':'synthetic'+str(i)} for i in range(604)]
}
class SubjectiveSixPhaseGate(unittest.TestCase):
 def test_advisory_depth_evidence_reported_without_publication(self):
  x=phase.evaluate(*prior.fixtures(),subjective_risk=dict(RISKS))
  self.assertEqual(x['subjectiveAnswerDepthRiskQueue'],604)
  self.assertEqual(x['highPrioritySubjectiveModelAnswerReviewQueue'],357)
  self.assertFalse(x['academicVerifiedPublicationReady'])
  self.assertEqual(x['machinePassedPhases'],4)
  self.assertTrue(x['subjectiveLengthFlagsAreNotAcademicCorrectnessJudgments'])
 def test_backward_compatibility_when_proof_absent(self):
  x=phase.evaluate(*prior.fixtures())
  self.assertIsNone(x['subjectiveAnswerDepthRiskQueue'])
  self.assertFalse(x['academicVerifiedPublicationReady'])
 def test_adversarial_forged_status_and_drift_refused(self):
  mutation={'sourcePdfOrEditionAuthenticatedByThisAudit':True,
    'qualifiedAcademicApprovalsCreated':1,'publishedVerifiedQuestionsCreated':1,
    'productionDatabaseWrites':1,'questionTextOrAnswerStoredInReceipt':True,
    'currentLiveQuestionRevisionsChecked':2410,
    'subjectiveRiskReviewCandidates':603,
    'longAtMost25Words':331,'highPriorityReviewCandidates':356,
    'riskFlagsAreEditorialAdvisoryNotIncorrectAnswerProof':False}
  for name,bad in mutation.items():
   with self.subTest(name=name):
    evidence=dict(RISKS);evidence[name]=bad
    with self.assertRaisesRegex(ValueError,'SUBJECTIVE_DEPTH_EVIDENCE_UNVERIFIED'):
     phase.evaluate(*prior.fixtures(),subjective_risk=evidence)
 def test_incomplete_revision_bound_candidates_refused(self):
  d=dict(RISKS);d['records']=[]
  with self.assertRaisesRegex(ValueError,'SUBJECTIVE_DEPTH_EVIDENCE_UNVERIFIED'):
   phase.evaluate(*prior.fixtures(),subjective_risk=d)
if __name__=='__main__':unittest.main()
