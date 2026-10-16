#!/usr/bin/env python3
"""Pure stage/rollback fail-closed tests. No VPS reads, writes, or Git/network access."""
import copy
import importlib.util
from pathlib import Path
import unittest

s=importlib.util.spec_from_file_location("stage",Path(__file__).with_name("verify_reviewed_worker_dml_stage_20261016.py"))
a=importlib.util.module_from_spec(s)
s.loader.exec_module(a)

def baseline():
    shas={x:"overlay-good-"+str(i) for i,x in enumerate(a.FILES)}
    original={x:"rollback-good-"+str(i) for i,x in enumerate(a.ORIGINALS)}
    manifest={
      "schema":"ASSPS_CORE_WORKER_DML_PRIVATE_OVERLAY_V1",
      "decision":"REVIEW_OVERLAY_NOT_DEPLOYED",
      "source_commit":a.PIN,"stage":str(a.ROOT),"overlays":shas.copy(),
      "original_live_hashes":original.copy(),"original_archive_sha256":"archive-good",
      "production_changed":False,"database_changed":False,
      "runtime_secrets_copied":False,"release_authorized":False,"signed_certified":False
    }
    return manifest,shas,original,"archive-good"

class PrivateStageTests(unittest.TestCase):
    def test_baseline(self):
        x=baseline();self.assertEqual(a.check_snapshot(*x,True),[])
    def test_not_private(self):
        self.assertIn("PRIVATE_PERMISSIONS",a.check_snapshot(*baseline(),False))
    def test_changed_source_pin(self):
        m,s,o,b=baseline();m["source_commit"]="different"
        self.assertIn("SOURCE_PIN_OR_STAGE_PATH",a.check_snapshot(m,s,o,b,True))
    def test_wrong_stage_path(self):
        m,s,o,b=baseline();m["stage"]="/var/www/apex-backend"
        self.assertIn("SOURCE_PIN_OR_STAGE_PATH",a.check_snapshot(m,s,o,b,True))
    def test_drifted_stage_blob(self):
        m,s,o,b=baseline();s[next(iter(s))]="modified"
        self.assertIn("OVERLAY_SHA",a.check_snapshot(m,s,o,b,True))
    def test_missing_worker_overlay(self):
        m,s,o,b=baseline();s.pop(next(iter(s)))
        self.assertIn("OVERLAY_SET",a.check_snapshot(m,s,o,b,True))
    def test_overridden_release_flag(self):
        m,s,o,b=baseline();m["release_authorized"]=True
        self.assertIn("RELEASE_SAFETY_FLAGS",a.check_snapshot(m,s,o,b,True))
    def test_fake_signed_flag(self):
        m,s,o,b=baseline();m["signed_certified"]=True
        self.assertIn("RELEASE_SAFETY_FLAGS",a.check_snapshot(m,s,o,b,True))
    def test_original_rollback_drift(self):
        m,s,o,b=baseline();o[next(iter(o))]="new live bytes"
        self.assertIn("ORIGINAL_SHA",a.check_snapshot(m,s,o,b,True))
    def test_rollback_archive_drift(self):
        m,s,o,b=baseline()
        self.assertIn("ORIGINAL_ARCHIVE_SHA",a.check_snapshot(m,s,o,"wrong",True))
    def test_unexpected_original(self):
        m,s,o,b=baseline();o["secret.env"]="bad"
        self.assertIn("ORIGINAL_SHA",a.check_snapshot(m,s,o,b,True))
    def test_schema_change(self):
        m,s,o,b=baseline();m["schema"]="bypass-check"
        self.assertIn("SCHEMA",a.check_snapshot(m,s,o,b,True))

if __name__=="__main__":
    unittest.main()
