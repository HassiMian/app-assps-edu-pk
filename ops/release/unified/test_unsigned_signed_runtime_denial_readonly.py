import unittest,sys
from pathlib import Path
from subprocess import CompletedProcess
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_unsigned_signed_runtime_denial_readonly import inspect
def output(one=0,two=0,exit=0):
 return lambda *a,**kw:CompletedProcess(a[0],exit,
  'BEGIN\nSET\nschool1|'+str(one)+'\nschool2|'+str(two)+'\nROLLBACK\n','')
class SignedRuntimeNegativeTests(unittest.TestCase):
 def test_both_denied_pass(self):
  r=inspect(runner=output())
  self.assertTrue(r['pass'])
  self.assertFalse(r['authenticated_signed_school_allow_proven'])
 def test_school1_exposure_fails(self):
  self.assertFalse(inspect(runner=output(one=1))['pass'])
 def test_school2_exposure_fails(self):
  self.assertFalse(inspect(runner=output(two=1))['pass'])
 def test_failed_role_change_is_not_success(self):
  self.assertFalse(inspect(runner=output(exit=1))['pass'])
