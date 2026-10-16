#!/usr/bin/env python3
"""Regression tests for anonymous public Connect routing contract."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "public_routes", Path(__file__).with_name("verify_public_anonymous_routes_20261016.py")
)
routes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(routes)


class PublicAnonymousRouteTests(unittest.TestCase):
    def test_login_ok(self):
        self.assertTrue(routes.assess("/login", 200, None))

    def test_anonymous_auth_denied(self):
        self.assertTrue(routes.assess("/api/auth/me", 401, None))

    def test_dashboards_to_clean_login(self):
        for path in ("/dashboard", "/dashboard/history"):
            self.assertTrue(routes.assess(path, 307, "https://apex.assps.edu.pk/login"))

    def test_teacher_preserves_own_path(self):
        self.assertTrue(routes.assess("/teacher", 302,
                                      "https://apex.assps.edu.pk/login?next=%2Fteacher"))

    def test_existing_public_admin_fallback_is_drift(self):
        for path in ("/dashboard", "/dashboard/history"):
            self.assertFalse(routes.assess(path, 307, "/login?next=%2Fadmin"))

    def test_no_public_protected_page(self):
        self.assertFalse(routes.assess("/dashboard", 200, None))

    def test_no_cross_origin_redirect(self):
        for value in ("//attacker.example/login", "http://apex.assps.edu.pk/login",
                      "https://attacker.example/login",
                      "https://apex.assps.edu.pk.evil.example/login"):
            self.assertFalse(routes.assess("/dashboard", 307, value))

    def test_no_duplicate_teacher_next(self):
        self.assertFalse(routes.assess("/teacher", 302,
                                      "/login?next=/teacher&next=/admin"))

    def test_no_javascript_or_fragment_redirect(self):
        self.assertFalse(routes.assess("/teacher", 302, "javascript:alert(1)"))
        self.assertFalse(routes.assess("/teacher", 302, "/login?next=/teacher#x"))

    def test_unknown_routes_and_bool_codes_denied(self):
        self.assertFalse(routes.assess("/not-a-route", 302, "/login"))
        self.assertFalse(routes.assess("/login", True, None))

    def test_login_and_auth_cannot_redirect(self):
        self.assertFalse(routes.assess("/login", 302, "/login"))
        self.assertFalse(routes.assess("/api/auth/me", 302, "/login"))


if __name__ == "__main__":
    unittest.main()

