#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
path=Path(__file__).with_name('verify-fresh-restore-acl-parity-20261012.py')
spec=importlib.util.spec_from_file_location('acl_restore_parity',path)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def base():
 return {'protected_core_relations':75,**{role+'_'+op.lower():75 for role in m.ROLES for op in m.OPS}}
class AclRestoreTests(unittest.TestCase):
 def test_grant_parity_still_not_rollback(self):
  result=m.assess(base(),base())
  self.assertEqual(result['status'],'PASS_ROLE_GRANT_PARITY_ONLY')
  self.assertFalse(result['production_rollback_certified'])
 def test_no_acl_restoration_holds(self):
  f=base()
  for role in m.ROLES:
   for op in m.OPS:f[role+'_'+op.lower()]=0
  self.assertEqual(m.assess(base(),f)['status'],'HOLD')
 def test_each_missing_privilege_holds(self):
  for role in m.ROLES:
   for op in m.OPS:
    f=base();f[role+'_'+op.lower()]=74
    self.assertEqual(m.assess(base(),f)['status'],'HOLD')
 def test_protected_table_count_drift_holds(self):
  f=base();f['protected_core_relations']=74
  self.assertEqual(m.assess(base(),f)['status'],'HOLD')
 def test_production_grant_mismatch_does_not_falsely_pass(self):
  f=base();f['apex_app_runtime_select']=74
  self.assertEqual(m.assess(f,f)['status'],'HOLD')
 def test_source_and_restore_pg_ports_are_distinct(self):
  self.assertEqual(m.PROD,('5432','apexos'))
  self.assertEqual(m.RESTORED,('55432','assps_core_restore_verified_20261012'))
if __name__=='__main__':unittest.main()
