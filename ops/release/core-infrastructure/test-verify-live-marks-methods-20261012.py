#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-live-marks-methods-20261012.py')
spec=importlib.util.spec_from_file_location('marks_method_gate',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
def facts():
 return {k:{'default':'$assps_marks_legacy_upstream',**v} for k,v in m.EXPECTED.items()}
class ScopedMethodsTests(unittest.TestCase):
 def check(self,maps=None,**kwargs):
  values=dict(maps_hash_matches=True,loc_hash_matches=True,
              app_has_exact_include=True,nginx_ok=True)
  values.update(kwargs)
  return m.classify(facts() if maps is None else maps,**values)
 def test_reviewed_methods_scoped_not_full_backend(self):
  a=self.check();self.assertEqual(a['status'],'PASS_SCOPED_METHODS_ONLY')
  self.assertTrue(a['not_full_backend_certification'])
 def test_post_exams_must_not_be_silently_called_signed(self):
  self.assertIn('POST /api/exams',self.check()['legacy_management_methods'])
 def test_unreviewed_put_results_upstream_is_rejected(self):
  a=facts();a['assps_marks_results_upstream']['PUT']='http://127.0.0.1:5091'
  self.assertEqual(self.check(a)['status'],'HOLD')
 def test_signature_route_missing_rejected(self):
  a=facts();del a['assps_marks_results_upstream']['POST']
  self.assertEqual(self.check(a)['status'],'HOLD')
 def test_source_hash_drift_rejected(self):
  self.assertEqual(self.check(maps_hash_matches=False)['status'],'HOLD')
  self.assertEqual(self.check(loc_hash_matches=False)['status'],'HOLD')
 def test_missing_live_include_rejected(self):
  self.assertEqual(self.check(app_has_exact_include=False)['status'],'HOLD')
 def test_nginx_syntax_must_pass(self):
  self.assertEqual(self.check(nginx_ok=False)['status'],'HOLD')
 def test_map_regex_extracts_actual_required_keys(self):
  s='map $request_method $assps_marks_catalog_upstream {\n default $assps_marks_legacy_upstream;\n GET http://127.0.0.1:5091;\n}'
  self.assertEqual(m.map_blocks(s)['assps_marks_catalog_upstream']['GET'],'http://127.0.0.1:5091')
if __name__=='__main__':unittest.main()
