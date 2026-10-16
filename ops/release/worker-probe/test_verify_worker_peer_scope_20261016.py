#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path
p=Path(__file__).with_name("verify_worker_peer_scope_20261016.py")
spec=importlib.util.spec_from_file_location("peer",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def valid():
    return {"actor":m.ACTOR,"session":m.ACTOR,"login":True,"super":False,"bypass":False,
        "memberships":list(m.EXPECTED_MEMBERSHIPS),"tables":dict(m.EXPECTED_TABLE_RIGHTS),
        "sequences":dict(m.EXPECTED_SEQUENCE_RIGHTS)}
def denied():return {t:"42501" for t in m.DENIED_TABLES}

class WorkerPeerScopeTests(unittest.TestCase):
    def test_valid_is_never_official_release(self):
        v=m.verdict(valid(),denied())
        self.assertEqual(v["status"],"PEER_WORKER_SCOPE_PASS_NOT_RELEASE")
        self.assertFalse(v["releaseAuthorized"])
        self.assertFalse(v["signedWorkerTransportCertified"])
        self.assertFalse(v["signedIndependentSchool2Certified"])
    def test_actor_spoof_denied(self):
        f=valid();f["actor"]="postgres"
        self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_session_spoof_denied(self):
        f=valid();f["session"]="postgres"
        self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_missing_or_extra_role_denied(self):
        for roles in ([],["assps_core_ai_worker","apex_app_runtime"]):
            f=valid();f["memberships"]=roles
            self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_super_bypass_or_disabled_login_denied(self):
        for key,value in (("super",True),("bypass",True),("login",False)):
            f=valid();f[key]=value
            self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_extra_table_acl_denied(self):
        f=valid();f["tables"]["students"]="S"
        self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_view_or_other_schema_acl_denied(self):
        f=valid();f["tables"]["private_schema.insecure_view"]="S"
        self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_missing_queue_acl_denied(self):
        f=valid();f["tables"].pop("public.ai_queue_state")
        self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_extra_sequence_grant_denied(self):
        f=valid();f["sequences"]["student_seq"]={"usage":True,"select":True,"update":False}
        self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_unauthorized_sequence_update_denied(self):
        f=valid();f["sequences"]["public.ai_queue_events_id_seq"]={"usage":True,"select":False,"update":True}
        self.assertEqual(m.verdict(f,denied())["status"],"HOLD")
    def test_missing_real_sql_denial_fails(self):
        d=denied();d["students"]="ZERO_ROWS"
        self.assertEqual(m.verdict(valid(),d)["status"],"HOLD")
    def test_missing_table_denial_fails(self):
        d=denied();d.pop("exam_results")
        self.assertEqual(m.verdict(valid(),d)["status"],"HOLD")
    def test_query_only_readonly_inspection(self):
        self.assertTrue(m.PROBE_SQL.lstrip().startswith("SELECT"))
        self.assertNotIn(";",m.PROBE_SQL)
        self.assertEqual(len(m.DENIED_TABLES),5)
    def test_none_facts_fail_closed(self):
        self.assertEqual(m.verdict(None,denied())["status"],"HOLD")

if __name__=="__main__":unittest.main()
