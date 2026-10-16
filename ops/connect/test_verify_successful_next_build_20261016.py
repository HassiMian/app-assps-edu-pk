#!/usr/bin/env python3
import copy
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

P=Path(__file__).with_name("verify_successful_next_build_20261016.py")
S=importlib.util.spec_from_file_location("optimized_build_contract",P)
V=importlib.util.module_from_spec(S)
S.loader.exec_module(V)
SOURCE=json.loads(V.MANIFEST.read_text())

class ActualBuildEvidenceSafety(unittest.TestCase):
    def test_exact_source_manifest_valid(self):
        self.assertTrue(V.valid(SOURCE))
    def test_actual_log_and_binaries_current(self):
        if V.STAGE.is_dir():
            self.assertTrue(V.verify(SOURCE))
    def test_stale_build_identity_rejected(self):
        d=copy.deepcopy(SOURCE);d["build_id"]="ONDwxEIZlx5onDIKY7wYf"
        self.assertFalse(V.valid(d))
    def test_stale_source_rejected(self):
        d=copy.deepcopy(SOURCE);d["source_commit"]="0"*40
        self.assertFalse(V.valid(d))
    def test_synthetic_does_not_count_as_real_staff_certificate(self):
        d=copy.deepcopy(SOURCE);d["signed_staff_login_certified"]=True
        self.assertFalse(V.valid(d))
    def test_synthetic_cannot_become_school2_certificate(self):
        d=copy.deepcopy(SOURCE);d["independent_school2_denial_certified"]=True
        self.assertFalse(V.valid(d))
    def test_no_unapproved_cutover(self):
        d=copy.deepcopy(SOURCE);d["production_release_authorized"]=True
        self.assertFalse(V.valid(d))
    def test_no_forged_production_write(self):
        d=copy.deepcopy(SOURCE);d["production_changed"]=True
        self.assertFalse(V.valid(d))
    def test_real_build_exit_required(self):
        d=copy.deepcopy(SOURCE);d["actual_build_process_exit"]=124
        self.assertFalse(V.valid(d))
    def test_full_postbuild_required(self):
        d=copy.deepcopy(SOURCE);d["full_typescript_and_postbuild_observed"]=False
        self.assertFalse(V.valid(d))
    def test_artifact_list_cannot_omit_login(self):
        d=copy.deepcopy(SOURCE);d["files"].pop(".next/server/app/login/page.js")
        self.assertFalse(V.valid(d))
    def test_artifact_digest_tamper_rejected(self):
        d=copy.deepcopy(SOURCE);d["files"]["eslint.config.mjs"]="0"*64
        self.assertFalse(V.verify(d))
    def test_private_log_missing_fails_closed(self):
        with TemporaryDirectory() as t:
            self.assertFalse(V.verify(SOURCE,base=Path(t)/"missing"))
    def test_stage_missing_fails_closed(self):
        with TemporaryDirectory() as t:
            self.assertFalse(V.verify(SOURCE,stage=Path(t)))
    def test_build_receipt_hash_locked(self):
        d=copy.deepcopy(SOURCE);d["build_exit_record_sha256"]="a"*64
        self.assertFalse(V.verify(d))
if __name__=="__main__":
    unittest.main()
