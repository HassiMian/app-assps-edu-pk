#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-fresh-restore-data-parity-20261012.py')
spec=importlib.util.spec_from_file_location('restore_parity',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture():
 return dict(students=322,attendance=12181,fee_challans=901,
     fee_payment_transactions=129,exam_results=2,rls_policies=368,
     public_tables=88,force_rls_tables=78,policy_digest='a'*32)
class RestoreParity(unittest.TestCase):
 def test_good_comparison_is_restore_only(self):
  result=m.assess(fixture(),fixture())
  self.assertEqual(result['status'],'PASS_RESTORE_PARITY_ONLY')
  self.assertFalse(result['real_backend_cutover_verified'])
  self.assertFalse(result['production_rollback_drill'])
 def test_one_row_mismatch_blocks(self):
  f=fixture();f['students']+=1
  self.assertEqual(m.assess(f,fixture())['status'],'HOLD')
 def test_exam_marks_row_mismatch_blocks(self):
  f=fixture();f['exam_results']+=1
  self.assertEqual(m.assess(f,fixture())['status'],'HOLD')
 def test_policy_definition_mismatch_blocks_even_same_count(self):
  f=fixture();f['policy_digest']='b'*32
  self.assertEqual(m.assess(f,fixture())['status'],'HOLD')
 def test_368_policies_required(self):
  a=fixture();b=fixture();a['rls_policies']=367;b['rls_policies']=367
  self.assertEqual(m.assess(a,b)['status'],'HOLD')
 def test_78_force_rls_required(self):
  a=fixture();b=fixture();a['force_rls_tables']=77;b['force_rls_tables']=77
  self.assertEqual(m.assess(a,b)['status'],'HOLD')
 def test_empty_restored_school_rejected(self):
  a=fixture();b=fixture();a['students']=0;b['students']=0
  self.assertEqual(m.assess(a,b)['status'],'HOLD')
 def test_database_targets_pinned(self):
  self.assertEqual(m.SOURCE,('5432','apexos'))
  self.assertEqual(m.RESTORE,('55432','assps_core_restore_verified_20261012'))
if __name__=='__main__':unittest.main()
