#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-paper-owner-recovery-contract-20261013.py')
spec=importlib.util.spec_from_file_location('paper_owner_recovery',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
def present():
 return {'tables':{name:{'owner':m.OWNER,'rls_enabled':True,'force_rls':True} for name in m.REQ_TABLES},
         'functions':{name:{'owner':m.OWNER,'function_md5':'0'*32} for name in m.REQ_FUNCTIONS},
         'owner_role':[m.OWNER+'|0|0|0']}
class PaperOwnerTests(unittest.TestCase):
 def test_source_recovery_matching_catalog_does_not_certify_paper_release(self):
  a=m.evaluate(present(),present())
  self.assertEqual(a['status'],'PAPER_RECOVERY_SOURCE_PARITY_ONLY')
  self.assertFalse(a['full_backend_release_certified'])
  self.assertTrue(a['separate_paper_owner_acceptance_required'])
 def test_missing_global_owner_role_holds(self):
  b=present();b['owner_role']=[]
  self.assertEqual(m.evaluate(present(),b)['status'],'HOLD')
 def test_paper_objects_owned_by_postgres_after_noowner_restore_holds(self):
  b=present();b['tables']['paper_documents']['owner']='postgres'
  self.assertEqual(m.evaluate(present(),b)['status'],'HOLD')
 def test_function_body_mismatch_holds(self):
  b=present();b['functions'][m.REQ_FUNCTIONS[0]]['function_md5']='1'*32
  self.assertEqual(m.evaluate(present(),b)['status'],'HOLD')
 def test_rls_force_missing_holds(self):
  b=present();b['tables']['paper_revisions']['force_rls']=False
  self.assertEqual(m.evaluate(present(),b)['status'],'HOLD')
 def test_missing_function_holds(self):
  b=present();del b['functions'][m.REQ_FUNCTIONS[0]]
  self.assertEqual(m.evaluate(present(),b)['status'],'HOLD')
 def test_bypass_paper_owner_role_is_rejected(self):
  b=present();b['owner_role']=[m.OWNER+'|0|1|0']
  self.assertEqual(m.evaluate(present(),b)['status'],'HOLD')
if __name__=='__main__':unittest.main()
