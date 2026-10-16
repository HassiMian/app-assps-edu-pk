"""Offline immutable-source validation for the admin-export error-redaction patch."""
import hashlib
import json
from pathlib import Path
import re
import unittest

OPS = Path(__file__).resolve().parent
PATCH = OPS / "recovery/reviewed-next-admin-export-error-redaction-20261016.patch"
MANIFEST = OPS / "recovery/reviewed-next-admin-export-error-redaction-20261016.manifest.json"
PATCH_PIN = "36fe68f52ab439d53b4f01aac455a86ba0bf3d3f061fd63115a758b79087cb31"
EXPECTED = {
    "src/app/api/saas-admin/apex-leads/export/route.ts",
    "src/app/api/saas-admin/subscription-requests/export/route.ts",
    "tests/admin-export-route-security.test.cjs",
}

class ExportErrorRedaction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = PATCH.read_bytes()
        cls.patch = cls.data.decode()
        cls.manifest = json.loads(MANIFEST.read_text())

    def test_immutable_pin(self):
        self.assertEqual(hashlib.sha256(self.data).hexdigest(), PATCH_PIN)
        self.assertEqual(self.manifest["patchSha256"], PATCH_PIN)

    def test_exact_source_and_scope(self):
        self.assertEqual(self.manifest["baseCommit"],
                         "2b749aee8a21b460e099e4bdbf608e1b997427c0")
        self.assertEqual(self.manifest["fixCommit"],
                         "eb007ae1d2c539b6f20095ebc832605c0b5ac6e2")
        paths = re.findall(r"^diff --git a/([^ ]+) b/([^ ]+)$",
                           self.patch, flags=re.MULTILINE)
        self.assertEqual({a for a,b in paths if a==b}, EXPECTED)
        self.assertEqual(len(paths), 3)
        self.assertEqual(set(self.manifest["sourceFileSha256"]), EXPECTED)

    def test_both_failures_redacted_and_not_cached(self):
        for route in EXPECTED:
            if not route.endswith("/route.ts"):
                continue
            m = re.search(r"(?ms)^diff --git a/"+re.escape(route)+r" b/"+re.escape(route)+r"\n.*?(?=^diff --git|\Z)",self.patch)
            self.assertIsNotNone(m)
            change = m.group(0)
            self.assertIn('+      { success: false, message: "Export temporarily unavailable" },',change)
            self.assertIn('+      { status: 500, headers: { "Cache-Control": "no-store" } },',change)
            self.assertIn('-    return NextResponse.json({ success: false, message }, { status: 500 });',change)
            self.assertNotIn('+    return NextResponse.json({ success: false, message }, { status: 500 });',change)

    def test_test_has_actual_auth_and_error_boundaries(self):
        self.assertIn("PRIVATE_INTERNAL_DB_CONNECTION_STRING", self.patch)
        self.assertIn("+    assert.equal(r.status, 500);", self.patch)
        self.assertIn("+    assert.doesNotMatch(JSON.stringify(r.body)", self.patch)

    def test_release_status_held_even_when_build_green(self):
        self.assertIs(self.manifest["productionModified"],False)
        self.assertIs(self.manifest["releaseAuthorized"],False)
        self.assertEqual(self.manifest["newRouteTests"],8)
        self.assertEqual(self.manifest["combinedFocusedNodeTests"],18)
        self.assertEqual(self.manifest["observedBuildExit"],0)
        self.assertRegex(self.manifest["isolatedBuildLogSha256"],r"^[a-f0-9]{64}$")

if __name__ == "__main__":
    unittest.main()
