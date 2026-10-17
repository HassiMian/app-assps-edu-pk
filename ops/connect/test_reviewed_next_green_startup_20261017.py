"""Offline tests for immutable reviewed standalone Next startup-guard patch.

No access to production databases, credentials, PM2, Nginx, or real Next processes.
"""
import hashlib
import json
from pathlib import Path
import re
import unittest

RECOVERY = Path(__file__).parent / "recovery"
PATCH = RECOVERY / "reviewed-next-green-startup-20261017.patch"
MANIFEST = RECOVERY / "reviewed-next-green-startup-20261017.manifest.json"
PATCH_SHA = "7b0a52f00811699742cb11b65559e4844d106d0c87933bb64eeb720270525be3"
EXPECTED = {
    "ecosystem.connect.config.cjs",
    "ecosystem.connect.green.config.cjs",
    "run-next-release.sh",
    "tests/apex-green-startup-failclosed.test.cjs",
}


class NextGreenStartupGuardEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = PATCH.read_bytes()
        cls.patch = cls.data.decode("utf-8")
        cls.meta = json.loads(MANIFEST.read_text())

    def test_immutable_patch_sha(self):
        self.assertEqual(hashlib.sha256(self.data).hexdigest(), PATCH_SHA)
        self.assertEqual(self.meta["patch_sha256"], PATCH_SHA)

    def test_scope_exactly_four_connect_owned_files(self):
        touched = set(re.findall(r"^diff --git a/(.*?) b/", self.patch, re.M))
        self.assertEqual(touched, EXPECTED)
        self.assertEqual(set(self.meta["files"]), EXPECTED)

    def test_only_adds_one_independent_green_process_recipe(self):
        self.assertIn("+++ b/ecosystem.connect.green.config.cjs", self.patch)
        self.assertIn("+    name: 'apex-connect-green'", self.patch)
        self.assertIn("+    script: '/var/www/apex-connect/run-next-release.sh'", self.patch)

    def test_both_recipes_reference_only_existing_stable_release_by_default(self):
        self.assertIn("+    env: { NODE_ENV: 'production', NEXT_DIST_DIR: '.next' }", self.patch)
        self.assertIn("+    env: { NODE_ENV: 'production', APP_PORT: '3002', NEXT_DIST_DIR: '.next' }", self.patch)

    def test_startup_guard_does_not_silently_copy_or_promote_candidate(self):
        self.assertIn('case "$NEXT_DIST_DIR" in', self.patch)
        self.assertIn("+  .next|.next-candidate) ;;", self.patch)
        self.assertIn("+  *) echo 'CONNECT_BOOT_BLOCKED: invalid distribution selector'", self.patch)
        self.assertNotIn("+cp -", self.patch)
        self.assertNotIn("+ln -s", self.patch)
        self.assertNotIn("+mv ", self.patch)

    def test_candidate_must_have_build_identity_and_required_manifest(self):
        for evidence in ("NEXT_DIST_DIR/server", "required-server-files.json", "BUILD_ID", "CONNECT_BOOT_BLOCKED: selected production build"):
            self.assertIn(evidence, self.patch)

    def test_missing_build_uses_distinct_pm2_no_restart_code(self):
        self.assertIn("+  exit 78", self.patch)
        self.assertEqual(self.patch.count("+    stop_exit_codes: [78]"), 2)
        self.assertEqual(self.patch.count("+    max_restarts: 3"), 2)

    def test_no_credentials_or_school_record_access_added(self):
        forbidden = ("+psql ", "+DROP TABLE", "+DELETE FROM", "+UPDATE exam_results", "+ALTER ROLE", "+curl -H 'Authorization", "+set -x")
        for item in forbidden:
            with self.subTest(item=item):
                self.assertNotIn(item, self.patch)

    def test_adversarial_tests_are_included_in_exact_patch(self):
        for key in ("missing candidate", "partial candidate", "unsafe directory selectors", "symlinked candidate", "invalid port"):
            self.assertIn(key, self.patch)

    def test_manifest_explicitly_disclaims_application_production_release(self):
        self.assertFalse(self.meta["production_source_changed"])
        self.assertFalse(self.meta["production_app_cutover"])
        self.assertTrue(self.meta["core_owner_approval_required"])
        self.assertEqual(self.meta["runtime_build_id_preserved"], "ONDwxEIZlx5onDIKY7wYf")

    def test_exact_reviewed_child_differs_from_parent(self):
        self.assertRegex(self.meta["standalone_parent_sha"], r"^[0-9a-f]{40}$")
        self.assertRegex(self.meta["standalone_reviewed_sha"], r"^[0-9a-f]{40}$")
        self.assertNotEqual(self.meta["standalone_parent_sha"], self.meta["standalone_reviewed_sha"])

    def test_patch_has_no_binary_unknown_files(self):
        self.assertNotIn("GIT binary patch", self.patch)
        self.assertNotIn("Binary files", self.patch)


if __name__ == "__main__":
    unittest.main()
