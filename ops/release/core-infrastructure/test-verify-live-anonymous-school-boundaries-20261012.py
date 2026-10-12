#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
path=Path(__file__).with_name('verify-live-anonymous-school-boundaries-20261012.py')
spec=importlib.util.spec_from_file_location('anon_gate',path)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class AnonymousBoundaryTests(unittest.TestCase):
 def test_eight_unauthorized_routes_pass(self):
  states={key:401 for key in m.PROTECTED}
  result=m.evaluate(states)
  self.assertEqual(result['verdict'],'PASS_ANONYMOUS_DENIAL_ONLY')
  self.assertFalse(result['signed_user_acceptance'])
 def test_any_successful_public_student_data_route_holds(self):
  for path in m.PROTECTED:
   states={key:401 for key in m.PROTECTED}
   states[path]=200
   self.assertEqual(m.evaluate(states)['verdict'],'HOLD',path)
 def test_unavailable_or_rate_limited_route_holds(self):
  states={key:401 for key in m.PROTECTED}
  states['/api/fees']=None
  self.assertEqual(m.evaluate(states)['verdict'],'HOLD')
  states['/api/fees']=429
  self.assertEqual(m.evaluate(states)['verdict'],'HOLD')
 def test_missing_route_holds(self):
  states={key:401 for key in m.PROTECTED if key!='/api/attendance'}
  self.assertEqual(m.evaluate(states)['verdict'],'HOLD')
 def test_unexpected_route_holds(self):
  states={key:401 for key in m.PROTECTED}
  states['/api/unknown']=401
  self.assertEqual(m.evaluate(states)['verdict'],'HOLD')
 def test_method_is_get_only_and_origin_pinned(self):
  self.assertEqual(m.ORIGIN,'https://app.assps.edu.pk')
  self.assertEqual(len(m.PROTECTED),8)
if __name__=='__main__':unittest.main()
