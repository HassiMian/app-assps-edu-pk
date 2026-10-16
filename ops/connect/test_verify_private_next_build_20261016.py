#!/usr/bin/env python3
import copy
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

p=Path(__file__).with_name("verify_private_next_build_20261016.py")
spec=importlib.util.spec_from_file_location("qa_verifier", p)
v=importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)
SOURCE=json.loads(v.MANIFEST.read_text())

class QA(unittest.TestCase):
    def test_manifest_passes(self):
        self.assertTrue(v.valid(SOURCE))
    def test_bad_build_denied(self):
        x=copy.deepcopy(SOURCE);x["build_id"]="old"
        self.assertFalse(v.valid(x))
    def test_bad_source_denied(self):
        x=copy.deepcopy(SOURCE);x["source_commit"]="0"*40
        self.assertFalse(v.valid(x))
    def test_missing_route_artifact_denied(self):
        x=copy.deepcopy(SOURCE);x["artifacts"].pop(".next/server/app/api/auth/me/route.js")
        self.assertFalse(v.valid(x))
    def test_bad_digest_denied(self):
        x=copy.deepcopy(SOURCE);x["artifacts"]["eslint.config.mjs"]="wrong"
        self.assertFalse(v.valid(x))
    def test_fake_authenticated_acceptance_denied(self):
        x=copy.deepcopy(SOURCE);x["independent_security_certified"]=True
        self.assertFalse(v.valid(x))
    def test_fake_release_denied(self):
        x=copy.deepcopy(SOURCE);x["production_release_authorized"]=True
        self.assertFalse(v.valid(x))
    def test_fake_optimized_build_exit_denied(self):
        x=copy.deepcopy(SOURCE);x["optimized_build_exit_zero_confirmed"]=True
        self.assertFalse(v.valid(x))
    def test_fake_data_mutation_denied(self):
        x=copy.deepcopy(SOURCE);x["production_changed"]=True
        self.assertFalse(v.valid(x))
    def test_empty_stage_denied(self):
        with TemporaryDirectory() as t:
            self.assertFalse(v.verify(Path(t),SOURCE))
if __name__=="__main__":
    unittest.main()
