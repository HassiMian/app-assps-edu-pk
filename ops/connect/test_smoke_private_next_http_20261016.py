#!/usr/bin/env python3
"""Adversarial unit tests for private role-neutral Connect HTTP acceptance."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("smoke_private_next_http_20261016.py")
spec = importlib.util.spec_from_file_location("private_smoke", SCRIPT)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class PrivateConnectSmokeTests(unittest.TestCase):
    def test_good_dashboard(self):
        self.assertTrue(smoke.assess("/dashboard", 307, "/login"))

    def test_good_dashboard_history(self):
        self.assertTrue(smoke.assess("/dashboard/history", 307, "/login"))

    def test_good_teacher(self):
        self.assertTrue(smoke.assess("/teacher", 302, "/login?next=%2Fteacher"))

    def test_private_apis_all_require_401(self):
        self.assertEqual(len(smoke.PRIVATE_API_PATHS), 6)
        for path in smoke.PRIVATE_API_PATHS:
            self.assertTrue(smoke.assess(path, 401, None), path)

    def test_private_apis_never_allow_200_or_redirect(self):
        for path in smoke.PRIVATE_API_PATHS:
            for status, location in ((200, None), (302, "/login"),
                                     (403, None), (500, None),
                                     (401, "https://attacker.example")):
                self.assertFalse(smoke.assess(path, status, location), path)

    def test_good_login(self):
        self.assertTrue(smoke.assess("/login", 200, None))

    def test_good_anon_auth_denial(self):
        self.assertTrue(smoke.assess("/api/auth/me", 401, None))

    def test_admin_fallback_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 307, "/login?next=%2Fadmin"))

    def test_history_admin_fallback_rejected(self):
        self.assertFalse(smoke.assess("/dashboard/history", 307, "/login?next=%2Fadmin"))

    def test_admin_teacher_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, "/login?next=%2Fadmin"))

    def test_teacher_without_next_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, "/login"))

    def test_teacher_external_redirect_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, "https://attacker.example/login?next=/teacher"))

    def test_dashboard_redirect_chain_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 302, "/login?next=%2Fdashboard"))

    def test_auth_leak_rejected(self):
        self.assertFalse(smoke.assess("/api/auth/me", 200, None))

    def test_protected_dashboard_200_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 200, None))

    def test_login_redirect_loop_rejected(self):
        self.assertFalse(smoke.assess("/login", 302, "/login"))

    def test_missing_redirect_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, None))

    def test_javascript_redirect_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 307, "javascript:alert(1)"))

    def test_exact_compiled_worktree_allowlisted(self):
        stage = smoke.REVIEWED_BUILD_STAGE
        if stage.exists():
            self.assertTrue(smoke.safe_stage(stage, smoke.REVIEWED_BUILD_ID))

    def test_stale_compiled_id_rejected(self):
        self.assertFalse(smoke.safe_stage(smoke.REVIEWED_BUILD_STAGE, "EvBJH9KRqqtM5ldAhJKtT"))

    def test_other_workspace_still_rejected(self):
        self.assertFalse(smoke.safe_stage(Path("/root/workspace/assps-connect-private-http-qa-20261016"), smoke.REVIEWED_BUILD_ID))

    def test_unapproved_stage_rejected(self):
        self.assertFalse(smoke.safe_stage(Path("/var/www/apex-connect"), "ONDwxEIZlx5onDIKY7wYf"))

    def test_missing_stage_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            self.assertFalse(smoke.safe_stage(Path(folder), "rc1vIlE6prAQ8pHrw7ohX"))


if __name__ == "__main__":
    unittest.main()
