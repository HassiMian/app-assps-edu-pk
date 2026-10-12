#!/usr/bin/env python3
"""Negative and positive pure release policies; no DB connections."""
import importlib.util
from pathlib import Path
import unittest
path=Path(__file__).with_name('verify-dual-runtime-crud-boundary-20261012.py')
spec=importlib.util.spec_from_file_location('dual_runtime_crud',path)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def fixture():
 return {'protected_tables':77,'both_runtime_signed_guard':77,
         'signed_guard_with_check':77,
         'app_select':75,'app_insert':75,'app_update':75,'app_delete':75,
         'paper_table_count':2,'app_paper_granted':0,
         'marks_select':75,'marks_insert':75,'marks_update':75,'marks_delete':75,
         'marks_paper_granted':0,'runtime_roles_safe':2}

class DualRuntimeCrudTests(unittest.TestCase):
 def test_complete_catalog_still_requires_http_acceptance(self):
  a=m.verdict(fixture());self.assertEqual(a['status'],'PASS_ISOLATED_CATALOG_ONLY')
  self.assertFalse(a['authenticated_route_acceptance'])
  self.assertFalse(a['full_production_certified'])
 def test_missing_app_write_permission_holds(self):
  for key in ['app_insert','app_update','app_delete']:
   f=fixture();f[key]=0
   self.assertEqual(m.verdict(f)['status'],'HOLD',key)
 def test_missing_marks_write_permission_holds(self):
  for key in ['marks_insert','marks_update','marks_delete']:
   f=fixture();f[key]=74
   self.assertEqual(m.verdict(f)['status'],'HOLD',key)
 def test_paper_grant_leak_fails_closed_for_both_roles(self):
  for key in ['app_paper_granted','marks_paper_granted']:
   f=fixture();f[key]=1
   self.assertEqual(m.verdict(f)['status'],'HOLD',key)
 def test_missing_signed_using_guard_holds(self):
  f=fixture();f['both_runtime_signed_guard']=76
  self.assertEqual(m.verdict(f)['status'],'HOLD')
 def test_missing_write_with_check_holds(self):
  f=fixture();f['signed_guard_with_check']=76
  self.assertEqual(m.verdict(f)['status'],'HOLD')
 def test_runtime_login_or_bypass_holds(self):
  f=fixture();f['runtime_roles_safe']=1
  self.assertEqual(m.verdict(f)['status'],'HOLD')
 def test_required_77_protected_relations_do_not_shrink(self):
  f=fixture();f['protected_tables']=76
  self.assertEqual(m.verdict(f)['status'],'HOLD')
 def test_extra_paper_relation_holds(self):
  f=fixture();f['paper_table_count']=3
  self.assertEqual(m.verdict(f)['status'],'HOLD')
 def test_missing_allowed_read_scope_holds(self):
  for key in ['app_select','marks_select']:
   f=fixture();f[key]=74
   self.assertEqual(m.verdict(f)['status'],'HOLD',key)
if __name__=='__main__':unittest.main()
