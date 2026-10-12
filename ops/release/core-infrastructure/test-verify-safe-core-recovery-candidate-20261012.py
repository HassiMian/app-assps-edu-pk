#!/usr/bin/env python3
"""Pure isolated candidate denial, privilege and RLS release assertions."""
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-safe-core-recovery-candidate-20261012.py')
spec=importlib.util.spec_from_file_location('safe_recovery_gate',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def safe():
  return dict(nonempty_core_families=True,forged_denied_eight_app=True,
     forged_denied_eight_marks=True,database_public_access_revoked=True,roles_safe=True,
    rls_policy_count=77,signed_dual_with_check=77,signed_school_count=73,
    signed_tenant_key_count=4,core_tables=75,core_app_crud=75,
    core_marks_crud=75,sequence_reference_exact=True,sequence_count=78,
    signed_helpers_limited=True,signing_schema_both_accessible=True,
    protected_paper_grant_count=0,unsigned_denied_app=True,unsigned_denied_marks=True)
class CandidateGateTests(unittest.TestCase):
 def test_exact_isolated_candidate_is_not_live_release(self):
  output=m.evaluate(safe())
  self.assertEqual(output['status'],'PASS_ISOLATED_HARDENED_CANDIDATE_ONLY')
  self.assertFalse(output['authenticated_login_accepted'])
  self.assertFalse(output['production_release_certified'])
 def test_every_material_security_dimension_holds_if_corrupted(self):
  expected=safe()
  for field,value in expected.items():
   bad=expected.copy()
   bad[field]=not value if isinstance(value,bool) else value-1
   self.assertEqual(m.evaluate(bad)['status'],'HOLD',field)
 def test_public_access_leak_rejected(self):
  bad=safe();bad['database_public_access_revoked']=False
  self.assertIn('database_public_access_revoked_mismatch',m.evaluate(bad)['issues'])
 def test_cannot_confuse_app_grants_with_signed_guards(self):
  bad=safe();bad['signed_dual_with_check']=0
  self.assertEqual(m.evaluate(bad)['status'],'HOLD')
 def test_unsigned_spoofed_access_is_mandatory_denial(self):
  for role in ('unsigned_denied_app','unsigned_denied_marks'):
   bad=safe();bad[role]=False
   self.assertEqual(m.evaluate(bad)['status'],'HOLD',role)
 def test_protected_paper_module_zero_privileges(self):
  bad=safe();bad['protected_paper_grant_count']=1
  self.assertEqual(m.evaluate(bad)['status'],'HOLD')
 def test_schema_helper_permissions_are_part_of_security(self):
  bad=safe();bad['signed_helpers_limited']=False
  self.assertEqual(m.evaluate(bad)['status'],'HOLD')
 def test_pinned_restore_candidate_not_production(self):
  self.assertEqual(m.DB,'assps_core_signed_recovery_candidate_20261012')
  self.assertEqual(m.PORT,'55432')
if __name__=='__main__':unittest.main()
