#!/usr/bin/env python3
"""Synthetic tests: never access school DB or user secrets."""
import importlib.util
import pathlib
import unittest

f=pathlib.Path(__file__).with_name('reconcile_verified_teacher_assignments.py')
spec=importlib.util.spec_from_file_location('reconcile_verified_teacher_assignments',f)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
BASE={
 'candidates':54, 'six_day_candidates':54, 'valid_user_employee_candidates':54,
 'invalid_identity_candidates':0, 'mixed_candidate_hashes':0,
 'teaching_slots':336, 'unique_scheduled_users':12, 'concurrent_overlaps':12,
 'overlapping_patterns':2,'active_assignment_rows':0,'shared_lessons':0,
 'source_versions':1,'approved_source_slots':0
}
class AssignmentEvidenceTest(unittest.TestCase):
 def test_current_state_holds_even_if_identity_matched(self):
  r=mod.decision(BASE)
  self.assertEqual(r['status'],'HOLD')
  self.assertTrue(r['manual_identity_review_can_begin'])
  self.assertFalse(r['can_auto_assign'])
  self.assertFalse(r['can_auto_publish'])
  self.assertIn('OFFICIAL_PRINT_SOURCE_PROVENANCE_NOT_ATTESTED',r['blockers'])
  self.assertIn('TEACHER_PERIOD_OVERLAPS_REQUIRE_COMBINED_CLASS_APPROVAL',r['blockers'])
 def test_complete_identity_does_not_grant_access(self):
  d={**BASE,'approved_source_slots':336,'concurrent_overlaps':0,
     'active_assignment_rows':54,'shared_lessons':54}
  r=mod.decision(d)
  self.assertEqual(r['blockers'],[])
  self.assertEqual(r['status'],'HOLD')
  self.assertTrue(r['academic_source_approval_still_required'])
  self.assertFalse(r['can_auto_assign_or_publish'] if 'can_auto_assign_or_publish' in r else r['can_auto_publish'])
 def test_gaps_are_explicit(self):
  d={**BASE,'six_day_candidates':53,'valid_user_employee_candidates':52,
     'invalid_identity_candidates':2}
  r=mod.decision(d)
  self.assertIn('SIX_DAY_ASSIGNMENT_COMPLETENESS_FAILED',r['blockers'])
  self.assertIn('USER_EMPLOYEE_RELATIONSHIP_MISSING',r['blockers'])
 def test_multiple_source_versions_fail(self):
  d={**BASE,'source_versions':2,'mixed_candidate_hashes':4}
  self.assertIn('OFFICIAL_PRINT_SOURCE_PROVENANCE_NOT_ATTESTED',mod.decision(d)['blockers'])
 def test_bad_evidence_types_never_allowed(self):
  for v in [-1, '54', None, True]:
   with self.assertRaises(ValueError):
    mod.decision({**BASE,'candidates':v})
 def test_read_only_sql_and_tenant_scoped(self):
  self.assertIn('BEGIN READ ONLY',mod.SQL)
  self.assertIn('COMMIT',mod.SQL)
  self.assertIn('school_id=1',mod.SQL)
  for forbidden in ('INSERT INTO','UPDATE public.','DELETE FROM','TRUNCATE','DROP TABLE',
                    'password_hash','student_name','user_email'):
   self.assertNotIn(forbidden,mod.SQL)
 def test_no_student_or_teacher_identity_leaks(self):
  r=mod.decision(BASE)
  serialized=str(r).lower()
  for forbidden in ('teacher_name','email','student_id','student_name',
                    'employee_id','phone','password'):
   self.assertNotIn(forbidden,serialized)
 def test_missing_candidate_denied(self):
  d={**BASE,'candidates':0,'six_day_candidates':0,'valid_user_employee_candidates':0}
  r=mod.decision(d)
  self.assertFalse(r['manual_identity_review_can_begin'])
  self.assertIn('SIX_DAY_ASSIGNMENT_COMPLETENESS_FAILED',r['blockers'])
if __name__=='__main__':unittest.main()
