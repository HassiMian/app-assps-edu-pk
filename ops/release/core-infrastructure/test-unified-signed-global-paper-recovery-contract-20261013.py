#!/usr/bin/env python3
from pathlib import Path
import re,unittest
s=Path(__file__).with_name('rehearse-unified-signed-global-paper-recovery-20261013.sql').read_text()
class RehearsalContract(unittest.TestCase):
 def test_isolated_database_and_port_enforced(self):
  self.assertIn("current_database()<>'assps_core_unified_security_recovery_20261013'",s)
  self.assertIn("current_setting('port')<>'55432'",s)
 def test_force_and_existing_signed_guards_mandatory(self):
  self.assertIn('REQUIRE_77_ORIGINAL_SIGNED_MARKS_GUARDS',s)
  self.assertIn('REQUIRE_77_FORCE_RLS_TABLES',s)
 def test_paper_owner_exact_scope_preserved(self):
  self.assertIn('PAPER_OWNER_RELATIONS_NOT_RESTORED',s)
  self.assertIn('PAPER_OWNER_FUNCTIONS_NOT_RESTORED',s)
  self.assertIn('PAPER_DOCUMENT_LEAST_PRIVILEGE_VIOLATION',s)
 def test_no_privileged_role_created(self):
  self.assertIn('NO_PRIVILEGED_OR_LOGIN_QA_ROLES',s)
  self.assertNotIn('CREATE ROLE',s)
 def test_signed_using_and_write_check_exact(self):
  self.assertIn('EXACT_DUAL_USING_WITH_CHECK_MISSING',s)
  self.assertIn('SIGNED_SCHOOL_POLICY_DRIFT',s)
  self.assertIn('SIGNED_TENANT_POLICY_DRIFT',s)
 def test_revoke_public_database_access(self):
  self.assertIn('REVOKE CONNECT,TEMPORARY ON DATABASE assps_core_unified_security_recovery_20261013 FROM PUBLIC;',s)
 def test_recovered_database_owner_is_safe_nologin_legacy_placeholder(self):
  self.assertIn('ALTER DATABASE assps_core_unified_security_recovery_20261013 OWNER TO apexos_user;',s)
 def test_transactional_and_no_school_row_mutations(self):
  self.assertTrue(s.rstrip().endswith('COMMIT;'))
  self.assertIn('BEGIN;',s)
  self.assertNotRegex(s,re.compile(r'\b(?:DROP|TRUNCATE|DELETE FROM|INSERT INTO|UPDATE\s+\w+)\b',re.I))
if __name__=='__main__':unittest.main()
