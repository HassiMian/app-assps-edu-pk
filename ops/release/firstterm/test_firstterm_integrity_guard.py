#!/usr/bin/env python3
"""Offline adversarial tests: never contacts a school database."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SRC = Path(__file__).with_name("verify_firstterm_integrity.py")
spec = importlib.util.spec_from_file_location("firstterm_guard", SRC)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

EXPECTED = {
    "first_term_exam_id": 9,
    "first_term_rows": 1853,
    "real_zero_marks": 224,
    "null_marks": 0,
    "exam9_sha256": "a"*64,
    "exam8_sha256": "b"*64,
    "exam8_9_metadata_sha256": "c"*64,
}

class HistoricalRetentionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name) / "nested" / "historical.json"
        self.bp = patch.object(guard, "BASE", self.base)
        self.bp.start()
        self.addCleanup(self.bp.stop)

    def invoke(self, action):
        with patch("sys.argv", ["verify_firstterm_integrity.py", action]):
            return guard.main()

    def test_init_and_verify_does_not_alter_baseline(self):
        with patch.object(guard, "observe", return_value=EXPECTED):
            self.assertEqual(self.invoke("--init"), 0)
            before = self.base.read_bytes()
            self.assertEqual(self.invoke("--check"), 0)
            self.assertEqual(self.base.read_bytes(), before)
            self.assertEqual(self.base.stat().st_mode & 0o777, 0o600)

    def test_reinitialization_refused(self):
        with patch.object(guard, "observe", return_value=EXPECTED):
            self.assertEqual(self.invoke("--init"), 0)
            with self.assertRaisesRegex(RuntimeError, "BASELINE_ALREADY_EXISTS"):
                self.invoke("--init")

    def test_initialization_refuses_unexpected_or_null_marks(self):
        changed = dict(EXPECTED, null_marks=1)
        with patch.object(guard, "observe", return_value=changed):
            with self.assertRaisesRegex(RuntimeError, "HISTORICAL_COUNTS_UNEXPECTED"):
                self.invoke("--init")
        self.assertFalse(self.base.exists())

    def test_changed_exam_result_hash_blocks_promotion(self):
        with patch.object(guard, "observe", return_value=EXPECTED):
            self.assertEqual(self.invoke("--init"), 0)
        drift=dict(EXPECTED, exam9_sha256="d"*64)
        with patch.object(guard, "observe", return_value=drift):
            self.assertEqual(self.invoke("--check"), 2)

    def test_changed_historical_exam8_blocks_promotion(self):
        with patch.object(guard, "observe", return_value=EXPECTED):
            self.assertEqual(self.invoke("--init"), 0)
        drift=dict(EXPECTED, exam8_sha256="f"*64)
        with patch.object(guard, "observe", return_value=drift):
            self.assertEqual(self.invoke("--check"), 2)

    def test_racing_snapshot_refused(self):
        unstable=dict(EXPECTED, exam9_sha256="e"*64)
        with patch.object(guard, "observe", side_effect=[EXPECTED, unstable]):
            with self.assertRaisesRegex(RuntimeError, "LIVE_DATA_CHANGED_DURING_CAPTURE"):
                self.invoke("--init")
        self.assertFalse(self.base.exists())

if __name__ == "__main__":
    unittest.main()
