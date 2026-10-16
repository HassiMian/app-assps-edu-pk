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
  {'status':'READY_FOR_LOGIN_ONLY_CORE','checks':{k:True for k in g.REQUIRED_OFFICIAL_CHECKS},'signed_runtime_security_certified':True},
  {'optimized_build':0,'joint_candidate':0,'official_release':0}
 ]
class Phases(unittest.TestCase):
 def check(self,i=None,changes=None):
  v=deepcopy(sample())
  if i is not None:v[i].update(changes)
  return g.make_phase_decisions(*v)
 def test_unknown_newer_core_sha_denied(self):
  self.assertFalse(g.approved_core_artifact(Path('/tmp'), '0'*40))
 def test_reviewed_pinned_frontends_exact(self):
  self.assertEqual(len(g.APPROVED_CORE_DIST_SHA),3)
  self.assertEqual(g.APPROVED_CORE_DIST_SHA[g.CORE_INTEGRATION],
                   g.APPROVED_CORE_DIST_SHA['017d51060349e39150ebd508d0d670c10eb15f5f'])
  self.assertEqual(g.APPROVED_CORE_DIST_SHA['e6911732ff52df240390b28b37e531535c58a915'],
                   '07f14dad2bd55e0e3104681174925ac5425c6371c179a294ae319ada8672a01e')
 def test_pinned_new_core_portable(self):
  from unittest.mock import patch
  with patch.object(g, 'sha', return_value=g.APPROVED_CORE_DIST_SHA['e6911732ff52df240390b28b37e531535c58a915']):
   self.assertTrue(g.approved_core_artifact(Path('/synthetic/core'), 'e6911732ff52df240390b28b37e531535c58a915'))
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'), 'f'*40))
 def test_new_core_modified_index_fails_closed(self):
  import tempfile
  with tempfile.TemporaryDirectory() as temp:
   path=Path(temp)/'al-siddique-frontend'/'dist'
   path.mkdir(parents=True)
   (path/'index.html').write_text('<html>tampered candidate</html>')
   self.assertFalse(g.approved_core_artifact(Path(temp),'e6911732ff52df240390b28b37e531535c58a915'))
 def test_approved_core_absent_artifact_denied(self):
  self.assertFalse(g.approved_core_artifact(Path('/tmp/nonexistent-core-stage'),g.CORE_INTEGRATION))
 def test_verified_never_self_deploys(self):
  o=self.check();self.assertEqual(o['phase_4_protected_production_cutover'],'CORE_ONLY_PENDING');self.assertFalse(o['public_release_authorized_by_this_tool'])
 def test_official_hold(self):self.assertEqual(self.check(3,{'status':'HOLD'})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_incomplete_signed_checklist(self):self.assertEqual(self.check(3,{'checks':{}})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_unsatisfied_check(self):self.assertEqual(self.check(3,{'checks':{k:k!='exact_reviewed_ai_worker_adapter_deployed' for k in g.REQUIRED_OFFICIAL_CHECKS}})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_absent_verified_signer(self):self.assertEqual(self.check(3,{'signed_runtime_security_certified':False})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_original_mark_zeros_locked(self):self.assertEqual(self.check(0,{'result_counts':'1763|0'})['phase_1_readonly_production_integrity'],'HOLD')
 def test_wrong_current_root(self):self.assertEqual(self.check(0,{'source_sha':'0'*64})['phase_1_readonly_production_integrity'],'HOLD')
 def test_missing_live_db_evidence(self):self.assertEqual(self.check(0,{'pg_transaction_read_only':False})['phase_1_readonly_production_integrity'],'HOLD')
 def test_current_stage_mismatch(self):self.assertEqual(self.check(2,{'next_candidate_build_id':'stale'})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_build_not_completed(self):self.assertEqual(self.check(1,{'optimized_build_exit_observed':False})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_stage_cannot_authorize_prod(self):self.assertEqual(self.check(1,{'production_release_authorized':True})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_no_acceptance_of_mutated_prod(self):self.assertEqual(self.check(2,{'production_modified':True})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_optimized_process_nonzero_blocks_stage_even_if_json_pass(self):
  self.assertEqual(self.check(4,{'optimized_build':2})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_joint_process_nonzero_blocks_stage_even_if_json_pass(self):
  self.assertEqual(self.check(4,{'joint_candidate':255})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_official_process_nonzero_blocks_signed_gate_even_if_json_ready(self):
  self.assertEqual(self.check(4,{'official_release':2})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_boolean_false_not_accepted_as_successful_build_exit(self):
  self.assertEqual(self.check(4,{'optimized_build':False})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_boolean_false_not_accepted_as_successful_joint_exit(self):
  self.assertEqual(self.check(4,{'joint_candidate':False})['phase_2_compiled_connect_core_integration'],'HOLD')
 def test_boolean_false_not_accepted_as_successful_official_exit(self):
  self.assertEqual(self.check(4,{'official_release':False})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_absent_exit_code_never_passes(self):
  self.assertEqual(self.check(4,{'official_release':None})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_thirteen_unrecognized_green_checks_not_accepted(self):
  self.assertEqual(self.check(3,{'checks':{str(i):True for i in range(13)}})['phase_3_independent_signed_core_authorization'],'HOLD')
 def test_required_check_replaced_by_unknown_green_key_not_accepted(self):
  bad={k:True for k in g.REQUIRED_OFFICIAL_CHECKS}
  bad.pop('real_signed_peer_school_and_subject_denial')
  bad['self_declared_school_denial']=True
  self.assertEqual(self.check(3,{'checks':bad})['phase_3_independent_signed_core_authorization'],'HOLD')


if __name__=='__main__':unittest.main()
