#!/usr/bin/env python3
"""Review clone-only dual-signature migration boundaries without applying SQL."""
from pathlib import Path
import re
import unittest
s=Path(__file__).with_name('rehearse-all77-dual-signed-guards-clone-only-20261012.sql').read_text()
class DualGuardContract(unittest.TestCase):
 def test_qaclonedb_and_port_are_mandatory(self):
  self.assertIn("current_database()<>'assps_core_rls_guard_qa_20261012'",s)
  self.assertIn("current_setting('port')<>'55432'",s)
 def test_verify_77_force_rls_tables_before_modification(self):
  self.assertIn('IF n<>77 THEN',s)
  self.assertIn("FORCE_RLS_PROTECTED_TABLE_COUNT_DRIFT",s)
 def test_preserve_existing_signed_marks_runtime_role(self):
  self.assertIn('TO assps_marks_signed_runtime, apex_app_runtime',s)
  self.assertIn('DUAL_GUARD_INCOMPLETE',s)
 def test_retain_protected_paper_document_grant_exclusions(self):
  self.assertIn("NOT IN ('paper_documents','paper_revisions')",s)
  self.assertIn("GRANT SELECT ON TABLE",s)
  self.assertIn("APP_SELECT_GRANTS_NOT_EXACT_75",s)
 def test_no_destructive_ddl_or_role_privilege_escalation(self):
  self.assertNotRegex(s,re.compile(r'\b(?:DROP|TRUNCATE|DELETE FROM|ALTER ROLE|CREATE ROLE|GRANT ALL)\b',re.I))
 def test_is_transactional_for_failure_revert(self):
  self.assertTrue(s.lstrip().startswith('--'))
  self.assertIn('BEGIN;',s)
  self.assertIn('COMMIT;',s)
if __name__=='__main__':unittest.main()
