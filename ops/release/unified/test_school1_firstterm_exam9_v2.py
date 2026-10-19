#!/usr/bin/env python3
"""Offline-only tests. Never connect to school PostgreSQL."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

p=Path(__file__).with_name("verify_school1_firstterm_exam9_v2.py")
spec=importlib.util.spec_from_file_location("ftv2",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
DATA={**m.EXPECTED,"exam9_sha256":"1"*64,"exam9_metadata_sha256":"2"*64}

class V2Tests(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        root=Path(t.name)
        self.vault=patch.object(m,"VAULT",root);self.vault.start();self.addCleanup(self.vault.stop)
        self.base=patch.object(m,"BASE",root/"v2.json");self.base.start();self.addCleanup(self.base.stop)
        self.legacy=patch.object(m,"LEGACY",root/"old.json");self.legacy.start();self.addCleanup(self.legacy.stop)
        m.LEGACY.write_text(json.dumps({"observed":{
          "exam9_sha256":DATA["exam9_sha256"],"first_term_rows":1853,
          "real_zero_marks":224,"null_marks":0,"exam8_sha256":"legacy-school2-demo"}}))
    def create(self):
        with patch.object(m,"observe",return_value=dict(DATA)):
            m.run_init()
    def test_school1_v2_baseline_and_check(self):
        self.create()
        with patch.object(m,"observe",return_value=dict(DATA)):
            self.assertEqual(m.check_status(),(True,"SCHOOL1_FIRST_TERM_IMMUTABLE_INTEGRITY_PASS"))
    def test_existing_baseline_unoverwriteable(self):
        self.create()
        with patch.object(m,"observe",return_value=dict(DATA)):
            with self.assertRaises(FileExistsError):m.run_init()
    def test_school2_demo_is_not_part_of_school1_observed_hash(self):
        self.create()
        other=json.loads(m.LEGACY.read_text())
        other["observed"]["exam8_sha256"]="changed-legitimately-by-school2"
        m.LEGACY.write_text(json.dumps(other))
        with patch.object(m,"observe",return_value=dict(DATA)):
            self.assertEqual(m.check_status()[0],True)
    def test_firstterm_marks_sha_drift_blocks(self):
        self.create()
        changed=dict(DATA,exam9_sha256="9"*64)
        with patch.object(m,"observe",return_value=changed):
            self.assertEqual(m.check_status()[0],False)
    def test_firstterm_metadata_drift_blocks(self):
        self.create()
        changed=dict(DATA,exam9_metadata_sha256="8"*64)
        with patch.object(m,"observe",return_value=changed):
            self.assertEqual(m.check_status()[0],False)
    def test_cross_school_insertion_refused_at_init(self):
        changed=dict(DATA,non_school1_rows=1)
        with patch.object(m,"observe",return_value=changed):
            with self.assertRaisesRegex(RuntimeError,"SCOPE"):m.run_init()
    def test_legacy_hash_mismatch_refuses_init(self):
        changed=dict(DATA,exam9_sha256="7"*64)
        with patch.object(m,"observe",return_value=changed):
            with self.assertRaisesRegex(RuntimeError,"LEGACY_EXAM9_SHA_MISMATCH"):m.run_init()
    def test_live_drift_during_read_detected(self):
        self.create()
        changed=dict(DATA,real_zero_marks=223)
        with patch.object(m,"observe",side_effect=[dict(DATA),changed]):
            self.assertEqual(m.check_status(),(False,"LIVE_CHANGING_DURING_CHECK"))
    def test_immutable_file_permission(self):
        self.create()
        self.assertEqual(m.BASE.stat().st_mode&0o777,0o600)
    def test_unified_core_release_gate_references_v2_only(self):
        source=Path(__file__).with_name('assps_unified_readiness_readonly.py').read_text()
        self.assertIn('verify_school1_firstterm_exam9_v2.py',source)
        self.assertIn("'SCHOOL1_FIRST_TERM_IMMUTABLE_INTEGRITY_PASS'",source)
        self.assertNotIn("Path('/root/secure-archive/assps-firstterm-retention-20261019/verify_firstterm_integrity.py')",source)
    def test_metadata_identity_is_school1_exam9(self):
        self.create()
        changed=dict(DATA,school_id=2)
        with patch.object(m,"observe",return_value=changed):
            self.assertEqual(m.check_status()[0],False)

if __name__=="__main__":
    unittest.main()
