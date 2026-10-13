#!/usr/bin/env python3
"""Offline test of Hostinger disk allocation vs partition/filesystem release gate."""
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('hostinger-100gb-capacity-preflight-20261013.py')
spec=importlib.util.spec_from_file_location('capacity',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
GiB=1024**3
class CapacityTests(unittest.TestCase):
 def assess(self,disk=110*GiB,part=106*GiB,fs=105*GiB,free=55*GiB,fstype='ext4'):
  return m.evaluate(disk,part,fs,free,fstype)
 def test_allocated_storage_is_not_full_release(self):
  a=self.assess()
  self.assertEqual(a['verdict'],'CAPACITY_PRECONDITIONS_PASS_ONLY')
  self.assertFalse(a['provider_payment_executed'])
  self.assertFalse(a['release_certification'])
 def test_current_hostinger_50gb_must_hold(self):
  a=self.assess(disk=50*GiB,part=49*GiB,fs=48*GiB,free=4*GiB)
  self.assertEqual(a['verdict'],'HOLD')
  self.assertIn('HOSTINGER_PROVIDER_100GB_NOT_ALLOCATED',a['issues'])
 def test_100gb_disk_without_partition_growth_holds(self):
  self.assertEqual(self.assess(part=49*GiB,fs=48*GiB)['verdict'],'HOLD')
 def test_partition_grown_but_fs_not_grown_holds(self):
  self.assertEqual(self.assess(fs=48*GiB)['verdict'],'HOLD')
 def test_file_space_insufficient_even_after_upgrade(self):
  self.assertEqual(self.assess(free=4*GiB)['verdict'],'HOLD')
 def test_fs_larger_than_partition_holds(self):
  self.assertEqual(self.assess(part=100*GiB,fs=110*GiB)['verdict'],'HOLD')
 def test_unknown_fs_holds(self):
  self.assertEqual(self.assess(fstype='xfs')['verdict'],'HOLD')
 def test_disk_exactly_100gb_threshold(self):
  self.assertEqual(self.assess(disk=100_000_000_000,part=96_000_000_000,fs=95_000_000_000)['verdict'],
                   'CAPACITY_PRECONDITIONS_PASS_ONLY')
if __name__=='__main__':unittest.main()
