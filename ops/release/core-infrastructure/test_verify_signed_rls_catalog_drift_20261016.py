#!/usr/bin/env python3
import importlib.util
import pathlib
import unittest
p=pathlib.Path(__file__).with_name("verify_signed_rls_catalog_drift_20261016.py")
spec=importlib.util.spec_from_file_location("guard",p)
guard=importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
class DriftTests(unittest.TestCase):
    def test_baseline_catalog_is_not_release_certification(self):
        r=guard.verdict(dict(guard.EXPECTED))
        self.assertEqual(r["status"],"CATALOG_PASS_NOT_RELEASE")
        self.assertFalse(r["releaseAuthorized"])
        self.assertFalse(r["securityCertification"])
    def test_every_missing_or_extra_guard_fails_closed(self):
        for k,value in guard.EXPECTED.items():
            with self.subTest(k=k):
                f=dict(guard.EXPECTED);f[k]=value+1
                self.assertEqual(guard.verdict(f)["status"],"HOLD")
    def test_absent_key_fails_closed(self):
        for k in guard.EXPECTED:
            with self.subTest(k=k):
                f=dict(guard.EXPECTED);del f[k]
                self.assertEqual(guard.verdict(f)["status"],"HOLD")
    def test_no_database_writes_in_queries(self):
        self.assertEqual(set(guard.SQL),set(guard.EXPECTED))
        for s in guard.SQL.values():
            self.assertTrue(s.strip().upper().startswith(("SELECT", "WITH ")))
            for forbidden in (" INSERT ", " UPDATE ", " DELETE ", " CREATE ", " ALTER ", " DROP ", " GRANT ", " REVOKE "):
                self.assertNotIn(forbidden,s.upper())
            self.assertNotIn(";",s)
    def test_no_silent_app_acl_exposure(self):
        f=dict(guard.EXPECTED);f["four_app_acl_exposure"]=1
        self.assertIn("four_app_acl_exposure",guard.verdict(f)["failures"])
if __name__=="__main__":unittest.main()
