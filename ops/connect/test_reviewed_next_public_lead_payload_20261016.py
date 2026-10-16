"""Offline immutable proof of reviewed APEX public lead payload guard.

No production data or real SMTP; applies only to the exact published two-file patch.
"""
import hashlib
import json
from pathlib import Path
import unittest
from test_reviewed_next_csv_formula_20261016 import sections

RECOVERY = Path(__file__).resolve().parent / "recovery"
PATCH = RECOVERY / "reviewed-next-public-lead-payload-20261016.patch"
MANIFEST = RECOVERY / "reviewed-next-public-lead-payload-20261016.manifest.json"
PIN = "f0e1f73ce93c7d1fdc1f5e48a068fb0d7807f88447362f802c443bfe65ae6429"
ROUTE = "src/app/api/apex/leads/route.ts"
TEST = "tests/apex-public-lead-mail-safety.test.cjs"

class ReviewedPublicLeadPayload(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = PATCH.read_bytes()
        cls.patches = sections(cls.raw.decode("utf-8"))
        cls.manifest = json.loads(MANIFEST.read_text())

    def test_immutable_patch_sha(self):
        self.assertEqual(hashlib.sha256(self.raw).hexdigest(), PIN)
        self.assertEqual(self.manifest["patchSha256"], PIN)

    def test_exactly_two_connect_owned_paths(self):
        self.assertEqual(set(self.patches), {ROUTE, TEST})
        self.assertEqual(set(self.manifest["changedFiles"]), {ROUTE, TEST})
        self.assertEqual(set(self.manifest["sourceFileSha256"]), {ROUTE, TEST})

    def test_fixed_parent_commit_and_release_scope(self):
        self.assertEqual(self.manifest["baseCommit"], "9c2e34c2fe988cf01dd1a679f42654e278473f07")
        self.assertEqual(self.manifest["fixedCommit"], "c47edc0c8bf18d93a7b4daecd15ffc12f1ba47b9")
        self.assertFalse(self.manifest["productionModified"])
        self.assertFalse(self.manifest["releaseAuthorized"])

    def test_validates_json_container_fields_extra_before_storage(self):
        delta = self.patches[ROUTE]
        for marker in ["validPublicLeadPayload", "Array.isArray", "PUBLIC_LEAD_FIELD_LIMITS",
                       "MAX_PUBLIC_LEAD_JSON_CHARS", "Record<string, string>", "Object.entries"]:
            self.assertIn(marker, delta)
        self.assertIn("if (!validPublicLeadPayload(body))", delta)
        self.assertIn('return rejectPublicLead("Invalid request fields")', delta)

    def test_explicit_noncache_and_client_errors(self):
        delta = self.patches[ROUTE]
        self.assertIn('"Cache-Control": "no-store"', delta)
        self.assertIn('rejectPublicLead("Request too large", 413)', delta)
        self.assertIn('rejectPublicLead("Invalid request fields")', delta)

    def test_synthetic_regressions_include_legacy_success(self):
        delta = self.patches[TEST]
        for marker in ["null, primitive and array", "non-string form fields",
                       "oversized fields", "legacy aliases", "disable caching"]:
            self.assertIn(marker, delta)
        self.assertIn("assert.equal(h.calls.save,0)", delta)

    def test_build_evidence_properly_qualified(self):
        m = self.manifest
        self.assertTrue(m["buildLogShowsCompletedPostbuild"])
        self.assertFalse(m["buildCommandDirectExitCodeCaptured"])
        self.assertEqual(m["focusedNodeTestsPassed"], 39)
        self.assertTrue(m["eslintPassed"])
        self.assertRegex(m["buildLogSha256"], r"^[a-f0-9]{64}$")
        self.assertRegex(m["privateBuildId"], r"^[A-Za-z0-9_-]{12,32}$")
        self.assertIn("NOT ingress stream cap", m["bodyLimitScope"])

if __name__ == "__main__":
    unittest.main()
