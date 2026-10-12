#!/usr/bin/env python3
"""Pure policy-catalog release gate regression; no database or filesystem edits."""
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('full-app-signed-77-policy-gate-20261012.py')
spec=importlib.util.spec_from_file_location('app_signed_77',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def facts():
    return dict(protected_tables=77,enabled_force=77,signed_app_guards=77,
                school_signed_guards=73,tenant_signed_guards=4,
                signed_marks_preserved=77,app_nonbypass=True,app_nosuper=True,
                app_no_login=True,signing_schema_access=True,
                signed_school_helper_access=True,signed_tenant_helper_access=True)
class FullAppSignedPolicyTests(unittest.TestCase):
    def test_all_expected_dual_role_policies_pass_catalog_only(self):
        a=m.verdict(facts())
        self.assertEqual(a['status'],'PASS_CLONE_POLICY_CATALOG_ONLY')
        self.assertTrue(a['not_release_certification'])
    def test_missing_single_guard_is_hold(self):
        f=facts();f['signed_app_guards']=76
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_missing_single_marks_guard_is_hold(self):
        f=facts();f['signed_marks_preserved']=76
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_wrong_signed_tenant_predicate_count_holds(self):
        f=facts();f['tenant_signed_guards']=3
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_wrong_school_guard_count_holds(self):
        f=facts();f['school_signed_guards']=72
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_missing_force_rls_holds(self):
        f=facts();f['enabled_force']=76
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_superuser_runtime_holds(self):
        f=facts();f['app_nosuper']=False
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_bypass_runtime_holds(self):
        f=facts();f['app_nonbypass']=False
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_login_enabled_runtime_holds(self):
        f=facts();f['app_no_login']=False
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_missing_schema_usage_holds(self):
        f=facts();f['signing_schema_access']=False
        self.assertEqual(m.verdict(f)['status'],'HOLD')
    def test_missing_helper_function_access_holds(self):
        f=facts();f['signed_school_helper_access']=False
        self.assertEqual(m.verdict(f)['status'],'HOLD')
        f=facts();f['signed_tenant_helper_access']=False
        self.assertEqual(m.verdict(f)['status'],'HOLD')
if __name__=='__main__':unittest.main()
