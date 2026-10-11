#!/usr/bin/env python3
"""Static checks complement, not replace, the actual signed-clone rehearsal."""
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[2]
class AuditContract(unittest.TestCase):
 def test_migration_is_tenant_forced_and_append_only(self):
  src=(HERE/'06-student-movement-audit-signed-rls.sql').read_text()
  self.assertIn('FORCE ROW LEVEL SECURITY',src)
  self.assertIn('ENABLE ROW LEVEL SECURITY',src)
  self.assertIn('AS RESTRICTIVE FOR INSERT TO assps_marks_signed_runtime',src)
  self.assertIn('AS PERMISSIVE FOR INSERT TO assps_marks_signed_runtime',src)
  self.assertEqual(src.count('core_security.signed_school_allowed(school_id)'),2)
  self.assertIn('GRANT INSERT ON TABLE',src)
  self.assertNotIn('GRANT SELECT ON TABLE',src)
  self.assertNotIn('DROP TABLE',src)
  self.assertNotIn('DROP OWNED',src)
  self.assertIn("current_setting('port')='55432'",src)
 def test_backout_is_scoped_to_audit_policies(self):
  src=(HERE/'07-student-movement-audit-signed-rls-backout.sql').read_text()
  self.assertIn('DROP POLICY assps_audit_tenant_allow',src)
  self.assertIn('DROP POLICY assps_audit_tenant_guard',src)
  self.assertIn('REVOKE INSERT ON TABLE',src)
  self.assertNotIn('DROP TABLE',src)
  self.assertNotIn('DELETE FROM',src)
  self.assertNotIn('DROP SCHEMA',src)
 def test_http_request_never_creates_table_and_refuses_unsecured_audit(self):
  src=(REPO/'al-siddique-backend/src/routes/studentRoutes.js').read_text()
  self.assertNotIn('CREATE TABLE IF NOT EXISTS public.student_class_movement_audit',src)
  self.assertIn('STUDENT_MOVEMENT_AUDIT_SECURITY_NOT_READY',src)
  self.assertIn('assps_audit_tenant_allow',src)
  self.assertIn('sourceSection',src)
  self.assertIn('STALE_ROSTER',src)
 def test_guarded_reversal_requires_explicit_confirmation_and_snapshot(self):
  src=(REPO/'ops/release/reverse-class-eight-cohort-recovery-20261011.py').read_text()
  self.assertIn('--acknowledge-separate-reversal-authorization',src)
  self.assertIn('PLAN_ONLY_NO_STUDENT_MOVEMENT',src)
  self.assertIn('hashlib.sha256',src)
  self.assertIn('IF updated_count <> 11',src)
  self.assertIn('IF audited_count <> 11',src)
  self.assertIn("AND class='Eight' AND section='Blue'",src)
if __name__=='__main__':unittest.main()
