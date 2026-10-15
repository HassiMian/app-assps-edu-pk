#!/usr/bin/env python3
"""Pure fail-closed regression suite for cross-owner PAPER/Core/Connect overlay."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

P=Path(__file__).with_name("verify-connect-core-paper-live-drift-20261015.py")
spec=importlib.util.spec_from_file_location("cross_owner",P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class OverlayNegativeTests(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        base=Path(temp.name)
        self.core=base/"core"
        self.paper=base/"paper"
        for f,v in {"server.js":"original","routes/lessonPlanRoutes.js":"original","services/ai/aiQueueWorkerDatabase.js":"stable"}.items():
            for root in [self.core,self.paper]:
                p=root/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(v)
        (self.paper/"routes/lessonPlanRoutes.js").write_text("reviewed-change")
        p=self.paper/"services/lessonPlanningPublicationGuard.js";p.parent.mkdir(exist_ok=True);p.write_text("additive-guard")
        self.expected={
            "routes/lessonPlanRoutes.js":m.sha(self.paper/"routes/lessonPlanRoutes.js"),
            "services/lessonPlanningPublicationGuard.js":m.sha(self.paper/"services/lessonPlanningPublicationGuard.js"),
        }

    def checks(self):
        return m.compare_overlay(self.core,self.paper,self.expected)

    def test_exact_two_file_fixture_passes(self):
        d,paths=self.checks()
        self.assertTrue(all(d.values()));self.assertEqual(set(paths),set(self.expected))

    def test_extra_unreviewed_backend_file_fails(self):
        (self.paper/"server.js").write_text("unreviewed-server-overwrite")
        d,paths=self.checks()
        self.assertFalse(d["expected_change_set_exact"]);self.assertIn("server.js",paths)

    def test_extra_unreviewed_route_fails(self):
        p=self.paper/"routes/sneaky.js";p.write_text("unreviewed")
        self.assertFalse(self.checks()[0]["expected_change_set_exact"])

    def test_missing_expected_publication_guard_fails(self):
        (self.paper/"services/lessonPlanningPublicationGuard.js").unlink()
        d,paths=self.checks()
        self.assertFalse(d["expected_change_set_exact"])
        self.assertFalse(d["all_overlay_files_hash_pinned"])

    def test_wrong_reviewed_route_sha_fails(self):
        (self.paper/"routes/lessonPlanRoutes.js").write_text("other-patch")
        self.assertFalse(self.checks()[0]["all_overlay_files_hash_pinned"])

    def test_wrong_added_guard_sha_fails(self):
        (self.paper/"services/lessonPlanningPublicationGuard.js").write_text("replaced")
        self.assertFalse(self.checks()[0]["all_overlay_files_hash_pinned"])

    def test_deletion_of_core_file_fails(self):
        (self.paper/"services/ai/aiQueueWorkerDatabase.js").unlink()
        d,paths=self.checks();self.assertFalse(d["expected_change_set_exact"])
        self.assertIn("services/ai/aiQueueWorkerDatabase.js",paths)

    def test_unreviewed_core_file_in_stage_fails(self):
        p=self.core/"lib/live-only.js";p.parent.mkdir(parents=True);p.write_text("live")
        self.assertFalse(self.checks()[0]["expected_change_set_exact"])

    def test_matching_binary_auxiliary_files_do_not_count(self):
        for root in (self.paper,self.core):
            (root/"stable.bin").write_bytes(b"\x00\xff\x81")
        self.assertTrue(all(self.checks()[0].values()))

    def test_source_only_can_return_zero(self):
        self.assertEqual(m.release_exit(True,False),0)

    def test_failing_source_cannot_return_zero(self):
        self.assertEqual(m.release_exit(False,False),2)

    def test_production_always_holds_even_when_technical_passes(self):
        self.assertEqual(m.release_exit(True,True),2)

    def test_production_fails_on_bad_source(self):
        self.assertEqual(m.release_exit(False,True),2)

if __name__=="__main__":
    unittest.main(verbosity=2)
