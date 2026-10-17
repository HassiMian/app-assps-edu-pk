"""No network, no database, no production writes: synthetic unified mission tests."""
from pathlib import Path
import importlib.util
import json
import os
import tempfile
import unittest
from unittest.mock import patch
from datetime import datetime

SPEC = importlib.util.spec_from_file_location("connect_cluster",
    Path(__file__).with_name("verify_unified_core78_mission_20261017.py"))
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)

def fixture():
    tech = {f"pin_{i}": True for i in range(18)}
    status = {"/login": 200, **{f"/api/private/{i}": 401 for i in range(8)}}
    joint = {
        "technical": tech, "core_commit": m.SOURCE["core"],
        "connect_commit":m.SOURCE["connect"],
        "anonymous_http_statuses":status,
        "direct_official_verifier_executed": True,
        "official_core_process_exit":2,
        "production_mutation_performed":False,
        "deployment_executed":False,
        "live_build":"ONDwxEIZlx5onDIKY7wYf",
        "signed_core":{"passed":6,"total":13,"authentic_core_release":False,
             "blocked":list(m.REQUIRED_TRUE)[:7]},
        "decision":"HOLD_NO_PRODUCTION_CUTOVER"
    }
    marks = {
        "status":"SAVED_38_EXACT_SUBJECT_APPROVAL_PENDING",
        "verified_exact_rows":38, "mismatch_count":0,
        "original_four_subject_rows":152, "original_genuine_zeros":6,
        "production_write_performed_by_this_check":False,
        "subject_approved":False,"subject_approval_performed":False
    }
    boot = {
        "status":"STARTUP_RECIPE_CONSISTENT_NOT_SIGNED_RELEASE",
        "approved_stable_build_exists":True,"fallback_backup_valid":True,
        "live_and_persisted_dist":".next","production_modified":False,
        "full_release_authorized":False,"runtime_green_restarts_historical":30947
    }
    api = {
        "status":"HOLD_API_DEPENDENCY_NOT_CERTIFIED",
        "blockers":["HISTORIC_HIGH_RESTART_COUNT_REQUIRES_CORE_REVIEW"],
        "green_restart_count_start":30947,"green_restart_count_end":30947,
        "production_mutation_performed":False, "release_authorized":False,
        "nginx_config_valid":True,"authenticated_teacher_acceptance_verified":False,
    }
    teachers = {
        "status":"HOLD_TEACHER_PRINT_ROLLOUT",
        "counts":{"timetable_rows":58,"timetable_unreviewed_linked_identity":43,
                  "teacher_assignment_active_rows":0},
        "blockers":sorted(m.ALLOWED_TEACHER_BLOCKERS),
        "database_mutation_performed":False,
        "timetable_automatically_grants_print_access":False,
        "authenticated_teacher_acl_verified":False,
        "independent_school2_denial_verified":False,
    }
    return {"joint":joint,"marks":marks,"boot":boot,"api":api,"teachers":teachers}

