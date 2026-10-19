#!/usr/bin/env python3
"""Reproducible Vite artifact regression tests using fictional files only."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

p=Path(__file__).with_name("verify_reproduced_vite_artifact.py")
spec=importlib.util.spec_from_file_location("vite_fence",p)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class ArtifactReproductionTest(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.live=Path(t.name)/"live";self.build=Path(t.name)/"build"
        for x in (self.live,self.build):
            (x/"assets").mkdir(parents=True)
            (x/"index.html").write_text("<script src='/assets/test.js'></script>")
            (x/"assets"/"test.js").write_text("hello")
    def test_byte_for_byte_build_pass(self):
        self.assertEqual(mod.check(self.live,self.build)["status"],"PASS")
    def test_altered_live_entry_rejected(self):
        (self.live/"index.html").write_text("<script src='/assets/another.js'></script>")
        self.assertIn("index.html",mod.check(self.live,self.build)["changed_paths"])
    def test_replaced_bundle_rejected(self):
        (self.live/"assets"/"test.js").write_text("malicious")
        self.assertEqual(mod.check(self.live,self.build)["status"],"HOLD")
    def test_leftover_unattested_asset_rejected(self):
        (self.live/"assets"/"extra.js").write_text("old")
        self.assertEqual(mod.check(self.live,self.build)["extra_live_count"],1)
        self.assertEqual(mod.check(self.live,self.build)["status"],"HOLD")
    def test_missing_build_asset_rejected(self):
        (self.live/"assets"/"test.js").unlink()
        self.assertEqual(mod.check(self.live,self.build)["missing_live_count"],1)
    def test_symlink_escape_rejected(self):
        (self.live/"assets"/"outside.js").symlink_to("/etc/passwd")
        self.assertEqual(mod.check(self.live,self.build)["reason"],"ARTIFACT_PROVENANCE_CHECK_ERROR")
if __name__=="__main__":
    unittest.main()
