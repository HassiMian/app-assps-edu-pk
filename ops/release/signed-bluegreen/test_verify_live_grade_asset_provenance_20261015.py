#!/usr/bin/env python3
"""Synthetic fixture-only adverse tests; never touch running web assets."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
p=Path(__file__).with_name("verify-live-grade-asset-provenance-20261015.py")
spec=importlib.util.spec_from_file_location("grade_assets",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class AssetOriginTests(unittest.TestCase):
    def setUp(self):
        d=tempfile.TemporaryDirectory();self.addCleanup(d.cleanup)
        r=Path(d.name)
        self.live=r/"running";self.reference=r/"resultcards";self.archive=r/"previous-grade"
        for root in (self.live,self.reference,self.archive):
            (root/"assets").mkdir(parents=True)
        html='<html><script type="module" src="/assets/index-test123.js"></script></html>'
        for root in (self.live,self.reference):
            (root/"index.html").write_text(html)
            (root/"assets/index-test123.js").write_text('const x="assets/Lazy-test123.js";')
            (root/"assets/Lazy-test123.js").write_text("export default true;")
        (self.archive/"index.html").write_text("previous-reviewed-release")
        self.observed=m.sha(self.live/"index.html")
        self.reviewed=m.sha(self.archive/"index.html")

    def audit(self):
        return m.evaluate(self.live,self.reference,self.archive,self.reviewed,self.observed)
    def test_complete_assets_pass_source_only(self):
        x=self.audit()
        self.assertTrue(x["technical_assets_complete"])
        self.assertEqual(m.exit_status(x,True),0)
        self.assertFalse(x["authorized_human_current_source_approval"])
    def test_missing_lazy_chunk_blocks(self):
        (self.live/"assets/Lazy-test123.js").unlink()
        x=self.audit()
        self.assertFalse(x["technical_assets_complete"])
        self.assertEqual(x["missing_direct_assets"],["assets/Lazy-test123.js"])
        self.assertEqual(m.exit_status(x,True),2)
    def test_missing_bootstrap_blocks(self):
        (self.live/"assets/index-test123.js").unlink()
        self.assertFalse(self.audit()["checks"]["current_main_js_identical_to_resultcards_reference"])
    def test_unauthorized_replaced_js_blocks(self):
        (self.live/"assets/index-test123.js").write_text("let injected=true;")
        self.assertFalse(self.audit()["technical_assets_complete"])
    def test_changed_index_blocks_even_if_valid_js(self):
        (self.live/"index.html").write_text('<html><script type="module" src="/assets/index-test123.js"></script> NEW </html>')
        self.assertFalse(self.audit()["checks"]["current_index_matches_observed_review_snapshot"])
    def test_missing_original_backup_blocks(self):
        (self.archive/"index.html").unlink()
        self.assertFalse(self.audit()["technical_assets_complete"])
    def test_corrupt_original_backup_blocks(self):
        (self.archive/"index.html").write_text("new-overwritten")
        self.assertFalse(self.audit()["checks"]["previous_grade_archive_reviewed_hash_preserved"])
    def test_mismatch_reference_index_is_not_approval(self):
        (self.reference/"index.html").write_text("different")
        self.assertFalse(self.audit()["live_index_byte_identical_to_other_resultcards_tree"])
    def test_main_entry_from_other_release_not_authentic_deployment(self):
        x=self.audit()
        self.assertTrue(x["live_index_byte_identical_to_other_resultcards_tree"])
        self.assertFalse(x["release_ownership_cryptographically_verified"])
    def test_unreviewed_extra_file_is_reported(self):
        (self.live/"assets/extra.js").write_text("previously deployed leftover")
        x=self.audit()
        self.assertEqual(x["live_files_not_in_other_reference"],1)
    def test_production_hold_even_technical_pass(self):
        x=self.audit()
        self.assertEqual(x["production_release"],"HOLD")
        self.assertEqual(m.exit_status(x,False),2)
    def test_fail_closed_when_technical_missing(self):
        (self.live/"assets/Lazy-test123.js").unlink()
        self.assertEqual(m.exit_status(self.audit(),False),2)

if __name__=="__main__":
    unittest.main(verbosity=2)
