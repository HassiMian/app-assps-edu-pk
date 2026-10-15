#!/usr/bin/env python3
"""No network or school data. Synthetic, disposable negative tests for unsigned receipts."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

TARGET = Path(__file__).with_name("verify_offsite_restore_receipt.py")
spec = importlib.util.spec_from_file_location("offsite", TARGET)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def sha(content):
    return hashlib.sha256(content).hexdigest()


class OffsiteReceiptTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.build = self.root / "BUILD_ID"
        self.build.write_text("current-qa-build\n")
        for name in ("connect-runtime.tar.gz", "connect-dependencies.tar.gz"):
            payload = ("synthetic-" + name).encode()
            (self.root / name).write_bytes(payload)
            (self.root / (name + ".sha256")).write_text(sha(payload) + "  " + name + "\n")
        self.manifest = {
            "build_id": "current-qa-build",
            "file_count": 1,
            "regular_files": [{"path": ".next/BUILD_ID", "sha256": sha(b"current-qa-build")}],
        }
        self.receipt = {
            "machine": "CYBERSPACE",
            "build_id": "current-qa-build",
            "matched": 1,
            "expected": 1,
            "error_count": 0,
            "failures": [],
        }
        self.core = {
            "overall_production_release": "HOLD",
            "core_official_gate": {"status": "HOLD", "exit_code": 2},
        }
        self.corepath = self.root / "core.json"
        self.refresh()

    def refresh(self):
        m = self.root / "offsite-regular-file-manifest.json"
        m.write_text(json.dumps(self.manifest))
        self.receipt.setdefault("manifest_sha256", sha(m.read_bytes()))
        (self.root / "OFFHOST_RESTORE_VERIFY_RESULT_20261015.json").write_text(json.dumps(self.receipt))
        self.corepath.write_text(json.dumps(self.core))

    def check(self):
        return module.validate_receipt(
            evidence_root=self.root, live_build_file=self.build, core_gate_json=self.corepath
        )

    def test_technical_pass_but_never_release(self):
        r = self.check()
        self.assertEqual(r["technical_status"], "PASS")
        self.assertFalse(r["production_release_authorized"])
        self.assertFalse(r["independent_human_reviewer_signed"])

    def test_production_gate_exit_two_despite_technical_pass(self):
        p = subprocess.run([sys.executable, str(TARGET), "--evidence-root", str(self.root),
                            "--live-build-file", str(self.build), "--official-core-report",
                            str(self.corepath), "--production-release-gate"],
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 2)
        self.assertFalse(json.loads(p.stdout)["production_release_authorized"])

    def test_source_only_cli_exit_zero(self):
        p = subprocess.run([sys.executable, str(TARGET), "--evidence-root", str(self.root),
                            "--live-build-file", str(self.build), "--official-core-report",
                            str(self.corepath)], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0)

    def test_archive_tamper_fails(self):
        (self.root / "connect-runtime.tar.gz").write_bytes(b"tampered")
        self.assertIn("ARCHIVE_HASH_MISMATCH_connect-runtime.tar.gz", self.check()["issues"])

    def test_offsite_manifest_digest_fails(self):
        self.manifest["regular_files"][0]["sha256"] = sha(b"some other data")
        self.refresh()
        self.assertIn("OFFSITE_MANIFEST_DIGEST_MISMATCH", self.check()["issues"])

    def test_forged_aggregate_fails(self):
        self.receipt["matched"] = 2
        self.refresh()
        self.assertIn("OFFSITE_FILE_RESTORE_NOT_EXACT", self.check()["issues"])

    def test_source_build_mismatch_fails(self):
        self.build.write_text("future-unreviewed\n")
        self.assertIn("LIVE_BUILD_PROVENANCE_MISMATCH", self.check()["issues"])

    def test_fake_signed_claim_never_counts(self):
        self.receipt["independent_human_reviewer_signed"] = True
        self.receipt["production_release_authorized"] = True
        self.refresh()
        r = self.check()
        self.assertFalse(r["independent_human_reviewer_signed"])
        self.assertFalse(r["production_release_authorized"])

    def test_path_traversal_fails(self):
        self.manifest["regular_files"][0]["path"] = "../../secret"
        self.refresh()
        self.assertIn("UNSAFE_SOURCE_MANIFEST_PATHS", self.check()["issues"])

    def test_duplicate_path_fails(self):
        self.manifest["regular_files"].append(copy.deepcopy(self.manifest["regular_files"][0]))
        self.manifest["file_count"] = 2
        self.receipt["expected"] = self.receipt["matched"] = 2
        self.refresh()
        self.assertIn("UNSAFE_SOURCE_MANIFEST_PATHS", self.check()["issues"])

    def test_fake_core_go_rejected(self):
        self.core["overall_production_release"] = "GO"
        self.core["core_official_gate"]["status"] = "GO"
        self.refresh()
        self.assertIn("UNVERIFIED_OR_TAMPERED_OFFICIAL_CORE_STATUS", self.check()["issues"])

    def test_missing_receipt_fails(self):
        (self.root / "OFFHOST_RESTORE_VERIFY_RESULT_20261015.json").unlink()
        self.assertEqual(self.check()["technical_status"], "FAIL")

    def test_missing_checksum_fails(self):
        (self.root / "connect-dependencies.tar.gz.sha256").unlink()
        self.assertEqual(self.check()["technical_status"], "FAIL")

    def test_unrecognized_machine_fails(self):
        self.receipt["machine"] = "IMPERSONATOR"
        self.refresh()
        self.assertIn("UNRECOGNIZED_OFFSITE_MACHINE", self.check()["issues"])

    def test_empty_file_manifest_fails(self):
        self.manifest["regular_files"] = []
        self.manifest["file_count"] = 0
        self.receipt["matched"] = self.receipt["expected"] = 0
        self.refresh()
        self.assertIn("INVALID_SOURCE_MANIFEST_COUNT", self.check()["issues"])


if __name__ == "__main__":
    unittest.main()
