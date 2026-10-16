import importlib.util
from pathlib import Path
from copy import deepcopy
import unittest
p=Path(__file__).with_name('run_four_phase_release_gate_20261016.py')
s=importlib.util.spec_from_file_location('gate',p);g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
def sample():
 return [
  {'source_sha':g.LIVE_HTML,'nginx_root_correct':True,'https_ok':True,'result_counts':g.RESULT_COUNTS,'pg_transaction_read_only':True,'anonymous_private_apis_denied':True},
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
  self.assertEqual(len(g.APPROVED_CORE_DIST_SHA),7)
  self.assertEqual(g.APPROVED_CORE_DIST_SHA[g.CORE_INTEGRATION],
                   g.APPROVED_CORE_DIST_SHA['017d51060349e39150ebd508d0d670c10eb15f5f'])
  self.assertEqual(g.APPROVED_CORE_DIST_SHA['e6911732ff52df240390b28b37e531535c58a915'],
                   '07f14dad2bd55e0e3104681174925ac5425c6371c179a294ae319ada8672a01e')
 def test_newest_core4397_rebuilt_exact_pin_and_tamper_denial(self):
  from unittest.mock import patch
  key='4397a1836fedff3cba6a1062ed85b7c25e5388c6'
  digest='1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3'
  self.assertEqual(g.APPROVED_CORE_DIST_SHA[key],digest)
  self.assertEqual(g.APPROVED_CORE_DIST_SHA['13ac2be49e8d0aa6939c82f510aa4bbc65caf2a7'],digest)
  with patch.object(g,'sha',return_value=digest):
   self.assertTrue(g.approved_core_artifact(Path('/synthetic/core'),key))
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'),'f'*40))
  with patch.object(g,'sha',return_value='f'*64):
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'),key))
 def test_new_font_guard_core_exact_compiled_pin(self):
  key='13ac2be49e8d0aa6939c82f510aa4bbc65caf2a7'
  expected='1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3'
  self.assertEqual(g.APPROVED_CORE_DIST_SHA[key],expected)
  self.assertEqual(g.APPROVED_CORE_DIST_SHA['05a59127e43cdcd2ee3a6b26694b8d798efef4d3'],expected)
  from unittest.mock import patch
  with patch.object(g,'sha',return_value=expected):
   self.assertTrue(g.approved_core_artifact(Path('/synthetic/core'), key))
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'), 'f'*40))
  with patch.object(g,'sha',return_value='0'*64):
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'), key))
 def test_signed_success_does_not_bypass_frontend_capacity_or_core_owner(self):
  green={'phase_3_independent_signed_core_authorization':'PASS',
         'phase_4_protected_production_cutover':'CORE_ONLY_PENDING',
         'production_changed':False,
         'public_release_authorized_by_this_tool':False}
  self.assertTrue(g.final_gate_ready_for_core_review(green))
  for update in ({'phase_3_independent_signed_core_authorization':'HOLD'},
                 {'phase_4_protected_production_cutover':'HOLD'},
                 {'production_changed':True},
                 {'public_release_authorized_by_this_tool':True}):
   self.assertFalse(g.final_gate_ready_for_core_review({**green,**update}))
  self.assertFalse(g.final_gate_ready_for_core_review({}))
 def test_core_owner_phase4_requires_separate_frontend_headroom(self):
  phase={'phase_4_protected_production_cutover':'CORE_ONLY_PENDING',
         'production_changed':False,'public_release_authorized_by_this_tool':False}
  good={'scope':'READ_ONLY_COMPILED_FRONTEND_ROLLBACK_HEADROOM_ONLY',
        'decision':'FRONTEND_SNAPSHOT_HEADROOM_PASS_NOT_RELEASE',
        'ready':True,'signed_recovery_certified':False,
        'production_release_authorized':False,'production_modified':False}
  self.assertEqual(g.require_frontend_capacity_for_core_cutover(phase,good)['phase_4_protected_production_cutover'],'CORE_ONLY_PENDING')
  for override in ({'ready':False}, {'ready':1}, {'signed_recovery_certified':True},
                   {'production_modified':True},{'scope':'FABRICATED'},
                   {'production_release_authorized':True},{'decision':'HOLD_FRONTEND_SNAPSHOT_HEADROOM'}):
   fail={**good,**override}
   result=g.require_frontend_capacity_for_core_cutover(phase,fail)
   self.assertEqual(result['phase_4_protected_production_cutover'],'HOLD')
   self.assertFalse(result['public_release_authorized_by_this_tool'])
  self.assertEqual(g.require_frontend_capacity_for_core_cutover(phase,{})['phase_4_protected_production_cutover'],'HOLD')
 def test_current_marks_safe_core_exact_pin_and_fail_closed(self):
  self.assertEqual(g.APPROVED_CORE_DIST_SHA['05a59127e43cdcd2ee3a6b26694b8d798efef4d3'],
                   '1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3')
  from unittest.mock import patch
  with patch.object(g,'sha',return_value='1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3'):
   self.assertTrue(g.approved_core_artifact(Path('/synthetic/core'), '05a59127e43cdcd2ee3a6b26694b8d798efef4d3'))
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'), 'a'*40))
  with patch.object(g,'sha',return_value='0'*64):
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'), '05a59127e43cdcd2ee3a6b26694b8d798efef4d3'))
 def test_latest_authored_core_sha_and_digest_pinned(self):
  self.assertEqual(g.APPROVED_CORE_DIST_SHA['a2ff445a492e914e0988b2751da58000bd02b16e'],
                   '01805309fef95c61a39088569ae4727bba8a44d80fc8e14d4353c2a793ac30d6')
  from unittest.mock import patch
  with patch.object(g,'sha',return_value='01805309fef95c61a39088569ae4727bba8a44d80fc8e14d4353c2a793ac30d6'):
   self.assertTrue(g.approved_core_artifact(Path('/synthetic/core'), 'a2ff445a492e914e0988b2751da58000bd02b16e'))
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'), '0'*40))
  with patch.object(g,'sha',return_value='0'*64):
   self.assertFalse(g.approved_core_artifact(Path('/synthetic/core'), 'a2ff445a492e914e0988b2751da58000bd02b16e'))
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
 def test_missing_private_api_denial_fails_closed(self):
  self.assertEqual(self.check(0,{'anonymous_private_apis_denied':False})['phase_1_readonly_production_integrity'],'HOLD')
 def test_missing_private_api_denial_key_fails_closed(self):
  v=sample()
  del v[0]['anonymous_private_apis_denied']
  self.assertEqual(g.make_phase_decisions(*v)['phase_1_readonly_production_integrity'],'HOLD')
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
