"""Canonical six-phase rejects fake ASSPS catalog adoption or 2027 ALP claims."""
from __future__ import annotations
import copy,importlib.util,json,hashlib
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
def imp(n,p):
 sp=importlib.util.spec_from_file_location(n,p)
 m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m);return m
catalog=imp('assps_session_gate_test',ROOT/'ops/qbank/build-grade910-session-adoption-evidence-gate-20261016.py')
phase=imp('assps_phase_session_gate_test',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
existing=imp('assps_phase_test_existing',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
class SessionVsYearSixPhaseGuards(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  mb=catalog.MANIFEST.read_bytes()
  ob=catalog.ORIGINAL.read_bytes()
  o=json.loads(ob)
  live={'records':[{'questionId':x['questionId'],'revisionSha256':hashlib.sha256(x['questionId'].encode()).hexdigest()} for x in o['rows'][:2411]]}
  a={'schema':'ASSPS_SCHOOL1_VERSIONED_ADOPTION_EVIDENCE_INVENTORY_V1','schoolId':1,
   'counts':{k:0 for k in ('sessionVersions','curriculumProfileVersions','resourceBooks',
     'resourceVersions','learningScopeVersions','schoolAcademicApprovalEvents')},
   'schoolEditionAdoptionVerifiedByThisAudit':False,'approvedForCurrentAcademicSession':False,
   'academicQuestionApprovalGained':0,'studentOrQuestionDbWrites':0}
  cls.claim=catalog.compile_evidence(json.loads(mb),o,a,live,
    hashlib.sha256(mb).hexdigest(),hashlib.sha256(ob).hexdigest())
 def test_current_machine_phase_remains_unapproved(self):
  x=phase.evaluate(*existing.fixtures(),session_evidence=self.claim)
  self.assertEqual(x['machinePassedPhases'],4)
  self.assertEqual(x['public2026_27TextbookLabelsWithoutAdoptionProof'],599)
  self.assertTrue(x['grade9Annual2026ALPCannotBeAutomaticallyAppliedTo2027'])
  self.assertFalse(x['academicVerifiedPublicationReady'])
 def test_2026_alp_falsely_applied_to_2027_rejected(self):
  x=copy.deepcopy(self.claim);x['grade9RevisedALPAutomaticallyAppliesTo2027']=True
  with self.assertRaisesRegex(ValueError,'OFFICIAL_CATALOG_VS_ASSPS_ADOPTION_YEAR_FRAUD'):
   phase.evaluate(*existing.fixtures(),session_evidence=x)
 def test_school_version_rows_falsely_declared_approved_rejected(self):
  x=copy.deepcopy(self.claim);x['schoolAdoptionVersionRowCounts']['schoolAcademicApprovalEvents']=1
  with self.assertRaisesRegex(ValueError,'OFFICIAL_CATALOG_VS_ASSPS_ADOPTION_YEAR_FRAUD'):
   phase.evaluate(*existing.fixtures(),session_evidence=x)
 def test_invented_question_specific_proof_cannot_pass(self):
  x=copy.deepcopy(self.claim);x['publisherQuestionSpecificPrintedPageExerciseTextIndependentlyVerified']=2581
  with self.assertRaisesRegex(ValueError,'OFFICIAL_CATALOG_VS_ASSPS_ADOPTION_YEAR_FRAUD'):
   phase.evaluate(*existing.fixtures(),session_evidence=x)
if __name__=='__main__':unittest.main()
