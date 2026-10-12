#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
src=Path(__file__).with_name('app-runtime-policy-readiness-20261012.py')
spec=importlib.util.spec_from_file_location('policy_audit',src)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def rows(guard=False):
 r=[]
 for table in m.TABLES:
  r.append([table,'app_runtime_school_guard','RESTRICTIVE','apex_app_runtime',"current_setting('app.tenant_id')"])
  if guard:r.append([table,'additional_signed_guard','RESTRICTIVE','apex_app_runtime','core_security.signed_school_allowed(school_id)'])
 return r
class PolicyGateTest(unittest.TestCase):
 def test_unsigned_rls_guard_is_hold(self):
  self.assertEqual(len(m.classify(rows())['issues']),4)
 def test_strict_signed_guard_all_tables_passes(self):
  self.assertEqual(m.classify(rows(True))['status'],'PASS')
 def test_one_missing_guard_is_hold(self):
  samples=rows(True)
  samples=[record for record in samples if not(record[0]=='students' and record[1]=='additional_signed_guard')]
  self.assertIn('students:missing_signed_restrictive_guard',m.classify(samples)['issues'])
 def test_public_only_guard_not_counted(self):
  samples=rows();samples.append(['students','signed_public','RESTRICTIVE','public','core_security.signed_school_allowed(school_id)'])
  self.assertEqual(m.classify(samples)['status'],'HOLD')
 def test_permissive_signed_policy_is_not_guard(self):
  samples=rows();samples.append(['students','signed_allow','PERMISSIVE','apex_app_runtime','core_security.signed_school_allowed(school_id)'])
  self.assertEqual(m.classify(samples)['status'],'HOLD')
if __name__=='__main__': unittest.main()
