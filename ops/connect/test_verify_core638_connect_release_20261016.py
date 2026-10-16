"""No-privilege, fully synthetic negative tests for Connect/Core release gate."""
from pathlib import Path
import importlib.util
import os
import tempfile
import unittest
from unittest.mock import patch

MOD_PATH = Path(__file__).with_name("verify_core638_connect_release_20261016.py")
spec = importlib.util.spec_from_file_location("unified_connect", MOD_PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class UnifiedFailClosedTests(unittest.TestCase):
    def gate(self, checks=None, **kwargs):
        if checks is None:
            checks = {k: True for k in mod.REQUIRED}
        return {
            "status": "READY_FOR_LOGIN_ONLY_CORE",
            "checks": checks,
            "production_deployment_performed": False,
            "signed_runtime_security_certified": True,
            **kwargs,
        }

    def test_no_receipt_never_approves(self):
        value = mod.signed_assessment(None, 0)
        self.assertFalse(value["authentic_core_release"])
        self.assertEqual(value["total"], 13)

    def test_forged_perfect_receipt_and_exit_zero_cannot_approve(self):
        value = mod.signed_assessment(self.gate(), 0)
        self.assertFalse(value["authentic_core_release"])
        self.assertEqual(value["passed"], 13)

    def test_real_failing_core_exit_two_remains_hold(self):
        checks = {k: True for k in mod.REQUIRED}
        checks["real_signed_peer_school_and_subject_denial"] = False
        value = mod.signed_assessment(self.gate(checks), 2, independently_verified=True)
        self.assertFalse(value["authentic_core_release"])
        self.assertIn("real_signed_peer_school_and_subject_denial", value["blocked"])

    def test_even_trusted_verifier_requires_all_13(self):
        checks = {k: True for k in mod.REQUIRED}
        checks["independent_offhost_current_recovery_certified"] = False
        value = mod.signed_assessment(self.gate(checks), 0, independently_verified=True)
        self.assertFalse(value["authentic_core_release"])

    def test_hypothetical_direct_signature_only_allows_owner_review_not_deploy(self):
        value = mod.signed_assessment(self.gate(), 0, independently_verified=True)
        self.assertTrue(value["authentic_core_release"])
        self.assertEqual(mod.decide({"src": True}, value),
                         "ELIGIBLE_FOR_CORE_OWNER_REVIEW_NOT_DEPLOYED")

    def test_one_failed_technical_check_blocks_even_perfect_signature(self):
        signed = mod.signed_assessment(self.gate(), 0, independently_verified=True)
        self.assertEqual(mod.decide({"sha": False, "build": True}, signed),
                         "HOLD_NO_PRODUCTION_CUTOVER")

    def test_wrong_extra_or_missing_release_check_is_not_signed(self):
        checks = {k: True for k in mod.REQUIRED}
        checks["unknown_extra"] = True
        self.assertFalse(mod.signed_assessment(self.gate(checks), 0, True)["authentic_core_release"])
        del checks["unknown_extra"]
        checks.pop("production_nginx_configuration_valid")
        self.assertFalse(mod.signed_assessment(self.gate(checks), 0, True)["authentic_core_release"])

    def test_production_deployment_flag_does_not_prove_precutover(self):
        result = mod.signed_assessment(self.gate(production_deployment_performed=True), 0, True)
        self.assertFalse(result["authentic_core_release"])

    def test_unsigned_legacy_status_does_not_approve(self):
        result = mod.signed_assessment(self.gate(status="PASS"), 0, True)
        self.assertFalse(result["authentic_core_release"])

    def test_receipt_permission_guard_and_expiry(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t)/"test.json"
            p.write_text('{"checks": {}}')
            os.chmod(p, 0o644)
            self.assertIsNone(mod.secure_receipt(p))
            os.chmod(p, 0o600)
            if os.geteuid() == 0:
                self.assertEqual(mod.secure_receipt(p), {"checks": {}})
                with patch.object(mod.time, "time", return_value=p.stat().st_mtime + 4000):
                    self.assertIsNone(mod.secure_receipt(p))
            else:
                # Hosted Actions runs as nonroot. A nonroot-generated receipt
                # must never impersonate the root-protected VPS owner receipt.
                self.assertIsNone(mod.secure_receipt(p))

    def test_private_api_list_has_no_mutating_endpoints(self):
        self.assertEqual(len(mod.PRIVATE_PATHS), 8)
        self.assertEqual(len(set(mod.PRIVATE_PATHS)), 8)
        self.assertTrue(all(path.startswith("/api/") for path in mod.PRIVATE_PATHS))

    def test_source_pins_are_exact_commit_and_hash_shapes(self):
        for sha in (mod.CORE_SHA,mod.CONNECT_SHA,mod.CONNECT_PARENT_SHA,
                    mod.CORE_DIST_SHA,mod.PRIVATE_HTTP_DIGEST,*mod.CONNECT_FILES.values()):
            self.assertRegex(sha,r"^[0-9a-f]{40}$|^[0-9a-f]{64}$")
        self.assertNotEqual(mod.CONNECT_BUILD_ID,mod.PUBLIC_BUILD_ID)

if __name__ == "__main__":
    unittest.main()
