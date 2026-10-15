#!/usr/bin/env python3
"""No actual school data or Git worktrees: synthetic byte-drift negative cases."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

p=Path(__file__).with_name("verify-public-grade-dist-source-match-20261015.py")
spec=importlib.util.spec_from_file_location("forensic_match",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class DistEvidenceTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup)
        r=Path(tmp.name);self.dist=r/"dist";self.live=r/"public"
        for d in (self.dist,self.live):(d/"assets").mkdir(parents=True)
        for i in range(m.OBSERVED_DIST_COUNT):
            name="index.html" if i==0 else f"assets/f{i:02d}.js"
            for d in (self.dist,self.live):
                p=d/name;p.write_bytes(f"file={i}".encode())
    def audit(self):
        return m.overlay(self.live,self.dist)
    def test_exact_89_files_pass(self):
        self.assertTrue(self.audit()["all_dist_files_identical_to_live"])
        self.assertEqual(self.audit()["byte_identical_dist_files"],m.OBSERVED_DIST_COUNT)
    def test_change_live_index_fails(self):
        (self.live/"index.html").write_text("new HTML")
        self.assertIn("index.html",self.audit()["mismatched_dist_files"])
        self.assertFalse(self.audit()["all_dist_files_identical_to_live"])
    def test_change_dynamic_chunk_fails(self):
        (self.live/"assets/f63.js").write_text("tampered")
        self.assertFalse(self.audit()["all_dist_files_identical_to_live"])
    def test_missing_live_asset_fails(self):
        (self.live/"assets/f81.js").unlink()
        self.assertIn("assets/f81.js",self.audit()["missing_dist_files"])
        self.assertFalse(self.audit()["all_dist_files_identical_to_live"])
    def test_deleting_source_artifact_fails_pinned_count(self):
        (self.dist/"assets/f70.js").unlink()
        self.assertFalse(self.audit()["all_dist_files_identical_to_live"])
    def test_source_symlink_fails(self):
        f=self.dist/"assets/f02.js";f.unlink();f.symlink_to("f03.js")
        self.assertFalse(self.audit()["all_dist_files_identical_to_live"])
        self.assertEqual(self.audit()["dist_symlinks"],["assets/f02.js"])
    def test_live_symlink_fails(self):
        f=self.live/"assets/f02.js";f.unlink();f.symlink_to("f03.js")
        self.assertFalse(self.audit()["all_dist_files_identical_to_live"])
        self.assertEqual(self.audit()["live_symlinks"],["assets/f02.js"])
    def test_unmatched_extra_live_file_reported_but_not_guess_stale(self):
        (self.live/"assets/old-leftover.js").write_text("legacy")
        self.assertEqual(self.audit()["unmatched_live_file_count"],1)
        self.assertTrue(self.audit()["all_dist_files_identical_to_live"])
    def test_source_only_pass_never_implies_production_go(self):
        self.assertEqual(m.exit_code({"technical_match":"PASS"},True),0)
        self.assertEqual(m.exit_code({"technical_match":"PASS"},False),2)
    def test_source_only_mismatched_fails(self):
        self.assertEqual(m.exit_code({"technical_match":"HOLD"},True),2)
    def test_remote_or_git_unavailable_fails_closed(self):
        r=m.evaluate(self.live,self.dist,self.dist,observed=m.digest(self.live/"index.html"),
                     previous="old-review",local_expected="claim",remote_expected="claim",check_git=False)
        self.assertEqual(r["technical_match"],"HOLD")
        self.assertFalse(r["reviewed_clean_source_commit_proven"])
        self.assertFalse(r["institutional_human_approved_release"])
    def test_metadata_not_equivalent_to_reviewed_clean_commit(self):
        r=m.evaluate(self.live,self.dist,self.dist,observed=m.digest(self.live/"index.html"),
                     previous="old-review",local_expected="claim",remote_expected="claim",check_git=False)
        self.assertTrue(r["all_dist_files_identical_to_live"])
        self.assertFalse(r["reviewed_clean_source_commit_proven"])
        self.assertEqual(r["production_release"],"HOLD")

if __name__=="__main__":
    unittest.main(verbosity=2)
