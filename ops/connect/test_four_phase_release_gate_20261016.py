import importlib.util
from pathlib import Path
from copy import deepcopy
import unittest
p=Path(__file__).with_name('run_four_phase_release_gate_20261016.py')
s=importlib.util.spec_from_file_location('gate',p);g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
def sample():
 return [
  {'source_sha':g.LIVE_HTML,'nginx_root_correct':True,'https_ok':True,'result_counts':g.RESULT_COUNTS,'pg_transaction_read_only':True},
  {'decision':'OPTIMIZED_NEXT_BUILD_PROVENANCE_PASS','optimized_build_exit_observed':True,'production_release_authorized':False},
  {'technical_candidate_status':'PASS','production_modified':False,'next_candidate_build_id':g.NEXT_BUILD},
  {'status':'READY_FOR_LOGIN_ONLY_CORE','checks':{str(i):True for i in range(13)},'signed_runtime_security_certified':True}
 ]
class Phases(unittest.TestCase):
 def check(self,i=None,changes=None):
  v=deepcopy(sample())
  if i is not None:v[i].update(changes)
  return g.make_phase_decisions(*v)
 def test_verified_never_self_deploys(self):
  o=self.check();self.assertEqual(o['phase_4_protected_production_cutover'],'CORE_ONLY_PENDING');self.assertFalse(o['public_release_authorized_by_this_tool'])
 def test_official_hold(self):self.assertEqual(self.check(3,{'status':'HOLD'})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_incomplete_signed_checklist(self):self.assertEqual(self.check(3,{'checks':{}})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_unsatisfied_check(self):self.assertEqual(self.check(3,{'checks':{str(i):i!=4 for i in range(13)}})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_absent_verified_signer(self):self.assertEqual(self.check(3,{'signed_runtime_security_certified':False})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_original_mark_zeros_locked(self):self.assertEqual(self.check(0,{'result_counts':'1763|0'})['phase_1_readonly_production_integrity'],'HOLD')
 def test_wrong_current_root(self):self.assertEqual(self.check(0,{'source_sha':'0'*64})['phase_1_readonly_production_integrity'],'HOLD')
 def test_missing_live_db_evidence(self):self.assertEqual(self.check(0,{'pg_transaction_read_only':False})['phase_1_readonly_production_integrity'],'HOLD')
 def test_current_stage_mismatch(self):self.assertEqual(self.check(2,{'next_candidate_build_id':'stale'})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_build_not_completed(self):self.assertEqual(self.check(1,{'optimized_build_exit_observed':False})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_stage_cannot_authorize_prod(self):self.assertEqual(self.check(1,{'production_release_authorized':True})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_no_acceptance_of_mutated_prod(self):self.assertEqual(self.check(2,{'production_modified':True})['phase_2_compiled_connect_core_integration'],'HOLD')
if __name__=='__main__':unittest.main()
