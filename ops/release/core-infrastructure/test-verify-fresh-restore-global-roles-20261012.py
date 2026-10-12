#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-fresh-restore-global-roles-20261012.py')
spec=importlib.util.spec_from_file_location('globals_acl',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture():
    owners={'apexos_user':155,'apex_paper_owner':6,'postgres':15}
    clone={k:{'bypass_rls':False} for k in owners}
    source={k:{'bypass_rls':False} for k in owners}
    return owners,clone,source
class RestoreGlobalsGateTests(unittest.TestCase):
    def test_parse_realistic_archive_toc(self):
        s='5681; 0 0 ACL - SCHEMA core_security postgres\n5682; 0 0 ACL public TABLE students apexos_user\n'
        self.assertEqual(m.parse_acl_owners(s),{'postgres':1,'apexos_user':1})
    def test_default_acl_entries_are_counted(self):
        self.assertEqual(m.parse_acl_owners('2563; 826 338620 DEFAULT ACL public DEFAULT PRIVILEGES FOR SEQUENCES apexos_user'), {'apexos_user':1})
    def test_all_safe_globals_is_preflight_only(self):
        a,b,c=fixture();v=m.classify(a,b,c)
        self.assertEqual(v['status'],'PASS_GLOBALS_READY_ONLY')
        self.assertFalse(v['production_rollback_certified'])
    def test_missing_legacy_role_blocks(self):
        a,b,c=fixture();del b['apexos_user']
        v=m.classify(a,b,c);self.assertEqual(v['status'],'HOLD')
        self.assertEqual(v['missing_role_names'],['apexos_user'])
    def test_missing_paper_owner_blocks(self):
        a,b,c=fixture();del b['apex_paper_owner']
        self.assertEqual(m.classify(a,b,c)['status'],'HOLD')
    def test_legacy_bypass_source_role_never_auto_migrates(self):
        a,b,c=fixture();c['apexos_user']['bypass_rls']=True
        v=m.classify(a,b,c)
        self.assertEqual(v['status'],'HOLD')
        self.assertIn('privileged_source_role_requires_explicit_safe_mapping',v['issues'])
    def test_acl_scope_change_blocks(self):
        a,b,c=fixture();a['apexos_user']-=1
        self.assertEqual(m.classify(a,b,c)['status'],'HOLD')
    def test_unauthorized_owner_string_rejected(self):
        with self.assertRaises(ValueError):m.parse_acl_owners('123; 0 0 ACL public TABLE users bad;drop')
if __name__=='__main__':unittest.main()
