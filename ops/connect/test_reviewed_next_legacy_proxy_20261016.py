"""Offline security contracts for exact approved Connect-only legacy proxy patch.

This tests immutable source evidence, NOT live tenant/RLS or network behavior.
"""
from pathlib import Path
import hashlib
import re
import unittest

PATCH = Path(__file__).parent / "recovery/reviewed-next-legacy-proxy-20261016.patch"
EXPECTED_SHA256 = "eeb08d15032c2aad19efa536098131f0687d8430b1af12c7e4ce178516407b7c"
EXPECTED_FILES = {
    "src/app/api/proxy/[...path]/route.ts",
    "tests/apex-legacy-proxy-failclosed.test.cjs",
}


class ReviewedLegacyProxyPatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = PATCH.read_bytes()
        cls.diff = cls.raw.decode("utf-8")

    def test_patch_has_exact_immutable_sha256(self):
        self.assertEqual(hashlib.sha256(self.raw).hexdigest(), EXPECTED_SHA256)

    def test_diff_only_touches_connect_legacy_proxy_and_synthetic_qa(self):
        files = set(re.findall(r"^diff --git a/(.*?) b/", self.diff, re.M))
        self.assertEqual(files, EXPECTED_FILES)

    def test_enforces_fail_closed_json_private_limits_and_path_encoding(self):
        for proof in (
            "private, no-store",
            "MAX_STANDARD_BYTES",
            "MAX_LARGE_BYTES",
            "Invalid API path.",
            "Request exceeds upload size limit.",
            "Invalid backend JSON response.",
            "encodeURIComponent",
            "redirect: 'manual'",
            "AbortSignal.timeout",
            "204, 205, 304",
        ):
            with self.subTest(proof=proof):
                self.assertIn(proof, self.diff)

    def test_tests_contain_path_length_json_and_unicode_case(self):
        for proof in (
            "JSON401 is never cacheable",
            "rejects traversal and delimiter",
            "40MB JSON",
            "streaming",
            "oversized upload",
            "Unicode path",
        ):
            with self.subTest(proof=proof):
                self.assertIn(proof, self.diff)


if __name__ == "__main__":
    unittest.main()
