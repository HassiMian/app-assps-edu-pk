"""Offline unit tests for fail-closed live frontend release attestation."""
import unittest
from verify_live_unified_gates_20261019 import frontend_attestation_verdict

GOOD_SHA = "a"*64
GOOD_COMMIT = "b"*40

class LiveFrontendAttestationTests(unittest.TestCase):
    def test_matching_sidecar_still_requires_independent_ancestry(self):
        status, note = frontend_attestation_verdict(GOOD_SHA, {"frontend_index_sha256":GOOD_SHA, "candidate_commit":GOOD_COMMIT})
        self.assertEqual(status, "HOLD")
        self.assertIn("independent",note.lower())

    def test_active_html_differs_from_sidecar_is_a_failure(self):
        status, note = frontend_attestation_verdict("c"*64, {"frontend_index_sha256":GOOD_SHA, "candidate_commit":GOOD_COMMIT})
        self.assertEqual(status, "FAIL")
        self.assertIn("mismatch",note.lower())

    def test_missing_or_untrusted_commit_cannot_attest(self):
        for value in ("", "not-a-commit", "b"*39):
            status, _ = frontend_attestation_verdict(GOOD_SHA, {"frontend_index_sha256":GOOD_SHA,"candidate_commit":value})
            self.assertEqual(status,"FAIL")

    def test_invalid_sidecar_and_digest_fail_closed(self):
        for actual, sidecar in (("bad",{}),(GOOD_SHA,{}),(GOOD_SHA,None), (GOOD_SHA,{"frontend_index_sha256":123})):
            status, _ = frontend_attestation_verdict(actual,sidecar)
            self.assertEqual(status,"FAIL")
