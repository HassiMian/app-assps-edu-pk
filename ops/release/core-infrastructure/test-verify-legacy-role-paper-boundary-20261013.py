#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-legacy-role-paper-boundary-20261013.py')
spec=importlib.util.spec_from_file_location('role_boundary',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def go():
    return {'role_data':{'legacy_canlogin':False,'legacy_bypassrls':False,
                         'paper_owner_nologin':True},
      'paper_owner':14,'paper_function_owner':3,'legacy_memberships':[],
      'restore_paper_exists':True,'restore_legacy_exists':True,
      'signed_app_guard_count':77}

class RoleCutoverTests(unittest.TestCase):
 def check(self,**kwargs):
  d=go();d.update(kwargs);return m.assess(**d)
 def test_all_preconditions_pass_but_never_release(self):
  x=self.check();self.assertEqual(x['verdict'],'ROLE_CATALOG_PRECHECK_ONLY')
  self.assertFalse(x['full_cutover_certified'])
 def test_legacy_login_active_holds(self):
  d=go()['role_data'].copy();d['legacy_canlogin']=True
  self.assertEqual(self.check(role_data=d)['verdict'],'HOLD')
 def test_bypassrls_holds(self):
  d=go()['role_data'].copy();d['legacy_bypassrls']=True
  self.assertEqual(self.check(role_data=d)['verdict'],'HOLD')
 def test_paper_owner_login_unsafe_holds(self):
  d=go()['role_data'].copy();d['paper_owner_nologin']=False
  self.assertEqual(self.check(role_data=d)['verdict'],'HOLD')
 def test_missing_paper_owner_object_holds(self):
  self.assertEqual(self.check(paper_owner=0)['verdict'],'HOLD')
 def test_missing_paper_function_holds(self):
  self.assertEqual(self.check(paper_function_owner=0)['verdict'],'HOLD')
 def test_legacy_core_paper_membership_holds(self):
  self.assertEqual(self.check(legacy_memberships=['apex_paper_owner','apex_app_runtime'])['verdict'],'HOLD')
 def test_missing_qa_globals_hold(self):
  self.assertEqual(self.check(restore_paper_exists=False)['verdict'],'HOLD')
  self.assertEqual(self.check(restore_legacy_exists=False)['verdict'],'HOLD')
 def test_signed_rls_guard_gap_holds(self):
  self.assertEqual(self.check(signed_app_guard_count=0)['verdict'],'HOLD')
if __name__=='__main__':unittest.main()
