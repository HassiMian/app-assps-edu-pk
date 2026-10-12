#!/usr/bin/env python3
"""Static transaction-safety review of two owned clone-only SQL rehearsals."""
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).parent
CRUD=(ROOT/'rehearse-core-crud-grants-combined-clone-only-20261012.sql').read_text()
PAPER=(ROOT/'rehearse-protected-paper-grant-exclusion-clone-only-20261012.sql').read_text()
class GrantScriptSafetyTests(unittest.TestCase):
 def test_both_scripts_are_exact_disposable_clone_only(self):
  for s in [CRUD,PAPER]:
   self.assertIn("current_database()<>'assps_core_rls_guard_qa_20261012'",s)
   self.assertIn("current_setting('port')<>'55432'",s)
   self.assertIn("current_user<>'postgres'",s)
 def test_both_scripts_transactional(self):
  for s in [CRUD,PAPER]:
   self.assertIn('BEGIN;',s)
   self.assertTrue(s.rstrip().endswith('COMMIT;'))
 def test_no_mutation_of_school_rows_or_role_login(self):
  forbidden=r'\b(?:DROP TABLE|TRUNCATE|DELETE FROM|UPDATE\s+[A-Za-z]|INSERT INTO|ALTER ROLE|CREATE ROLE|GRANT ALL)\b'
  for s in [CRUD,PAPER]:
   self.assertNotRegex(s,re.compile(forbidden,re.I))
 def test_app_runtime_75_core_tables_only(self):
  self.assertIn("NOT IN ('paper_documents','paper_revisions')",CRUD)
  self.assertIn('GRANT INSERT, UPDATE, DELETE ON TABLE',CRUD)
  self.assertIn('APP_CRUD_GRANTS_NOT_COMPLETE',CRUD)
 def test_protected_paper_marks_grants_revoked_not_rls(self):
  self.assertIn('REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE',PAPER)
  self.assertIn('FROM assps_marks_signed_runtime;',PAPER)
  self.assertNotIn('ALTER POLICY',PAPER)
 def test_policy_with_check_enforced_pregrant(self):
  self.assertIn("coalesce(qual,'')=coalesce(with_check,'')",CRUD)
  self.assertIn('EXACT_DUAL_SIGNED_WITH_CHECK_REQUIRED',CRUD)
 def test_marks_and_app_roles_checked_nonprivileged(self):
  for s in [CRUD,PAPER]:
   self.assertIn('rolbypassrls',s)
   self.assertIn('rolsuper',s)
   self.assertIn('rolcanlogin',s)
if __name__=='__main__':unittest.main()
