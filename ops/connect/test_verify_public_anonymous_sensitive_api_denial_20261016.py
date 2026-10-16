#!/usr/bin/env python3
"""Hermetic regression for fixed-origin Connect private-API denial monitor."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

p = Path(__file__).with_name("verify_public_anonymous_sensitive_api_denial_20261016.py")
spec = importlib.util.spec_from_file_location("api_denial", p)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class SensitiveAnonymousDenialTests(unittest.TestCase):
    def test_exact_expected_six_routes(self):
        self.assertEqual(len(guard.PROTECTED_GET_PATHS), 6)
        self.assertEqual(len(set(guard.PROTECTED_GET_PATHS)), 6)
        self.assertEqual(guard.ORIGIN, "https://apex.assps.edu.pk")

    def test_six_real_contracts_require_401(self):
        for path in guard.PROTECTED_GET_PATHS:
            self.assertTrue(guard.assess(path, 401, None), path)

    def test_protected_data_http200_rejected(self):
        for path in guard.PROTECTED_GET_PATHS:
            self.assertFalse(guard.assess(path, 200, None), path)

    def test_redirects_rejected(self):
        p = guard.PROTECTED_GET_PATHS[0]
        for code in (301, 302, 303, 307, 308):
            self.assertFalse(guard.assess(p, code, "/login"))

    def test_error_and_missing_denial_rejected(self):
        p = guard.PROTECTED_GET_PATHS[0]
        for code in (400, 403, 404, 429, 500, 503, None, False, True):
            self.assertFalse(guard.assess(p, code, None))

    def test_location_on_401_rejected(self):
        self.assertFalse(guard.assess(guard.PROTECTED_GET_PATHS[0], 401,
                                      "https://attacker.example"))

    def test_unknown_route_never_accepted(self):
        for path in ("/api/auth/me", "/api/saas-admin/../settings/public",
                     "https://attacker.example/api/saas-admin/apex-leads"):
            self.assertFalse(guard.assess(path, 401, None))

    def test_fetch_rejects_unknown_before_network(self):
        class NeverUsed:
            def open(self, *args, **kwargs):
                raise AssertionError("network attempted")
        with self.assertRaises(ValueError):
            guard.fetch(NeverUsed(), "/api/fake", 5)

    def test_requests_are_get_without_auth_headers(self):
        seen = []
        class Opener:
            def open(self, req, timeout):
                seen.append(req)
                raise HTTPError(req.full_url, 401, "Unauthorized", {}, None)
        self.assertEqual(guard.fetch(Opener(), guard.PROTECTED_GET_PATHS[0], 5),
                         (401, None))
        self.assertEqual(seen[0].get_method(), "GET")
        self.assertEqual(seen[0].full_url,
                         guard.ORIGIN + guard.PROTECTED_GET_PATHS[0])
        self.assertFalse(any(k.lower() in ("cookie", "authorization")
                             for k in seen[0].headers))

    def test_no_redirect_handler_is_fail_closed(self):
        self.assertIsNone(guard.NoRedirect().redirect_request(
            None, None, 302, "", {}, "https://attacker.example"))

    def test_network_errors_cannot_pass(self):
        class Opener:
            def open(self, req, timeout):
                raise URLError("simulated offline")
        with patch.object(guard, "build_opener", return_value=Opener()):
            result = guard.run()
        self.assertEqual(result["decision"], "HOLD_ANONYMOUS_PRIVATE_API_DENIAL")
        self.assertEqual(result["passed"], 0)
        self.assertFalse(result["production_modified"])
        self.assertFalse(result["authenticated_tenant_isolation_certified"])

    def test_six_denials_pass_without_body_read(self):
        class Opener:
            def open(self, req, timeout):
                raise HTTPError(req.full_url, 401, "Unauthorized", {}, None)
        with patch.object(guard, "build_opener", return_value=Opener()):
            result = guard.run()
        self.assertEqual(result["decision"], "ANONYMOUS_PRIVATE_API_DENIAL_PASS")
        self.assertEqual((result["passed"], result["total"]), (6, 6))
        self.assertFalse(result["authenticated_tenant_isolation_certified"])


if __name__ == "__main__":
    unittest.main()

