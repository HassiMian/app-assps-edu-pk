import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
p=Path(__file__).with_name('verify_frontend_rollback_disk_budget_20261016.py')
spec=importlib.util.spec_from_file_location('capacity',p)
capacity=importlib.util.module_from_spec(spec);spec.loader.exec_module(capacity)

class CapacityGuardTests(unittest.TestCase):
 def test_exact_three_snapshots_plus_three_gib(self):
  result=capacity.assess(10*capacity.GIB,[100,200,300,400])
  self.assertTrue(result['ready'])
  self.assertEqual(result['required_bytes'],3*1000+3*capacity.GIB)
  self.assertIn('NOT_RELEASE', result['decision'])
 def test_no_capacity_margins_faked(self):
  self.assertFalse(capacity.assess(3*capacity.GIB+2999,[100,200,300,400])['ready'])
  self.assertTrue(capacity.assess(3*capacity.GIB+3000,[100,200,300,400])['ready'])
 def test_bool_cannot_impersonate_integer(self):
  for free in (True,False,None,-1):
   self.assertFalse(capacity.assess(free,[1,1])['ready'])
 def test_missing_or_fake_sizes_block(self):
  for sizes in ([],[0],[-1],[True],[None],[4.5]):
   self.assertFalse(capacity.assess(10*capacity.GIB,sizes)['ready'])
 def test_negative_reserve_is_invalid(self):
  self.assertFalse(capacity.assess(10*capacity.GIB,[10],-1)['ready'])
 def test_missing_paths_fail_closed_before_du(self):
  with patch.object(capacity,'LIVE_NEXT',Path('/nonexistent-next-stage-test')):
   outcome=capacity.run(Path('/nonexistent-core'),Path('/nonexistent-stage'))
  self.assertFalse(outcome['ready'])
  self.assertFalse(outcome['production_modified'])
  self.assertFalse(outcome['signed_recovery_certified'])
  self.assertFalse(outcome['production_release_authorized'])
  self.assertFalse(outcome['backup_created'])

if __name__=='__main__':unittest.main()
