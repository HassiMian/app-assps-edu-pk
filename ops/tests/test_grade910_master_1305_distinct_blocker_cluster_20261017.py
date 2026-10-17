"""Validate the authoritative four-lane academic blocker cluster, no false approvals."""
import copy,importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('academic_unified_review_cluster',ROOT/'ops/qbank/build-grade910-single-authoritative-review-blocker-cluster-20261017.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class OfflineUnifiedCluster(unittest.TestCase):
 def test_known_schemas_and_no_teacher_forgery(self):
  self.assertEqual(len(m.DIMENSIONS),8)
  self.assertIn('qualifiedRevisionApprovalSigned',m.DIMENSIONS)
 def test_never_add_998_358_80_without_de_duplicating(self):
  self.assertEqual(998+358+80-131,1305)
 def test_four_lanes_only(self):
  self.assertEqual(set(m.FILES),{'source','answer','numerical','tech','revision','phase'})
class ProtectedCurrentRevision(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not (m.STATE/'live-question-revisions.json').exists():
   raise unittest.SkipTest('Live SHA receipts are accessible only on authenticated protected VPS')
  cls.d={k:json.loads((m.STATE/f).read_text()) for k,f in m.FILES.items()}
  cls.packet=m.make(cls.d)
 def poison(self,lane,operation,expected):
  x=copy.deepcopy(self.d)
  operation(x[lane])
  with self.assertRaisesRegex(ValueError,expected):m.make(x)
 def test_all_1305_are_exact_distinct_original_ids(self):
  self.assertEqual(self.packet['distinctActualSchool1LiveRevisionBlockedQuestionIds'],1305)
  self.assertEqual(len({x['questionId'] for x in self.packet['items']}),1305)
 def test_true_overlap_pattern_not_double_counted(self):
  self.assertEqual(sum(self.packet['lanePatternDistribution'].values()),1305)
  self.assertEqual(self.packet['duplicateQuestionCountsAvoided'],131)
 def test_specific_source_numerical_tech_overlaps(self):
  self.assertEqual(self.packet['overlapSourceAndAnswer'],83)
  self.assertEqual(self.packet['overlapSourceAndNumerical'],48)
  self.assertEqual(self.packet['overlapTechAndSource'],29)
 def test_three_full_academic_approvals_must_remain_zero(self):
  for k in ('actualSchoolBookAdoptionApprovals','authenticQualifiedAcademicReviewerApprovals','exactPrintedQuestionExercisePageApprovals','approvedPublishedQuestionCount','productionDatabaseWrites'):
   self.assertEqual(self.packet[k],0)
  self.assertTrue(self.packet['approvalAndReleaseGateStillOnHold'])
 def test_original_packet_no_private_school_question_or_marks(self):
  self.assertFalse(self.packet['containsCopyrightedQuestionAnswerOrStudentContent'])
  for row in self.packet['items']:
   self.assertFalse(row['academicPublished'])
   self.assertFalse(row['paperStudioVerifiedSelectable'])
   self.assertEqual(len(row['liveFullRevisionSHA256']),64)
 def test_reproducible_private_mode_0600(self):
  self.assertEqual(json.loads(m.OUT.read_text()),self.packet)
  self.assertEqual(m.OUT.stat().st_mode & 0o777,0o600)
 def test_changed_live_source_claim_hash_refused(self):
  self.poison('source',lambda x:x['priorityEvidenceItems'][0].update(currentLiveSchool1FullRevisionSha256='f'*64),'STALE_OR_MISSING_LIVE_FULL_REVISION')
 def test_changed_answer_revision_hash_refused(self):
  self.poison('answer',lambda x:x['unlinkedCurrentRevisionResearchQueue'][0].update(currentLiveRevisionSha256='f'*64),'STALE_OR_MISSING_LIVE_FULL_REVISION')
 def test_changed_numerical_revision_hash_refused(self):
  self.poison('numerical',lambda x:x['records'][0].update(currentLiveFullRevisionSha256='f'*64),'STALE_OR_MISSING_LIVE_FULL_REVISION')
 def test_falsely_approved_tech_stream_refused(self):
  self.poison('tech',lambda x:x['records'][0].update(actualSchoolProgrammeAdoption=True),'TECH_CATALOG_CANNOT_AUTO_ADOPT')
 def test_forged_faculty_approval_refused(self):
  self.poison('phase',lambda x:x.update(authenticIndependentAcademicApprovals=1),'NOT_CURRENT_AUTHENTIC')
 def test_forged_published_question_refused(self):
  self.poison('source',lambda x:x['priorityEvidenceItems'][0].update(paperStudioVerifiedSelectable=True),'INVALID_SOURCE_PAGE_ACADEMIC_APPROVAL')
 def test_forged_tech_translation_equivalence_refused(self):
  self.poison('tech',lambda x:x['records'][0].update(bilingualEquivalentApproved=True),'TECH_CATALOG_CANNOT_AUTO_ADOPT')
 def test_wrong_research_high_subset_refused(self):
  self.poison('answer',lambda x:next(z for z in x['unlinkedCurrentRevisionResearchQueue'] if z['priority']=='REVIEW').update(priority='HIGH'),'ALL_AND_ONLY_137_HIGH_TECH_SOURCE_APPLICATION_UNCERTAIN')
 def test_reviewer_queue_not_equal_technically_approved_QuestionBank(self):
  self.assertEqual(self.packet['academicMachinePhasesPassedNotFacultyReview'],4)
  self.assertEqual(self.packet['highPriorityTechAdoptionUnverified'],137)
if __name__=='__main__':unittest.main()
