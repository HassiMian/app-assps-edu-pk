#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-paper-core-forwardport-boundary-20261012.py')
spec=importlib.util.spec_from_file_location('paper_core',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class IntegrationTests(unittest.TestCase):
 def check(self,changed=None,**k):
  d={'local_core':m.CORE_SHA,'remote_core':m.CORE_SHA,
      'local_paper':m.PAPER_SHA,'remote_paper':m.PAPER_SHA,
      'changed':['docs/coordination/PAPER_STUDIO_A.md'],
      'dirty':False,'core_parent':True}
  if changed is not None:d['changed']=changed
  d.update(k)
  return m.classify(**d)
 def test_current_forwardport_is_not_production_release(self):
  r=self.check();self.assertEqual(r['status'],'PASS_SOURCE_BOUNDARY_ONLY')
  self.assertFalse(r['paper_live_deployment_certified'])
 def test_core_owned_backend_auth_changes_block_paper_candidate(self):
  self.assertEqual(self.check(changed=['al-siddique-backend/src/middleware/auth.js'])['status'],'HOLD')
 def test_core_owned_ops_changes_block_paper_candidate(self):
  self.assertEqual(self.check(changed=['ops/release/core-infrastructure/readiness-audit-20261012.py'])['status'],'HOLD')
 def test_paper_owned_paths_allowed(self):
  self.assertEqual(self.check(changed=['al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/x.js',
                                  'ops/paper-studio/run-unified-candidate-qa-20261012.sh'])['status'],
                   'PASS_SOURCE_BOUNDARY_ONLY')
 def test_paper_and_core_sha_drift_fail_closed(self):
  for key in ('local_paper','remote_paper','local_core','remote_core'):
   self.assertEqual(self.check(**{key:'0'*40})['status'],'HOLD')
 def test_dirty_canonical_worktree_holds(self):
  self.assertEqual(self.check(dirty=True)['status'],'HOLD')
 def test_old_canonical_ancestry_holds(self):
  self.assertEqual(self.check(core_parent=False)['status'],'HOLD')
 def test_empty_paper_change_set_holds(self):
  self.assertEqual(self.check(changed=[])['status'],'HOLD')
if __name__=='__main__':unittest.main()