class ClusterVerifierTests(unittest.TestCase):
    def test_current_realistic_evidence_held_with_eight_nonrelease_facts(self):
        out=m.evaluate(fixture(),{})
        self.assertEqual(out["phase_technical"],{"passed":8,"total":11})
        self.assertEqual(out["decision"],"HOLD_NO_PRODUCTION_CUTOVER")
        self.assertTrue(out["urdu_original_38_saved"])
        self.assertEqual(out["teacher_unreviewed_timetable_links"],43)
        self.assertFalse(out["production_modified"])

    def test_old_1763_results_alternative_not_accepted(self):
        x=fixture();x["marks"]["verified_exact_rows"]=0
        out=m.evaluate(x,{})
        self.assertFalse(out["checks"]["urdu_38_saved_exact_and_old_zeros_preserved"])

    def test_protected_old_152_and_six_zero_must_remain(self):
        for key,value in (("original_four_subject_rows",151),
                          ("original_genuine_zeros",5)):
            x=fixture();x["marks"][key]=value
            self.assertFalse(m.evaluate(x,{})["checks"]["urdu_38_saved_exact_and_old_zeros_preserved"])

    def test_school_timetable_cannot_grant_teacher_print(self):
        x=fixture();x["teachers"]["timetable_automatically_grants_print_access"]=True
        self.assertFalse(m.evaluate(x,{})["checks"]["teacher_acl_not_implicitly_granted"])

    def test_forged_active_assignments_do_not_pass_current_hold(self):
        x=fixture();x["teachers"]["counts"]["teacher_assignment_active_rows"]=43
        self.assertFalse(m.evaluate(x,{})["checks"]["teacher_acl_not_implicitly_granted"])

    def test_green_restart_counter_movement_not_certified(self):
        x=fixture();x["api"]["green_restart_count_end"]=30948
        self.assertFalse(m.evaluate(x,{})["checks"]["api_dependency_operational_not_signed"])

    def test_signed_false_13_of_13_cannot_authorize(self):
        x=fixture();x["joint"]["signed_core"].update({"passed":13,"total":13,"blocked":[]})
        self.assertFalse(m.evaluate(x,{})["independent_core_signed"])
        self.assertEqual(m.evaluate(x,{})["decision"],"HOLD_NO_PRODUCTION_CUTOVER")

    def test_fake_self_signed_ready_status_still_not_deployable(self):
        x=fixture();x["joint"]["signed_core"].update({
            "passed":13,"total":13,"blocked":[],
            "authentic_core_release":True})
        x["joint"]["official_core_process_exit"]=0
        x["joint"]["decision"]="ELIGIBLE_FOR_CORE_OWNER_REVIEW_NOT_DEPLOYED"
        self.assertTrue(m.evaluate(x,{})["independent_core_signed"])
        self.assertEqual(m.evaluate(x,{})["decision"],"HOLD_NO_PRODUCTION_CUTOVER")
        self.assertFalse(m.evaluate(x,{})["physical_print_verified"])

    def test_stale_core_source_rejected(self):
        x=fixture();x["joint"]["core_commit"]="58a111c82e4e2051ecab08960cf4c68c25085a24"
        self.assertFalse(m.evaluate(x,{})["checks"]["crossstream_technical_18_exact"])

    def test_extra_or_missing_technical_gates_denied(self):
        x=fixture();x["joint"]["technical"]["unexpected"]=True
        self.assertFalse(m.evaluate(x,{})["checks"]["crossstream_technical_18_exact"])
        x=fixture();x["joint"]["technical"].pop("pin_3")
        self.assertFalse(m.evaluate(x,{})["checks"]["crossstream_technical_18_exact"])

    def test_production_mutation_flag_fails_closed(self):
        x=fixture();x["joint"]["production_mutation_performed"]=True
        self.assertFalse(m.evaluate(x,{})["checks"]["no_cutover_no_live_mutation"])

    def test_cross_tenant_api_401_still_only_anonymous(self):
        x=fixture();x["joint"]["anonymous_http_statuses"]["/api/private/4"]=200
        self.assertFalse(m.evaluate(x,{})["checks"]["current_anonymous_boundary"])
        x=fixture();self.assertTrue(m.evaluate(x,{})["checks"]["current_anonymous_boundary"])
        self.assertFalse(m.evaluate(x,{})["checks"]["real_authenticated_teacher_acceptance_signed"])

    def test_reader_rejects_unknown_and_missing_receipt(self):
        with tempfile.TemporaryDirectory() as path:
            base=Path(path);os.chmod(base,0o700)
            self.assertEqual(m.read_private_receipt("unknown",base)[1],"UNKNOWN_EVIDENCE_TYPE")
            self.assertEqual(m.read_private_receipt("marks",base)[1],"EVIDENCE_UNREADABLE")

    def test_reader_rejects_world_readable_symlink_and_expired(self):
        import time
        with tempfile.TemporaryDirectory() as path:
            root=Path(path);os.chmod(root,0o700)
            p=root/m.EXPECTED["marks"]
            p.write_text(json.dumps(fixture()["marks"]))
            os.chmod(p,0o644)
            self.assertEqual(m.read_private_receipt("marks",root)[1],
                             "UNTRUSTED_PRIVATE_FILE_METADATA")
            os.chmod(p,0o600)
            if os.geteuid() == 0:
                self.assertEqual(m.read_private_receipt("marks",root)[0]["verified_exact_rows"],38)
                self.assertEqual(m.read_private_receipt("marks",root,now=p.stat().st_mtime+4000)[1],
                                 "EXPIRED_OR_FUTURE_EVIDENCE")
            else:
                # Hosted Actions runs without root: a runner-owned JSON
                # must NEVER masquerade as a root-protected VPS witness.
                self.assertEqual(m.read_private_receipt("marks",root)[1],
                                 "UNTRUSTED_PRIVATE_FILE_METADATA")
            p.unlink();p.symlink_to(__file__)
            self.assertEqual(m.read_private_receipt("marks",root)[1],
                             "UNTRUSTED_PRIVATE_FILE_METADATA")

    def test_reader_rejects_group_readable_private_directory(self):
        with tempfile.TemporaryDirectory() as path:
            root=Path(path);os.chmod(root,0o750)
            p=root/m.EXPECTED["marks"]
            p.write_text('{"status":"HOLD"}')
            os.chmod(p,0o600)
            self.assertEqual(m.read_private_receipt("marks",root)[1],
                             "UNTRUSTED_PRIVATE_FILE_METADATA")

    def test_output_never_contains_raw_records(self):
        x=fixture()
        x["marks"]["studentName"]="DO_NOT_OUTPUT_PERSONAL_RECORD"
        out=json.dumps(m.evaluate(x,{}))
        self.assertNotIn("DO_NOT_OUTPUT_PERSONAL_RECORD",out)
        self.assertNotIn("studentName",out)

if __name__ == "__main__":
    unittest.main()
