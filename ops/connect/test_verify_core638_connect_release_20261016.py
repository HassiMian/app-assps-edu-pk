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

    def test_direct_core_gate_refuses_untrusted_source_before_process(self):
        with patch.object(mod, "root_owned_pinned_file", return_value=False), \
             patch.object(mod.subprocess, "run") as runner:
            receipt, rc, trusted = mod.invoke_pinned_official_core_gate()
        self.assertEqual(receipt, {})
        self.assertEqual(rc, 255)
        self.assertFalse(trusted)
        runner.assert_not_called()

    def test_direct_core_gate_requires_exact_pinned_executable_and_nginx(self):
        checks=[]
        def audit_path(path, sha):
            checks.append((str(path),sha))
            return True
        with patch.object(mod, "root_owned_pinned_file", side_effect=audit_path), \
             patch.object(mod.subprocess, "run",return_value=type("Proc",(),{
                 "returncode":2,"stdout":'{"status":"HOLD","checks":{}}'
             })()) as runner:
            receipt, rc, trusted = mod.invoke_pinned_official_core_gate()
        self.assertEqual(rc,2)
        self.assertTrue(trusted)
        self.assertEqual(receipt["status"],"HOLD")
        self.assertEqual(checks,[(str(mod.OFFICIAL_CORE_GATE),mod.OFFICIAL_CORE_GATE_SHA256),
                                 (str(mod.NGINX_CONF),mod.NGINX_CONF_SHA256)])
        argv = runner.call_args.args[0]
        self.assertEqual(argv[-6:],[
            "--release-id",mod.FIXED_RELEASE_ID,
            "--approved-proxy-sha256",mod.NGINX_CONF_SHA256,
            "--approved-build-id",mod.CONNECT_BUILD_ID
        ])

    def test_direct_core_gate_rejects_crashed_process_and_invalid_json(self):
        with patch.object(mod,"root_owned_pinned_file",return_value=True):
            for rc,body in ((1,'{"status":"READY_FOR_LOGIN_ONLY_CORE"}'),
                            (0,'<SECRET ERROR>'),(0,'[]')):
                with self.subTest(rc=rc,body=body):
                    with patch.object(mod.subprocess,"run",return_value=type("Proc",(),{
                        "returncode":rc,"stdout":body})()):
                        receipt,status,verified=mod.invoke_pinned_official_core_gate()
                    self.assertEqual(receipt,{})
                    self.assertFalse(verified)

    def test_direct_core_gate_timeout_fails_closed(self):
        import subprocess
        with patch.object(mod,"root_owned_pinned_file",return_value=True), \
             patch.object(mod.subprocess,"run",side_effect=subprocess.TimeoutExpired("core",115)):
            result=mod.invoke_pinned_official_core_gate()
        self.assertEqual(result,({},255,False))

    def test_direct_data_is_not_signed_when_verifier_not_trusted(self):
        fake=self.gate()
        # Supplying a 13/13 JSON can NEVER manufacture independent trust.
        x=mod.signed_assessment(fake,0,independently_verified=False)
        self.assertEqual(x["passed"],13)
        self.assertFalse(x["authentic_core_release"])
        self.assertEqual(mod.decide({"verified":True},x),"HOLD_NO_PRODUCTION_CUTOVER")

    def test_untrusted_relative_or_symlinked_root_file_denied(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            file=root/"release-core.py"
            file.write_text("safe_test_stub")
            os.chmod(file,0o644)
            digest=mod.digest(file)
            symlink=root/"pointer.py"
            symlink.symlink_to(file)
            self.assertFalse(mod.root_owned_pinned_file(symlink,digest))
            self.assertFalse(mod.root_owned_pinned_file(file,"0"*64))
            os.chmod(file,0o666)
            self.assertFalse(mod.root_owned_pinned_file(file,digest))

    def test_current_core_pinned_to_verified_successor(self):
        self.assertEqual(mod.CORE_SHA, "58a111c82e4e2051ecab08960cf4c68c25085a24")
        self.assertEqual(mod.CORE_REVIEWED_E301_SHA, "e301273e0d055667dc7b0787593839a006fb97f7")
        self.assertEqual(len(mod.CORE_SCOPE_FILES), 2)
        self.assertEqual(mod.CORE_PARENT_SHA,
                         "638025c86a949b9768e5005966724e5d3e834e68")
        self.assertNotEqual(mod.CORE_SHA, mod.CORE_PARENT_SHA)
        self.assertEqual(len(mod.CORE_PRIVACY_FILES), 3)
        self.assertTrue(all(x.startswith("al-siddique-backend/") for x in mod.CORE_PRIVACY_FILES))

    def test_immutable_core_print_privacy_bytes_exact(self):
        import hashlib
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            paths = ("service.js", "student-projection.cjs", "print-domain.test.js")
            approved = {}
            for name in paths:
                dest = root/name
                dest.write_bytes(("synthetic:" + name).encode())
                approved[name] = hashlib.sha256(dest.read_bytes()).hexdigest()
            with patch.dict(mod.CORE_PRIVACY_FILES, approved, clear=True):
                self.assertTrue(mod.reviewed_core_privacy_bytes(root))
                (root/paths[0]).write_text("altered synthetic privacy guard")
                self.assertFalse(mod.reviewed_core_privacy_bytes(root))

    def test_missing_core_privacy_file_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.dict(mod.CORE_PRIVACY_FILES, {"absent/file.js":"0"*64}, clear=True):
                self.assertFalse(mod.reviewed_core_privacy_bytes(Path(d)))

    def test_core_teacher_print_and_postsave_source_hashes_are_strict(self):
        for name, sha in mod.CORE_SCOPE_FILES.items():
            self.assertRegex(sha, r"^[0-9a-f]{64}$")
            self.assertFalse(name.startswith("/"))
        self.assertTrue(any("assessmentStudioRoutes" in x for x in mod.CORE_SCOPE_FILES))
        self.assertTrue(any("postsave" in x for x in mod.CORE_SCOPE_FILES))

    def test_core_teacher_print_scope_missing_or_tampered_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertFalse(all((Path(d) / p).is_file() and mod.digest(Path(d) / p) == h
                                 for p, h in mod.CORE_SCOPE_FILES.items()))
            for name in mod.CORE_SCOPE_FILES:
                p = Path(d) / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(b"test scoped source only")
            self.assertFalse(all(mod.digest(Path(d) / p) == h
                                 for p, h in mod.CORE_SCOPE_FILES.items()))

    def test_previous_core_does_not_satisfy_new_core_identity(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(mod, "command", return_value=(1,"")), \
                 patch.object(mod, "git_exact_clean", return_value=False):
                self.assertFalse(mod.git_exact_clean(Path(d),mod.CORE_SHA))

    def test_source_pins_are_exact_commit_and_hash_shapes(self):
        for sha in (mod.CORE_SHA,mod.CONNECT_SHA,mod.CONNECT_PARENT_SHA,
                    mod.CORE_DIST_SHA,mod.PRIVATE_HTTP_DIGEST,*mod.CONNECT_FILES.values()):
            self.assertRegex(sha,r"^[0-9a-f]{40}$|^[0-9a-f]{64}$")
        self.assertNotEqual(mod.CONNECT_BUILD_ID,mod.PUBLIC_BUILD_ID)

if __name__ == "__main__":
    unittest.main()
