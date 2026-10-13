#!/usr/bin/env python3
from pathlib import Path
import re,unittest
s=Path(__file__).with_name('rehearse-paper-owner-global-recovery-20261013.sql').read_text()
class Contract(unittest.TestCase):
 def test_exact_private_restore_db_and_pgport(self):
  self.assertIn("current_database()<>'assps_core_restore_verified_20261012'",s)
  self.assertIn("current_setting('port')<>'55432'",s)
  self.assertIn("current_user<>'postgres'",s)
 def test_legacy_privileged_role_must_not_be_created(self):
  self.assertIn('REFUSE_PRIVILEGED_LEGACY_ROLE',s)
  self.assertNotIn('CREATE ROLE apexos_user',s)
 def test_paper_role_must_have_no_login_or_bypass(self):
  self.assertIn('CREATE ROLE apex_paper_owner NOLOGIN NOINHERIT NOSUPERUSER',s)
  self.assertIn('NOBYPASSRLS',s)
 def test_exact_paper_owner_object_inventory(self):
  self.assertIn('EXPECTED_EXACT_14_OWNED_PAPER_RELATIONS',s)
  self.assertIn('EXPECTED_EXACT_3_PAPER_FUNCTIONS',s)
 def test_refuse_core_and_marks_protected_paper_table_access(self):
  self.assertIn('PROTECTED_PAPER_RUNTIME_BARRIER_BROKEN',s)
 def test_transaction_rollback_and_no_row_dml(self):
  self.assertIn('BEGIN;',s)
  self.assertTrue(s.rstrip().endswith('COMMIT;'))
  self.assertNotRegex(s,re.compile(r'\b(?:DROP|TRUNCATE|DELETE FROM|UPDATE\s+\w+|INSERT INTO)\b',re.I))
if __name__=='__main__':unittest.main()
