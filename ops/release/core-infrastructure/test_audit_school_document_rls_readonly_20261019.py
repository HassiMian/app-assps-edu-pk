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
            "fallback_missing_flag_allows": False, **kw}

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

    def test_malformed_catalog_fails_closed(self):
        self.assertEqual(module.verdict(None)["status"], "HOLD")

if __name__ == "__main__":
    unittest.main()
