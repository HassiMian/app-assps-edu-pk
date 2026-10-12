#!/usr/bin/env python3
"""Only review grant-recovery code; no DDL or DB session in these tests."""
import importlib.util
import json
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).parent
spec=importlib.util.spec_from_file_location('recovery_acl',ROOT/'reconcile-isolated-core-restore-grants-20261012.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class RecoveryContract(unittest.TestCase):
 def test_static_sequence_manifest_exact_and_no_passwords(self):
  x=json.loads(m.REF.read_text())
  self.assertEqual(x['source_port'],5432)
  self.assertEqual(x['safe_test_clone'],m.CLONE_DB)
  self.assertEqual(len(x['references']),78)
  for name,want in [('app_usage',73),('app_read',73),('marks_usage',74),('marks_read',73)]:
   self.assertEqual(sum(x[name] for x in x['references']),want)
  self.assertFalse(any(key in m.REF.read_text().lower() for key in ('password','hmac','secret','token')))
 def test_sql_builder_only_targets_safe_pg_cluster(self):
  s=m.build_sql([dict(sequence='students_id_seq',app_usage=True,app_read=True,
                      marks_usage=True,marks_read=True)],['students'])
  self.assertIn("current_database()<>'assps_core_restore_verified_20261012'",s)
  self.assertIn("current_setting('port')<>'55432'",s)
  self.assertNotIn('CREATE ROLE',s)
  self.assertNotIn('BYPASSRLS',s)
  self.assertIn('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.students',s)
  self.assertIn('REVOKE EXECUTE ON FUNCTION core_security.signed_school_allowed',s)
 def test_only_constrained_role_sequence_permissions_emitted(self):
  s=m.build_sql([dict(sequence='student_class_movement_audit_id_seq',
      app_usage=False,app_read=False,marks_usage=True,marks_read=False)],['students'])
  self.assertIn('GRANT USAGE ON SEQUENCE public.student_class_movement_audit_id_seq TO assps_marks_signed_runtime;',s)
  self.assertNotIn('TO apex_app_runtime;',s.split('ON SEQUENCE public.student_class_movement_audit_id_seq')[0])
 def test_no_prod_write_command_in_generated_sql(self):
  s=m.build_sql([],['students'])
  self.assertNotRegex(s,re.compile(r'\b(?:DROP|TRUNCATE|DELETE FROM|UPDATE\s+\w+|INSERT INTO|CREATE ROLE|ALTER ROLE)\b',re.I))
 def test_transaction_boundaries(self):
  s=m.build_sql([],['students'])
  self.assertEqual(s.splitlines()[0],'BEGIN;')
  self.assertEqual(s.splitlines()[-1],'COMMIT;')
if __name__=='__main__':unittest.main()
