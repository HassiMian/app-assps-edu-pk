"""Current School 1 SHA-bound 13 Urdu Chemistry draft acceptance: no academic approval."""
import copy,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path)
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=load('grade910_13_chemistry_crosswalk',ROOT/'ops/qbank/audit-grade910-existing-long-answer-proposal-crosswalk-20261016.py')
phase=load('grade910_13_chemistry_phase',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
prior=load('grade910_13_original_phase_tests',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
sub=load('grade910_13_original_subject_tests',ROOT/'ops/tests/test_grade910_subjective_six_phase_gate_20261016.py')
hist=load('grade910_13_original_historic_tests',ROOT/'ops/tests/test_grade910_historical_answer_research_phase_guard_20261016.py')
class Chemistry13ProtectedResearchTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.groups=json.loads((m.DOCS/m.MASTER).read_text())['sourceGroups']
  cls.last=json.loads((m.DOCS/m.FIVE).read_text())
  cls.led=json.loads((m.STATE/m.SHA_LEDGER).read_text())
  cls.risks=json.loads((m.STATE/m.RISK_LEDGER).read_text())
  cls.ids={q['questionId'] for q in cls.led['records']}
  cls.first=json.loads((m.DOCS/'ASSPS_BIOLOGY10_URDU_TEN_HIGH_PRIORITY_CONCEPTUAL_ANSWER_RESEARCH_20261016.json').read_text())
  cls.second=json.loads((m.DOCS/'ASSPS_GRADE9_BIOLOGY_8_AND_GRADE10_COMPUTER_6_URDU_UNAPPROVED_EXPLANATIONS_20261016.json').read_text())
  cls.third=json.loads((m.DOCS/'ASSPS_GRADE10_CHEMISTRY_URDU_10_SAFE_UNAPPROVED_CONCEPTUAL_EXPLANATIONS_20261016.json').read_text())
 def run_crosswalk(self,new=None):
  return m.build(self.groups,self.last,self.led,self.risks,self.ids,
   new_biology=self.first,new_dual_urdu=self.second,
   new_chemistry=self.third if new is None else new)
 def test_exactly_13_linked_one_time_research_without_promotion(self):
  a=self.run_crosswalk()
  self.assertEqual(a['newGrade10ChemistryUrduConceptualResearchCandidates'],10)
  self.assertEqual(a['newIndependentHighPriorityUrduBiologyResearchCandidates'],10)
  self.assertEqual(a['newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates'],14)
  self.assertEqual(a['remainingLiveReviewDepthFlagsWithoutAnyDraft'],416)
  self.assertEqual(a['remainingHighPriorityFlagsWithoutAnyDraft'],195)
  self.assertEqual(a['liveLongQuestionIdsWithPriorResearchDraft'],164)
  self.assertEqual(a['qualifiedAcademicApprovalsCreated'],0)
  self.assertEqual(a['productionDatabaseWrites'],0)
  self.assertEqual(len(a['unlinkedCurrentRevisionResearchQueue']),416)
 def test_changed_live_sha_is_rejected(self):
  a=copy.deepcopy(self.third)
  a['drafts'][0]['liveFullQuestionContentRevisionSha256']='0'*64
  with self.assertRaisesRegex(ValueError,'NOT_CURRENT_OR_NOT_UNAPPROVED'):
   self.run_crosswalk(a)
 def test_duplicate_biology_or_computer_id_is_rejected(self):
  a=copy.deepcopy(self.third)
  a['drafts'][0]['questionId']=self.first['newAnswers'][0]['questionId']
  with self.assertRaisesRegex(ValueError,'NOT_CURRENT_OR_NOT_UNAPPROVED'):
   self.run_crosswalk(a)
 def test_forged_school_adoption_and_teacher_approvals_denied(self):
  for field,value in [('actualSchoolAdoptedTextbookVerified',True),
                      ('sourceExercisePageCorroborated',True),
                      ('qualifiedIndependentChemistryAndUrduReviewCompleted',True),
                      ('academicApproval',True),
                      ('published',True),
                      ('productionDatabaseWrites',1)]:
   with self.subTest(field=field):
    a=copy.deepcopy(self.third);a[field]=value
    with self.assertRaisesRegex(ValueError,'CANNOT_CLAIM_APPROVAL'):
     self.run_crosswalk(a)
 def test_question_faculty_approval_forgery_denied(self):
  a=copy.deepcopy(self.third);a['drafts'][0]['independentChemistryTeacherReviewed']=True
  with self.assertRaisesRegex(ValueError,'NOT_CURRENT_OR_NOT_UNAPPROVED'):
   self.run_crosswalk(a)
 def test_new_chemistry_13_nonpublication_six_phase_proof(self):
  x=copy.deepcopy(hist.DEF)
  x.update(newIndependentHighPriorityUrduBiologyResearchCandidates=10,
   newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates=14,
   newGrade10ChemistryUrduConceptualResearchCandidates=10,
   remainingLiveReviewDepthFlagsWithoutAnyDraft=416,
   remainingHighPriorityFlagsWithoutAnyDraft=195,
   unlinkedCurrentRevisionResearchQueue=[{'priority':'HIGH'}]*195+[{'priority':'REVIEW'}]*221)
  q=phase.evaluate(*prior.fixtures(),subjective_risk=sub.RISKS,historic_answer_drafts=x)
  self.assertEqual(q['newGrade10ChemistryUrdu10UnapprovedConceptualAnswers'],10)
  self.assertEqual(q['highPriorityResearchFlagsStillUnlinkedAfterNewDrafts'],195)
  self.assertEqual(q['machinePassedPhases'],4)
  self.assertFalse(q['academicVerifiedPublicationReady'])
  x['remainingHighPriorityFlagsWithoutAnyDraft']=194
  with self.assertRaisesRegex(ValueError,'GRADE10_10_SAFE_CHEMISTRY_RESEARCH_CROSSWALK_INVALID'):
   phase.evaluate(*prior.fixtures(),subjective_risk=sub.RISKS,historic_answer_drafts=x)
if __name__=='__main__':unittest.main()
