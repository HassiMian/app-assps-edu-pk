#!/usr/bin/env python3
"""Source-only release contract checks; not a substitute for executing SQL or actor tests."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent
class SignedMigrationContract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.up=(ROOT/'01-additive-schema-policies.sql').read_text()
  cls.rollback=(ROOT/'03-additive-security-rollback.sql').read_text()
  cls.login=(ROOT/'04-provision-isolated-login.sql').read_text()
  cls.login_backout=(ROOT/'05-backout-isolated-login.sql').read_text()
 def test_allow_and_guard_target_only_dedicated_role(self):
  self.assertIn('CREATE POLICY core_signed_tenant_allow',self.up)
  self.assertIn('CREATE POLICY core_signed_tenant_guard',self.up)
  self.assertIn('75/2,73/4',self.up)
  self.assertIn("n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity",self.up)
  self.assertNotIn('GRANT apex_app_runtime TO assps_marks_signed_runtime',self.up)
  self.assertNotIn('FOR ALL TO apex_app_runtime',self.up)
 def test_reject_wrong_database_and_no_old_roles_modified(self):
  for value in (self.up,self.rollback,self.login,self.login_backout):
   self.assertIn("current_database()='apexos'",value)
   self.assertIn("current_setting('port')",value)
   self.assertNotIn('DROP OWNED BY apex_app_runtime',value)
   self.assertNotIn('DROP ROLE apex_app_runtime',value)
   self.assertNotIn('REVOKE apex_app_runtime FROM apexos_user',value)
 def test_signed_login_has_no_direct_table_privilege(self):
  self.assertIn('NOINHERIT NOBYPASSRLS',self.login)
  self.assertIn('unexpected_count<>0',self.login)
  self.assertIn("pg_has_role('assps_marks_signed_login','assps_marks_signed_runtime','USAGE')",self.login)
  self.assertIn('active connections',self.login_backout)
 def test_schema_rollback_preserves_old_roles_and_legacy_policies(self):
  self.assertIn('DROP POLICY core_signed_tenant_allow',self.rollback)
  self.assertIn('DROP POLICY core_signed_tenant_guard',self.rollback)
  self.assertIn('legacy_count<>212',self.rollback)
  self.assertIn("rolname='assps_marks_signed_login'",self.rollback)
  self.assertIn('DROP ROLE assps_marks_signed_runtime',self.rollback)
  self.assertIn('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM assps_marks_signed_runtime',self.rollback)
  self.assertNotIn('DROP ROLE apex_app_runtime',self.rollback)
  self.assertNotIn('DROP OWNED BY',self.rollback)
if __name__=='__main__':unittest.main()
