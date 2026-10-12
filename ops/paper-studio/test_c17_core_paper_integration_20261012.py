import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("m", Path(__file__).with_name("verify-c17-core-paper-integration-20261012.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def valid():
    return {
        "dirty": False, "core_is_ancestor": True, "core_expected": "core-sha",
        "core_remote": "core-sha", "source_head": "paper-sha",
        "source_remote": "paper-sha", "tested_frontend_tree": "f-tree",
        "integrated_frontend_tree": "f-tree", "tested_backend_tree": "b-tree",
        "integrated_backend_tree": "b-tree", "original_evidence_verified": True
    }


class TestC17Integration(unittest.TestCase):
    def test_clean_identical_source_passes_only_source(self):
        out = m.assess(valid())
        self.assertEqual(out["status"], "PASS_RUNTIME_EQUIVALENT_SOURCE_ONLY")
        self.assertFalse(out["production_certified"])

    def test_dirty_workspace_holds(self):
        f = valid(); f["dirty"] = True
        self.assertIn("integration_worktree_not_clean", m.assess(f)["holds"])

    def test_missing_core_ancestry_holds(self):
        f = valid(); f["core_is_ancestor"] = False
        self.assertIn("latest_core_not_in_candidate_ancestry", m.assess(f)["holds"])

    def test_remote_new_core_holds(self):
        f = valid(); f["core_remote"] = "newer"
        self.assertIn("core_remote_advanced_or_missing", m.assess(f)["holds"])

    def test_unpublished_source_holds(self):
        f = valid(); f["source_remote"] = None
        self.assertIn("integration_branch_not_published_at_exact_SHA", m.assess(f)["holds"])

    def test_frontend_runtime_drift_holds(self):
        f = valid(); f["integrated_frontend_tree"] = "changed"
        self.assertIn("frontend_runtime_differs_from_fully_tested_commit", m.assess(f)["holds"])

    def test_backend_runtime_drift_holds(self):
        f = valid(); f["integrated_backend_tree"] = "changed"
        self.assertIn("backend_runtime_differs_from_fully_tested_commit", m.assess(f)["holds"])

    def test_unverified_logs_hold(self):
        f = valid(); f["original_evidence_verified"] = False
        self.assertIn("original_full_16_gate_evidence_unverified", m.assess(f)["holds"])


if __name__ == "__main__":
    unittest.main()
