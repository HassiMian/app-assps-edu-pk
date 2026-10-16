"""Never silently publish 10 original Grade X Biology Urdu answer drafts; use
existing 604-item advisory queue and 2,411 protected live revision SHA ledger."""
import copy,importlib.util,json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
def load(n,p):
 sp=importlib.util.spec_from_file_location(n,p)
 m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m);return m
m=load('assps_old_research_add_new',ROOT/'ops/qbank/audit-grade910-existing-long-answer-proposal-crosswalk-20261016.py')
phase=load('assps_phase_add_new',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
previous=load('assps_synthetic_phase_existing',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
subject=load('assps_subj_existing',ROOT/'ops/tests/test_grade910_subjective_six_phase_gate_20261016.py')
historic=load('assps_historic_existing',ROOT/'ops/tests/test_grade910_historical_answer_research_phase_guard_20261016.py')
class UrduBiologyResearchVsLiveQueue(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.groups=json.loads((m.DOCS/m.MASTER).read_text())['sourceGroups']
  cls.last=json.loads((m.DOCS/m.FIVE).read_text())
  cls.ledger=json.loads((m.STATE/m.SHA_LEDGER).read_text())
  cls.risk=json.loads((m.STATE/m.RISK_LEDGER).read_text())
  cls.live={r['questionId'] for r in cls.ledger['records']}
  cls.proposal=json.loads((m.DOCS/'ASSPS_BIOLOGY10_URDU_TEN_HIGH_PRIORITY_CONCEPTUAL_ANSWER_RESEARCH_20261016.json').read_text())
 def test_prior_research_preserved_and_new_drafts_reduce_queue_only(self):
  x=m.build(self.groups,self.last,self.ledger,self.risk,self.live,new_biology=self.proposal)
  self.assertEqual(x['newIndependentHighPriorityUrduBiologyResearchCandidates'],10)
  self.assertEqual(x['remainingLiveReviewDepthFlagsWithoutAnyDraft'],440)
  self.assertEqual(x['remainingHighPriorityFlagsWithoutAnyDraft'],219)
  self.assertEqual(x['historicalLongIdsWithAnySupplementalExplanatoryDraft'],165)
  self.assertEqual(x['liveLongQuestionIdsWithPriorResearchDraft'],164)
  self.assertEqual(len(x['unlinkedCurrentRevisionResearchQueue']),440)
  self.assertEqual(x['qualifiedAcademicApprovalsCreated'],0)
  self.assertFalse(any(r['academicallySelectable'] for r in x['unlinkedCurrentRevisionResearchQueue']))
 def test_new_answers_with_forged_staff_approval_refused(self):
  a=copy.deepcopy(self.proposal);a['newAnswers'][0]['academicApproved']=True
  with self.assertRaisesRegex(ValueError,'NEW_BIOLOGY_RESEARCH_NOT_CURRENT_UNAPPROVED_HIGH_REVISION'):
   m.build(self.groups,self.last,self.ledger,self.risk,self.live,new_biology=a)
 def test_new_answers_tampered_current_revision_sha_refused(self):
  a=copy.deepcopy(self.proposal);a['newAnswers'][0]['currentLiveRevisionSha256']='0'*64
  with self.assertRaisesRegex(ValueError,'NEW_BIOLOGY_RESEARCH_NOT_CURRENT_UNAPPROVED_HIGH_REVISION'):
   m.build(self.groups,self.last,self.ledger,self.risk,self.live,new_biology=a)
 def test_false_current_school_adoption_refused(self):
  a=copy.deepcopy(self.proposal);a['actualSchoolTextbookAdoptionVerified']=True
  with self.assertRaisesRegex(ValueError,'UNAPPROVED_BIOLOGY_RESEARCH_PACKET_FORGED'):
   m.build(self.groups,self.last,self.ledger,self.risk,self.live,new_biology=a)
 def test_current_phase_reports_10_without_approval(self):
  a=copy.deepcopy(historic.DEF)
  a['newIndependentHighPriorityUrduBiologyResearchCandidates']=10
  a['remainingLiveReviewDepthFlagsWithoutAnyDraft']=440
  a['remainingHighPriorityFlagsWithoutAnyDraft']=219
  a['unlinkedCurrentRevisionResearchQueue']=[{'priority':'HIGH'} for _ in range(219)]+[{'priority':'REVIEW'} for _ in range(221)]
  status=phase.evaluate(*previous.fixtures(),subjective_risk=subject.RISKS,historic_answer_drafts=a)
  self.assertEqual(status['newGrade10UrduBiologyUnapprovedAnswerResearchCandidates'],10)
  self.assertEqual(status['subjectiveDepthFlagsNeedingFreshAnswerResearchAfterNewDrafts'],440)
  self.assertEqual(status['highPriorityResearchFlagsStillUnlinkedAfterNewDrafts'],219)
  self.assertFalse(status['academicVerifiedPublicationReady'])
  self.assertEqual(status['machinePassedPhases'],4)
 def test_forged_six_phase_new_proposal_count_refused(self):
  a=copy.deepcopy(historic.DEF)
  a['newIndependentHighPriorityUrduBiologyResearchCandidates']=10
  a['remainingLiveReviewDepthFlagsWithoutAnyDraft']=440
  a['remainingHighPriorityFlagsWithoutAnyDraft']=218
  a['unlinkedCurrentRevisionResearchQueue']=[{'priority':'HIGH'} for _ in range(219)]+[{'priority':'REVIEW'} for _ in range(221)]
  with self.assertRaisesRegex(ValueError,'NEW_URDU_BIOLOGY_MODEL_RESEARCH_FRAUDULENT'):
   phase.evaluate(*previous.fixtures(),subjective_risk=subject.RISKS,historic_answer_drafts=a)
if __name__=='__main__':unittest.main()
