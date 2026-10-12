#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-core-clone-signed-app-guard-20261012.py')
spec=importlib.util.spec_from_file_location('clone_guard_gate',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def fixture():
 return [dict(table=name,enabled=True,forced=True,restricted=True,
              signed_marks_preserved=True,app_runtime_scoped=True,app_select=True,
              app_bypass=False,app_login=False,app_super=False) for name in m.CORE_TABLES]
class GateTests(unittest.TestCase):
 def test_clean_guarded_clone(self):
  self.assertEqual(m.evaluate(fixture(),4)['verdict'],'PASS')
 def test_deployed_core_guard_changed_without_authorization(self):
  self.assertEqual(m.evaluate(fixture(),0)['verdict'],'HOLD')
 def test_missing_grant_holds(self):
  a=fixture();a[0]['app_select']=False
  self.assertEqual(m.evaluate(a,4)['verdict'],'HOLD')
 def test_unsigned_policy_role_omitted_holds(self):
  a=fixture();a[0]['app_runtime_scoped']=False
  self.assertEqual(m.evaluate(a,4)['verdict'],'HOLD')
 def test_missing_force_rls_holds(self):
  a=fixture();a[0]['forced']=False
  self.assertEqual(m.evaluate(a,4)['verdict'],'HOLD')
 def test_signed_marks_role_not_replaced(self):
  a=fixture();a[1]['signed_marks_preserved']=False
  self.assertEqual(m.evaluate(a,4)['verdict'],'HOLD')
 def test_unexpected_relation_holds(self):
  a=fixture();a[0]['table']='paper_documents'
  self.assertEqual(m.evaluate(a,4)['verdict'],'HOLD')
 def test_privileged_app_role_holds(self):
  a=fixture();a[0]['app_super']=True
  self.assertEqual(m.evaluate(a,4)['verdict'],'HOLD')
if __name__=='__main__':unittest.main()
