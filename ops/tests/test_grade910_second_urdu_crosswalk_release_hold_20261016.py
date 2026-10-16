"""Verify 14 research drafts are subtracted only from SHA-matched HIGH backlog.
Never grant academic approvals or publish candidate answers.
"""
import copy,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
def load(k,p):
 s=importlib.util.spec_from_file_location(k,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=load('qbank_crosswalk_14',ROOT/'ops/qbank/audit-grade910-existing-long-answer-proposal-crosswalk-20261016.py')
phase=load('phase2_14',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
old=load('old_phase_14',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
subject=load('subject_14',ROOT/'ops/tests/test_grade910_subjective_six_phase_gate_20261016.py')
historical=load('historical_14',ROOT/'ops/tests/test_grade910_historical_answer_research_phase_guard_20261016.py')
class NewTwoSubjectResearchCrosswalk(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.groups=json.loads((m.DOCS/m.MASTER).read_text())['sourceGroups']
  cls.last=json.loads((m.DOCS/m.FIVE).read_text())
  cls.ledger=json.loads((m.STATE/m.SHA_LEDGER).read_text())
  cls.risk=json.loads((m.STATE/m.RISK_LEDGER).read_text())
  cls.liveids={r['questionId'] for r in cls.ledger['records']}
  cls.previous=json.loads((m.DOCS/'ASSPS_BIOLOGY10_URDU_TEN_HIGH_PRIORITY_CONCEPTUAL_ANSWER_RESEARCH_20261016.json').read_text())
  cls.fourteen=json.loads((m.DOCS/'ASSPS_GRADE9_BIOLOGY_8_AND_GRADE10_COMPUTER_6_URDU_UNAPPROVED_EXPLANATIONS_20261016.json').read_text())
 def call(self,new14=None):
  return m.build(self.groups,self.last,self.ledger,self.risk,self.liveids,
                 new_biology=self.previous,new_dual_urdu=self.fourteen if new14 is None else new14)
 def test_current_live_backlog_reduced_without_overwriting_original_166(self):
  x=self.call()
  self.assertEqual(x['uniqueHistoricalResearchLongIds'],166)
  self.assertEqual(x['liveLongQuestionIdsWithPriorResearchDraft'],164)
  self.assertEqual(x['newIndependentHighPriorityUrduBiologyResearchCandidates'],10)
  self.assertEqual(x['newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates'],14)
  self.assertEqual(x['remainingLiveReviewDepthFlagsWithoutAnyDraft'],426)
  self.assertEqual(x['remainingHighPriorityFlagsWithoutAnyDraft'],205)
  self.assertEqual(len(x['unlinkedCurrentRevisionResearchQueue']),426)
  self.assertEqual(x['qualifiedAcademicApprovalsCreated'],0)
  self.assertEqual(x['productionDatabaseWrites'],0)
 def test_duplicate_prior_current_revision_denied(self):
  a=copy.deepcopy(self.fourteen)
  a['drafts'][0]['questionId']=self.previous['newAnswers'][0]['questionId']
  with self.assertRaisesRegex(ValueError,'SECOND_URDU_DRAFT_NOT_CURRENT_UNAPPROVED_SOURCE_REVISION'):
   self.call(a)
 def test_live_sha_changed_denied(self):
  a=copy.deepcopy(self.fourteen)
  a['drafts'][0]['currentLiveFullContentRevisionSha256']='f'*64
  with self.assertRaisesRegex(ValueError,'SECOND_URDU_DRAFT_NOT_CURRENT_UNAPPROVED_SOURCE_REVISION'):
   self.call(a)
 def test_forbidden_staff_or_edition_approval_denied(self):
  for k,v in [('academicallyApproved',True),('actualSchoolTextbookAdoptionVerified',True),
              ('paperStudioSelectable',True),('productionDatabaseWrites',1)]:
   with self.subTest(key=k):
    a=copy.deepcopy(self.fourteen);a[k]=v
    with self.assertRaisesRegex(ValueError,'SECOND_URDU_MODEL_ANSWER_RESEARCH_FORGED'):
     self.call(a)
 def test_forged_per_question_staff_approval_denied(self):
  a=copy.deepcopy(self.fourteen);a['drafts'][0]['independentlyQualifiedSubjectReviewed']=True
  with self.assertRaisesRegex(ValueError,'SECOND_URDU_DRAFT_NOT_CURRENT_UNAPPROVED_SOURCE_REVISION'):
   self.call(a)
 def test_academic_six_phase_refuses_research_to_publication(self):
  status=copy.deepcopy(historical.DEF)
  status['newIndependentHighPriorityUrduBiologyResearchCandidates']=10
  status['newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates']=14
  status['remainingLiveReviewDepthFlagsWithoutAnyDraft']=426
  status['remainingHighPriorityFlagsWithoutAnyDraft']=205
  status['unlinkedCurrentRevisionResearchQueue']=[{'priority':'HIGH'} for _ in range(205)]+[{'priority':'REVIEW'} for _ in range(221)]
  x=phase.evaluate(*old.fixtures(),subjective_risk=subject.RISKS,historic_answer_drafts=status)
  self.assertEqual(x['newGrade9Biology8AndGrade10Computer6UrduUnapprovedAnswers'],14)
  self.assertEqual(x['highPriorityResearchFlagsStillUnlinkedAfterNewDrafts'],205)
  self.assertFalse(x['academicVerifiedPublicationReady'])
  status['remainingHighPriorityFlagsWithoutAnyDraft']=204
  with self.assertRaisesRegex(ValueError,'SECOND_URDU_RESEARCH_CROSSWALK_FRAUD'):
   phase.evaluate(*old.fixtures(),subjective_risk=subject.RISKS,historic_answer_drafts=status)
if __name__=='__main__':unittest.main()
