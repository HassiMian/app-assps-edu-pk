#!/usr/bin/env python3
from pathlib import Path
import re,unittest
s=Path(__file__).with_name('rehearse-restricted-legacy-global-owner-20261013.sql').read_text()
class Contract(unittest.TestCase):
 def test_disposable_db_only(self):
  self.assertIn("current_database()<>'assps_core_acl_replay_qa_20261013'",s)
  self.assertIn("current_setting('port')<>'55432'",s)
 def test_nonprivileged_nologin_owner(self):
  self.assertIn('CREATE ROLE apexos_user NOLOGIN NOINHERIT NOSUPERUSER',s)
  self.assertIn('NOBYPASSRLS',s)
 def test_zero_inherited_roles(self):
  self.assertIn('PLACEHOLDER_MUST_HAVE_ZERO_ROLE_MEMBERSHIPS',s)
 def test_paper_owner_must_be_safe_and_present(self):
  self.assertIn('PAPER_OWNER_SAFE_MAPPING_MISSING',s)
 def test_transaction_and_no_content_dml(self):
  self.assertIn('BEGIN;',s)
  self.assertTrue(s.rstrip().endswith('COMMIT;'))
  self.assertNotRegex(s,re.compile(r'\b(?:DROP|TRUNCATE|DELETE FROM|INSERT INTO|UPDATE\s+\w+)\b',re.I))
if __name__=='__main__':unittest.main()
