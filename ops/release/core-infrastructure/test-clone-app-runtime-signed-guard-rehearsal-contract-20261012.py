#!/usr/bin/env python3
"""Static gate for a clone-only SQL rehearsal. Does not execute SQL."""
from pathlib import Path
import re
import unittest
script=Path(__file__).with_name('clone-app-runtime-signed-guard-rehearsal-20261012.sql').read_text()
class CloneSQLContract(unittest.TestCase):
 def test_exact_private_database_and_test_pg_port(self):
  self.assertIn("current_database() <> 'assps_core_rls_guard_qa_20261012'",script)
  self.assertIn("current_setting('port') <> '55432'",script)
  self.assertIn("current_user <> 'postgres'",script)
 def test_only_four_school_core_tables_are_modified(self):
  for table in ('students','attendance','fee_challans','employees'):
   self.assertRegex(script,r'ALTER POLICY core_signed_tenant_guard ON public\.'+table+r'\b')
  self.assertEqual(len(re.findall(r'ALTER POLICY core_signed_tenant_guard ON public\.',script)),4)
 def test_signed_marks_runtime_not_displaced(self):
  self.assertEqual(len(re.findall(r'TO assps_marks_signed_runtime, apex_app_runtime;',script)),4)
 def test_only_read_access_issued_on_four_tables(self):
  self.assertIn('GRANT SELECT ON TABLE public.students',script)
  self.assertNotRegex(script,re.compile(r'GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)',re.I))
 def test_no_destructive_or_cluster_role_changes(self):
  self.assertNotRegex(script,re.compile(r'\b(?:TRUNCATE|DROP|DELETE FROM|ALTER ROLE|CREATE ROLE|REVOKE)\b',re.I))
 def test_transactional_fail_closed_rollback_on_error(self):
  self.assertIn('BEGIN;',script)
  self.assertIn('COMMIT;',script)
  self.assertIn("RAISE EXCEPTION 'Refusing non-clone",script)
if __name__=='__main__':unittest.main()
