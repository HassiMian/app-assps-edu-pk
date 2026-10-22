import unittest,sys
from pathlib import Path
from subprocess import CompletedProcess
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_exam9_immutability_readonly import inspect
def run(row,truncate,rls='t'):
 return lambda *args,**kwargs: CompletedProcess(args[0],0,
  'relrowsecurity,relforcerowsecurity,row_guard,truncate_guard\n'+
  rls+','+rls+','+str(row)+','+str(truncate)+'\n','')
class ImmutableSourceTests(unittest.TestCase):
 def test_verified_live_guard_shape_passes(self):self.assertTrue(inspect(runner=run(1,1))['pass'])
 def test_missing_row_trigger_fails(self):self.assertFalse(inspect(runner=run(0,1))['pass'])
 def test_missing_truncate_trigger_fails(self):self.assertFalse(inspect(runner=run(1,0))['pass'])
 def test_disabled_force_rls_fails(self):self.assertFalse(inspect(runner=run(1,1,'f'))['pass'])
