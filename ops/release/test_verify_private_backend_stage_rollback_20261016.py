#!/usr/bin/env python3
"""Hermetic adversarial tests: no production DB, file copies or service starts."""
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name("verify_private_backend_stage_rollback_20261016.py")
spec=importlib.util.spec_from_file_location("stage",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def bundle():
    hs={x:f"sha-{x}" for x in m.OVERLAYS}
    live={x:f"live-{x}" for x in m.ORIGINALS}
    return (
        {"decision":"PRIVATE_STAGE_READY_NOT_DEPLOYED","source_commit":m.EXPECTED_STAGE_SOURCE,
         "stage":m.ROOT_STAGE,"production_backend_changed":False,"database_changed":False,
         "runtime_secrets_copied":False,"reviewed_files":5,"stage_shas":dict(hs),
         "original_live_hashes":dict(live)},
         hs,live,dict(live),list(m.ORIGINALS),True,dict(hs),False)
def check(*args):
    return m.check(*args)["status"]
class ArchiveGateTests(unittest.TestCase):
    def test_repo_root_points_to_our_real_project(self):
        self.assertEqual(m.SOURCE.parents[1],Path(__file__).resolve().parents[2])
    def test_pass_does_not_certify_release(self):
        x=m.check(*bundle())
        self.assertEqual(x["status"],"PRIVATE_STAGE_ROLLBACK_PARITY_PASS_NOT_RELEASE")
        self.assertFalse(x["releaseAuthorized"])
        self.assertFalse(x["independentOffhostRecoveryCertified"])
    def test_stage_sha_tampering_denied(self):
        a=list(bundle());a[1]["routes/opsRoutes.js"]="tampered"
        self.assertEqual(check(*a),"HOLD")
    def test_source_sha_changed_denied(self):
        a=list(bundle());a[6]["routes/opsRoutes.js"]="new"
        self.assertEqual(check(*a),"HOLD")
    def test_live_sha_drift_denied(self):
        a=list(bundle());a[2]["routes/opsRoutes.js"]="new"
        self.assertEqual(check(*a),"HOLD")
    def test_archive_sha_drift_denied(self):
        a=list(bundle());a[3]["routes/opsRoutes.js"]="new"
        self.assertEqual(check(*a),"HOLD")
    def test_archive_entry_added_denied(self):
        a=list(bundle());a[4].append("hidden_student_records.json")
        self.assertEqual(check(*a),"HOLD")
    def test_stage_provenance_tampering_denied(self):
        a=list(bundle());a[0]["source_commit"]="older"
        self.assertEqual(check(*a),"HOLD")
    def test_existing_live_adapter_denied(self):
        a=list(bundle());a[7]=True
        self.assertEqual(check(*a),"HOLD")
    def test_leaked_permission_denied(self):
        a=list(bundle());a[5]=False
        self.assertEqual(check(*a),"HOLD")
    def test_mutated_database_denied(self):
        a=list(bundle());a[0]["database_changed"]=True
        self.assertEqual(check(*a),"HOLD")
    def test_runtime_secret_copy_denied(self):
        a=list(bundle());a[0]["runtime_secrets_copied"]=True
        self.assertEqual(check(*a),"HOLD")
    def test_missing_overlay_denied(self):
        a=list(bundle());a[1].pop("services/ai/aiQueueWorkerDatabase.js")
        self.assertEqual(check(*a),"HOLD")
    def test_bad_archive_scope_denied(self):
        a=list(bundle());a[3].pop("routes/opsRoutes.js")
        self.assertEqual(check(*a),"HOLD")
    def test_fail_closed_missing_manifest(self):
        a=list(bundle());a[0]={}
        self.assertEqual(check(*a),"HOLD")
if __name__=="__main__":unittest.main()
