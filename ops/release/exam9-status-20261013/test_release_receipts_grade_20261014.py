from unittest import TestCase
from verify_release_receipts_20261014 import _valid_claim

class GradeApprovalFixtureTests(TestCase):
 def make(self):
  return dict(school_id=1,exam_id=9,environment='production',auth_session_verified=True,backend_commit='synthetic',core_release_id='synthetic',evidence_digest='a'*64,actor_role='principal',actor_user_id=4,actor_school_id=1,approved_grade_changes=112,revision_actor_bound_to_session=True,original_scores_preserved=True,grade_change_ledger_verified=True,old_301_grade_digest='0376ec1d25555b0dfc963857564b36aa',new_301_grade_digest='0e0115e1bdafa8c56edb174da6241f3a',original_301_score_digest='bcdc098a3e6cabb6f4c31736b14e39b9')
 def test_valid_synthetic_claim_shape(self):
  self.assertTrue(_valid_claim('grade_revision_authenticated',self.make()))
 def test_teacher_cannot_authorize_revision(self):
  c=self.make();c['actor_role']='teacher'
  self.assertFalse(_valid_claim('grade_revision_authenticated',c))
 def test_wrong_numeric_digest_fails(self):
  c=self.make();c['original_301_score_digest']='0'*32
  self.assertFalse(_valid_claim('grade_revision_authenticated',c))
