#!/usr/bin/env python3
"""Verify dedicated PG55432 dual signed restrictive policy rehearsal SQL only."""
from pathlib import Path
import re
import unittest
s=Path(__file__).with_name('rehearse-signed-recovery-candidate-77-20261012.sql').read_text()
class MigrationGate(unittest.TestCase):
 def test_only_specific_candidate_port_and_owner(self):
  self.assertIn("current_database() <> 'assps_core_signed_recovery_candidate_20261012'",s)
  self.assertIn("current_setting('port') <> '55432'",s)
  self.assertIn("current_user <> 'postgres'",s)
 def test_requires_all_77_orig_restrictive_guards(self):
  self.assertIn('REQUIRE_ALL_77_ORIGINAL_MARKS_RESTRICTIVE_GUARDS',s)
  self.assertIn("IF n <> 77",s)
 def test_preserves_original_marks_role_and_adds_app_role(self):
  self.assertIn('TO assps_marks_signed_runtime, apex_app_runtime',s)
  self.assertIn('DUAL_RUNTIME_SIGNED_WITH_CHECK_INCOMPLETE',s)
 def test_scope_school_and_tenant_guard_variants(self):
  self.assertIn('SCHOOL_SIGNED_GUARD_DRIFT',s)
  self.assertIn('TENANT_KEY_SIGNED_GUARD_DRIFT',s)
 def test_no_school_record_dml_or_privileged_login_roles(self):
  self.assertNotRegex(s,re.compile(r'\b(?:DELETE FROM|TRUNCATE|DROP TABLE|INSERT INTO|ALTER ROLE|CREATE ROLE)\b',re.I))
 def test_transactional_rollback_on_failure(self):
  self.assertIn('BEGIN;',s)
  self.assertTrue(s.rstrip().endswith('COMMIT;'))
if __name__=='__main__':unittest.main()
