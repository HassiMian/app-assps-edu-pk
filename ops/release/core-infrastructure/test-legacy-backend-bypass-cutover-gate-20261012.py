#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('legacy-backend-bypass-cutover-gate-20261012.py')
spec=importlib.util.spec_from_file_location('legacy_bypass_gate',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class LegacyGateTests(unittest.TestCase):
 def test_current_deployed_bypass_must_hold(self):
  a=m.classify('apexos_user',True,False,True)
  self.assertEqual(a['status'],'HOLD')
  self.assertIn('deployed_login_bypasses_rls',a['issues'])
 def test_superuser_always_holds(self):
  self.assertEqual(m.classify('apex_app_runtime',False,True,True)['status'],'HOLD')
 def test_login_role_must_exist(self):
  self.assertEqual(m.classify('apex_app_runtime',False,False,False)['status'],'HOLD')
 def test_nonbypass_runtime_is_only_provisional(self):
  a=m.classify('assps_core_signed_login',False,False,True)
  self.assertEqual(a['status'],'PROVISIONAL_LOGIN_CHECK_ONLY')
  self.assertTrue(a['not_release_certification'])
 def test_admin_login_requires_hard_hold(self):
  self.assertEqual(m.classify('postgres',False,False,True)['status'],'HOLD')
 def test_ambiguous_or_invalid_identity_fails_closed(self):
  for data in ['DB_USER=apexos_user\nDB_USER=other','DB_USER=bad-id','DB_PASSWORD=private']:
   with self.assertRaises(ValueError):m.parse_role(data)
 def test_safe_login_role_parse(self):
  self.assertEqual(m.parse_role('DB_USER=apexos_user\nDB_PASSWORD=secret'),'apexos_user')
if __name__=='__main__':unittest.main()
