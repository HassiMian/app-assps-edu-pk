import importlib.util
import pathlib
import unittest

script = pathlib.Path(__file__).with_name("audit_school_document_rls_readonly_20261019.py")
spec = importlib.util.spec_from_file_location("school_document_rls_readonly", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def row(name, **kw):
    return {"table": name, "forced": True, "enabled": True,
            "app_can_select": True, "fallback_public": True,
            "fallback_missing_flag_allows": False,
            "app_runtime_policy_unscoped_flag": False, **kw}

def good():
    return [row(name) for name in sorted(module.EXPECTED)]

class CatalogAudit(unittest.TestCase):
    def test_safe_catalog_is_not_a_release_certificate(self):
        v = module.verdict(good())
        self.assertEqual(v["status"], "CATALOG_PASS_NOT_RELEASE")
        self.assertFalse(v["releaseAuthorized"])
        self.assertFalse(v["realTenantDenialCertified"])

    def test_all_three_unguarded_document_tables_are_flagged(self):
        rows = good()
        for item in rows:
            item["fallback_missing_flag_allows"] = True
        v = module.verdict(rows)
        self.assertEqual(v["status"], "HOLD")
        self.assertEqual(len(v["risks"]), 3)

    def test_missing_table_fails_closed(self):
        v = module.verdict(good()[:2])
        self.assertEqual(v["status"], "HOLD")
        self.assertTrue(any("MISSING_TABLE" in issue for issue in v["risks"]))

    def test_missing_force_rls_fails_closed(self):
        rows = good()
        rows[0]["forced"] = False
        self.assertEqual(module.verdict(rows)["status"], "HOLD")

    def test_no_select_privilege_removes_specific_grant_risk_not_certification(self):
        rows = good()
        for item in rows:
            item["fallback_missing_flag_allows"] = True
            item["app_can_select"] = False
        self.assertEqual(module.verdict(rows)["status"], "CATALOG_PASS_NOT_RELEASE")

    def test_app_runtime_policy_without_rls_flag_fails_closed(self):
        rows = good()
        rows[0]["app_runtime_policy_unscoped_flag"] = True
        self.assertTrue(any("APP_RUNTIME_POLICY_OMITS_RLS_CONTEXT" in risk
                            for risk in module.verdict(rows)["risks"]))

    def test_restrictive_guard_correctly_masks_legacy_fallbacks(self):
        rows = good()
        for item in rows:
            item["fallback_missing_flag_allows"] = True
            item["app_runtime_policy_unscoped_flag"] = True
            item["restrictive_default_deny_guard"] = True
        v = module.verdict(rows)
        self.assertEqual(v["status"], "CATALOG_PASS_NOT_RELEASE")
        self.assertFalse(v["releaseAuthorized"])
        self.assertFalse(v["realTenantDenialCertified"])

    def test_partial_guard_does_not_mask_legacy_fallback(self):
        rows = good()
        rows[0]["fallback_missing_flag_allows"] = True
        rows[0]["restrictive_default_deny_guard"] = False
        self.assertEqual(module.verdict(rows)["status"], "HOLD")

    def test_malformed_catalog_fails_closed(self):
        self.assertEqual(module.verdict(None)["status"], "HOLD")

if __name__ == "__main__":
    unittest.main()
