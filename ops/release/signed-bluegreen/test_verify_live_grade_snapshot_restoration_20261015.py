#!/usr/bin/env python3
"""Adversarial tests use only disposable files and never touch live school data."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

src=Path(__file__).with_name("verify-live-grade-snapshot-restoration-20261015.py")
spec=importlib.util.spec_from_file_location("grade_restore",src)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class TechnicalRestorationTests(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        p=Path(t.name)
        self.live=p/"live";self.restored=p/"restored";self.archive=p/"original.tar.zst"
        for root in (self.live,self.restored):
            (root/"assets").mkdir(parents=True)
            (root/"index.html").write_text('<html><script src="/assets/index-A.js"></script></html>')
            (root/"assets/index-A.js").write_text("console.log('synthetic')")
        self.archive.write_bytes(b"test archive synthetic")
        self.index_hash=mod.digest(self.live/"index.html")
        self.archive_hash=mod.digest(self.archive)
    def audit(self):
        return mod.evaluate(self.live,self.restored,self.archive,self.archive_hash,self.index_hash,2)
    def test_exact_bytes_archive_and_entry_present(self):
        a=self.audit()
        self.assertEqual(a["technical_restore_status"],"PASS")
        self.assertEqual(mod.exit_status(a),0)
        self.assertEqual(a["production_release"],"HOLD")
    def test_broken_archive_sha_fails(self):
        self.archive.write_bytes(b"tampered")
        self.assertFalse(self.audit()["checks"]["archive_sha_matches_reviewed_live_snapshot"])
    def test_missing_archive_fails(self):
        self.archive.unlink()
        self.assertEqual(mod.exit_status(self.audit()),2)
    def test_restore_file_changed_fails(self):
        (self.restored/"assets/index-A.js").write_text("other bundle")
        self.assertFalse(self.audit()["checks"]["all_restored_file_bytes_match_running"])
    def test_restore_file_missing_fails(self):
        (self.restored/"assets/index-A.js").unlink()
        self.assertFalse(self.audit()["checks"]["no_missing_or_unexpected_files"])
    def test_restore_contains_extra_fails(self):
        (self.restored/"assets/other.js").write_text("leftover")
        self.assertFalse(self.audit()["checks"]["no_missing_or_unexpected_files"])
    def test_symbolic_link_fails(self):
        f=self.restored/"assets/index-A.js";f.unlink();f.symlink_to("arbitrary.js")
        self.assertFalse(self.audit()["checks"]["no_symlinks_in_live_or_restored_snapshot"])
    def test_wrong_index_baseline_fails(self):
        a=mod.evaluate(self.live,self.restored,self.archive,self.archive_hash,"NOT_APPROVED",2)
        self.assertFalse(a["checks"]["both_indexes_match_recorded_sha"])
    def test_no_frontend_entry_asset_fails(self):
        for root in (self.live,self.restored):
            (root/"index.html").write_text("<html>No bootstrap</html>")
        a=mod.evaluate(self.live,self.restored,self.archive,self.archive_hash,mod.digest(self.live/"index.html"),2)
        self.assertFalse(a["checks"]["restored_frontend_entry_assets_present"])
    def test_forged_human_signature_does_not_grant_production(self):
        a=self.audit()
        a["human_authorized_release_certified"]=True
        self.assertEqual(mod.exit_status(a,True),2)
    def test_release_gate_always_holds_even_with_technical_pass(self):
        self.assertEqual(mod.exit_status(self.audit(),True),2)

if __name__=="__main__":
    unittest.main(verbosity=2)
