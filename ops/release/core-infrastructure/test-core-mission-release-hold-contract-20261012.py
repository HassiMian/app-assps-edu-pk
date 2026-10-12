#!/usr/bin/env python3
"""Pure static release authority regression; no process or database writes."""
from pathlib import Path
import unittest
s=Path(__file__).with_name('run-three-gate-core-mission-20261012.sh').read_text()
class RunnerContract(unittest.TestCase):
 def test_auth_signoff_still_requires_nonzero_exit(self):
  self.assertIn("full_backend_release=HOLD_PENDING_AUTHENTICATED_ROUTE_ACCEPTANCE_AND_RELEASE_CERTIFICATION'\necho 'production_change=NONE'",s)
  self.assertTrue(s.rstrip().endswith('exit 2'))
 def test_restrictive_role_remains_release_gate(self):
  self.assertIn('run_gate legacy_backend_bypass',s)
 def test_cloned_guard_does_not_replace_baseline_clone_gate(self):
  self.assertIn('run_gate unsigned_rpl_runtime',s)
  self.assertIn('run_gate staged_core_guard_clone',s)
 def test_synthetic_browser_failures_can_never_be_silently_ignored(self):
  self.assertIn("[QA_TRANSPORT_RETRY_FAILED]",s)
  self.assertIn('run_source browser_marks run_marks_fixture',s)
 def test_all77_guarded_clone_and_production_have_independent_gates(self):
  self.assertIn('run_gate full77_combined_signed_clone',s)
  self.assertIn('run_gate full77_live_production',s)
 def test_active_nginx_method_scope_must_be_verified(self):
  self.assertIn('run_gate live_marks_method_contract',s)
 def test_role_write_privileges_on_guarded_clone_and_live_are_distinct_gates(self):
  self.assertIn('run_gate dual_runtime_crud_clone',s)
  self.assertIn('run_gate dual_runtime_crud_live',s)
 def test_unauthenticated_live_denial_is_its_own_gate(self):
  self.assertIn('run_gate anonymous_school_boundary',s)
 def test_fresh_checked_backup_required_but_not_release_approval(self):
  self.assertIn('run_gate fresh_backup_chain',s)
 def test_mutating_prod_migration_not_invoked(self):
  self.assertNotIn('pg_restore -c',s)
  self.assertNotIn('ALTER ROLE apexos_user',s)
if __name__=='__main__':unittest.main()
