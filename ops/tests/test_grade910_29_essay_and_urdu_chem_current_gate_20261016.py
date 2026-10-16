"""VPS-only exact live revision QA for 21 essay exemplars + 8 IX Urdu Chemistry drafts."""
from __future__ import annotations
import copy,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
def load(n,p):
 s=importlib.util.spec_from_file_location(n,p)
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
cross=load('academic29',ROOT/'ops/qbank/audit-grade910-existing-long-answer-proposal-crosswalk-20261016.py')
phase=load('phase29',ROOT/'ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py')
old=load('oldphase29',ROOT/'ops/tests/test_grade910_six_phase_receipt_20261016.py')
sub=load('subphase29',ROOT/'ops/tests/test_grade910_subjective_six_phase_gate_20261016.py')
hist=load('histphase29',ROOT/'ops/tests/test_grade910_historical_answer_research_phase_guard_20261016.py')
class Grade910TwentyNineRevisionBoundOriginalResearch(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.groups=json.loads((cross.DOCS/cross.MASTER).read_text())['sourceGroups']
  cls.five=json.loads((cross.DOCS/cross.FIVE).read_text())
  cls.ledger=json.loads((cross.STATE/cross.SHA_LEDGER).read_text())
  cls.risk=json.loads((cross.STATE/cross.RISK_LEDGER).read_text())
  cls.live={r['questionId'] for r in cls.ledger['records']}
  cls.bio=json.loads((cross.DOCS/'ASSPS_BIOLOGY10_URDU_TEN_HIGH_PRIORITY_CONCEPTUAL_ANSWER_RESEARCH_20261016.json').read_text())
  cls.dual=json.loads((cross.DOCS/'ASSPS_GRADE9_BIOLOGY_8_AND_GRADE10_COMPUTER_6_URDU_UNAPPROVED_EXPLANATIONS_20261016.json').read_text())
  cls.chem10=json.loads((cross.DOCS/'ASSPS_GRADE10_CHEMISTRY_URDU_10_SAFE_UNAPPROVED_CONCEPTUAL_EXPLANATIONS_20261016.json').read_text())
  cls.english=json.loads((cross.DOCS/'ASSPS_GRADE910_ENGLISH_21_INDEPENDENT_UNAPPROVED_ESSAY_EXEMPLARS_20261016.json').read_text())
  cls.chem9=json.loads((cross.DOCS/'ASSPS_GRADE9_CHEMISTRY_URDU_8_ORIGINAL_CONCEPTUAL_EXPLANATIONS_20261016.json').read_text())
 def evaluate(self,english=None,chem9=None):
  return cross.build(self.groups,self.five,self.ledger,self.risk,self.live,
   new_biology=self.bio,new_dual_urdu=self.dual,new_chemistry=self.chem10,
   new_english_essays=self.english if english is None else english,
   new_grade9_chem=self.chem9 if chem9 is None else chem9)
 def test_all_29_reduce_review_queue_never_old_research(self):
  a=self.evaluate()
  self.assertEqual(a['uniqueHistoricalResearchLongIds'],166)
  self.assertEqual(a['liveLongQuestionIdsWithPriorResearchDraft'],164)
  self.assertEqual(a['newEnglishGrade9And10IllustrativeParagraphCandidates'],21)
  self.assertEqual(a['newGrade9ChemistryUrduOriginalConceptualResearchCandidates'],8)
  self.assertEqual(a['remainingLiveReviewDepthFlagsWithoutAnyDraft'],387)
  self.assertEqual(a['remainingHighPriorityFlagsWithoutAnyDraft'],166)
  self.assertEqual(len(a['unlinkedCurrentRevisionResearchQueue']),387)
  self.assertEqual(a['remainingHighPriorityStreamSpecificSubjectLabelsAwaitSchoolAdoption'],137)
  self.assertEqual(a['remainingHighPriorityOtherSubjectLabelsStillNeedBookAdoption'],29)
  self.assertTrue(a['streamSpecificLabelsAreNotAutomaticInapplicabilityOrApproval'])
  self.assertTrue(all(x['academicallySelectable'] is False for x in a['unlinkedCurrentRevisionResearchQueue']))
  self.assertTrue(all('schoolStreamApplicability' in x for x in a['unlinkedCurrentRevisionResearchQueue']))
  self.assertEqual(a['qualifiedAcademicApprovalsCreated'],0)
  self.assertEqual(a['productionDatabaseWrites'],0)
 def test_english_essay_becoming_only_correct_answer_denied(self):
  a=copy.deepcopy(self.english);a['rows'][0]['alternateCorrectStudentAnswersPermitted']=False
  with self.assertRaisesRegex(ValueError,'ENGLISH_21_EXEMPLAR_NOT_CURRENT_NONSELECTABLE'):
   self.evaluate(english=a)
 def test_english_exemplar_changed_current_sha_denied(self):
  a=copy.deepcopy(self.english);a['rows'][0]['currentLiveFullQuestionRevisionSha256']='f'*64
  with self.assertRaisesRegex(ValueError,'ENGLISH_21_EXEMPLAR_NOT_CURRENT_NONSELECTABLE'):
   self.evaluate(english=a)
 def test_forced_english_teacher_approval_denied(self):
  a=copy.deepcopy(self.english);a['qualifiedEnglishTeacherReviewCompleted']=True
  with self.assertRaisesRegex(ValueError,'ENGLISH_21_UNREVIEWED_ESSAY_EXEMPLAR_FRAUDULENT'):
   self.evaluate(english=a)
 def test_chem9_question_academic_approved_false_required(self):
  a=copy.deepcopy(self.chem9);a['rows'][0]['academicallyApproved']=True
  with self.assertRaisesRegex(ValueError,'GRADE9_URDU_CHEM_CURRENT_REVISION_UNAPPROVED'):
   self.evaluate(chem9=a)
 def test_chem9_live_sha_mismatch_denied(self):
  a=copy.deepcopy(self.chem9);a['rows'][0]['currentFullQuestionRevisionSha256']='f'*64
  with self.assertRaisesRegex(ValueError,'GRADE9_URDU_CHEM_CURRENT_REVISION_UNAPPROVED'):
   self.evaluate(chem9=a)
 def test_six_phase_accepts_only_research_and_denies_publication(self):
  a=copy.deepcopy(hist.DEF)
  a.update(newIndependentHighPriorityUrduBiologyResearchCandidates=10,
    newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates=14,
    newGrade10ChemistryUrduConceptualResearchCandidates=10,
    newEnglishGrade9And10IllustrativeParagraphCandidates=21,
    newGrade9ChemistryUrduOriginalConceptualResearchCandidates=8,
    remainingHighPriorityStreamSpecificSubjectLabelsAwaitSchoolAdoption=137,
    remainingHighPriorityOtherSubjectLabelsStillNeedBookAdoption=29,
    streamSpecificLabelsAreNotAutomaticInapplicabilityOrApproval=True,
    remainingLiveReviewDepthFlagsWithoutAnyDraft=387,
    remainingHighPriorityFlagsWithoutAnyDraft=166,
    unlinkedCurrentRevisionResearchQueue=[{'priority':'HIGH'}]*166+[{'priority':'REVIEW'}]*221)
  result=phase.evaluate(*old.fixtures(),subjective_risk=sub.RISKS,historic_answer_drafts=a)
  self.assertEqual(result['newGrade9ChemistryUrdu8UnapprovedExplanations'],8)
  self.assertEqual(result['newGrade9And10English21FlexibleExampleAnswersNotKeys'],21)
  self.assertEqual(result['machinePassedPhases'],4)
  self.assertEqual(result['highPriorityTechStreamLabelsAdoptionNotAuthenticated'],137)
  self.assertEqual(result['highPriorityOtherSubjectLabelsAdoptionNotAuthenticated'],29)
  self.assertFalse(result['academicVerifiedPublicationReady'])
  a['remainingHighPriorityFlagsWithoutAnyDraft']=165
  with self.assertRaisesRegex(ValueError,'GRADE9_CHEMISTRY_EIGHT_RESEARCH_REVISION_DRIFT'):
   phase.evaluate(*old.fixtures(),subjective_risk=sub.RISKS,historic_answer_drafts=a)
if __name__=='__main__':unittest.main()
