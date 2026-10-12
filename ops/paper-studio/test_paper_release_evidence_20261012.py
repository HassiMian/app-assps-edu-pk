#!/usr/bin/env python3
"""Negative/positive regression tests for the offline evidence attestation."""
import importlib.util
import json
import pathlib
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("paper_evidence", HERE / "verify-paper-offline-evidence-20261012.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SHA = "a" * 40


class TestEvidenceChecks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.write("provenance.txt", f"source_commit={SHA}\nsource_branch=test\nutc_started=2026-10-12T16:15:50Z\n")
        self.write("summary.txt", "".join(f"PASS {gate}\n" for gate in module.GATES) + "ALL_AUTOMATED_PAPER_CANDIDATE_GATES_PASS\n")
        for gate in module.GATES:
            body = "synthetic log\n"
            if gate in module.TAP_COUNTS:
                n = module.TAP_COUNTS[gate]
                body = f"TAP version 13\n# tests {n}\n# pass {n}\n# fail 0\n"
            elif gate == "protected-templates":
                body = "PASS protected template integrity (6 files unchanged)\n"
            elif gate == "paper-owned-eslint":
                body = json.dumps([{"errorCount": 0, "warningCount": int(i < 4)} for i in range(270)])
            elif gate == "vite-build":
                body = "✓ built in 4.00s\n"
            elif gate == "first-term-marks-browser":
                body = "MARKS_BROWSER_PASS synthetic\n" * 11
            self.write(gate + ".log", body)

    def write(self, name, content):
        (self.root / name).write_text(content, encoding="utf8")

    def test_positive_all_sixteen(self):
        result = module.verify(self.root, SHA)
        self.assertEqual(result["gates"], 16)

    def test_wrong_commit_refused(self):
        with self.assertRaisesRegex(ValueError, "SHA differs"):
            module.verify(self.root, "b" * 40)

    def test_missing_gate_refused(self):
        self.write("summary.txt", (self.root / "summary.txt").read_text().replace("PASS vite-build\n", ""))
        with self.assertRaisesRegex(ValueError, "Missing, reordered"):
            module.verify(self.root, SHA)

    def test_duplicate_gate_refused(self):
        p = self.root / "summary.txt"
        p.write_text(p.read_text() + "PASS vite-build\n")
        with self.assertRaisesRegex(ValueError, "Missing, reordered"):
            module.verify(self.root, SHA)

    def test_tap_failure_refused(self):
        self.write("guard-fixtures.log", "TAP version 13\n# tests 5\n# pass 4\n# fail 1\n")
        with self.assertRaisesRegex(ValueError, "Unexpected test counts"):
            module.verify(self.root, SHA)

    def test_eslint_error_refused(self):
        self.write("paper-owned-eslint.log", json.dumps([{"errorCount": int(i == 0), "warningCount": int(i < 4)} for i in range(270)]))
        with self.assertRaisesRegex(ValueError, "ESLint"):
            module.verify(self.root, SHA)

    def test_symlink_evidence_refused(self):
        p = self.root / "vite-build.log"
        p.unlink()
        p.symlink_to(self.root / "protected-templates.log")
        with self.assertRaisesRegex(ValueError, "linked"):
            module.verify(self.root, SHA)

    def test_partial_run_refused(self):
        p = self.root / "summary.txt"
        p.write_text(p.read_text().replace("ALL_AUTOMATED_PAPER_CANDIDATE_GATES_PASS", "ONLY_SELECTED_GATES_PASS"))
        with self.assertRaisesRegex(ValueError, "sentinel"):
            module.verify(self.root, SHA)


if __name__ == "__main__":
    unittest.main()
