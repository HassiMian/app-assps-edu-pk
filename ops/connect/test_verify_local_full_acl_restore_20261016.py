#!/usr/bin/env python3
import copy
import importlib.util
import json
import tempfile
from pathlib import Path
import unittest

p=Path(__file__).with_name("verify_local_full_acl_restore_20261016.py")
spec=importlib.util.spec_from_file_location("restore_verifier",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
DATA=json.loads(m.DEFAULT.read_text())

class OfflineRecoveryBoundaries(unittest.TestCase):
    def test_real_aggregate_metadata_valid(self): self.assertTrue(m.valid(DATA))
    def test_no_fake_offhost_signature(self):
        d=copy.deepcopy(DATA);d["independent_offsite_restore_certified"]=True
        self.assertFalse(m.valid(d))
    def test_no_fake_core_signoff(self):
        d=copy.deepcopy(DATA);d["core_reviewer_approved_current_sha"]=True
        self.assertFalse(m.valid(d))
    def test_no_fake_production_release(self):
        d=copy.deepcopy(DATA);d["production_release_authorized"]=True
        self.assertFalse(m.valid(d))
    def test_no_fake_production_change(self):
        d=copy.deepcopy(DATA);d["production_data_modified"]=True
        self.assertFalse(m.valid(d))
    def test_acl_drift_rejected(self):
        d=copy.deepcopy(DATA);d["normalized_effective_grant_parity"]=False
        self.assertFalse(m.valid(d))
    def test_result_loss_rejected(self):
        d=copy.deepcopy(DATA);d["live_and_restored_exam_rows"]-=1
        self.assertFalse(m.valid(d))
    def test_zero_vs_blank_rejected(self):
        d=copy.deepcopy(DATA);d["live_and_restored_real_zeros"]-=1
        self.assertFalse(m.valid(d))
    def test_wrong_backup_sha_rejected(self):
        d=copy.deepcopy(DATA);d["source_archive_sha256"]="0"*64
        self.assertFalse(m.valid(d))
    def test_missing_private_log_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertFalse(m.check_local(DATA,Path(d)/"archive",Path(d)/"log"))
    def test_private_log_not_committed(self):
        d=copy.deepcopy(DATA);d["private_restore_log_in_git"]=True
        self.assertFalse(m.valid(d))

if __name__=="__main__":
    unittest.main()
