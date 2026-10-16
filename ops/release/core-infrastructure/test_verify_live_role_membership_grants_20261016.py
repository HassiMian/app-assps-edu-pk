#!/usr/bin/env python3
"""Adversarial hermetic safety tests. No database network, live credentials or records."""
import copy
import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location(
    "role_graph",Path(__file__).with_name("verify_live_role_membership_grants_20261016.py"))
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def fixture():
    return {
       "roles":[{"name":name,"login":name in module.ACTORS,
                 "super":False,"bypass":False,
                 "create_role":False,"create_db":False,"replicate":False}
                for name in module.ROLES],
       "edges":[{"member":name,"granted":role,"inherit":inh,
                 "set":can_set,"admin":False}
                for name,(role,inh,can_set) in module.ACTORS.items()],
       "grants":[{"role":name,"table":table,
                  "rights":(module.EXPECTED_QUEUE.get(table,"") if name in (
                      "assps_ai_worker_login","assps_core_ai_worker") else
                   "SIUD" if name in ("assps_core_green_runtime","assps_marks_signed_runtime")
                       and table in ("students","exam_results") else "")}
                 for name in module.ROLES for table in module.TABLES],
       "protected":[{"table":t,"rls":True,"force":True}
                    for t in ("students","exam_results")]
    }


class RoleGraphTest(unittest.TestCase):
    def check_rejected(self, data, issue):
        self.assertIn(issue,module.evaluate(data))

    def test_baseline_is_pure(self):
        a=fixture()
        orig=copy.deepcopy(a)
        self.assertEqual(module.evaluate(a),[])
        self.assertEqual(a,orig)

    def test_missing_actor(self):
        a=fixture();a["roles"].pop()
        self.check_rejected(a,"MISSING_OR_DUPLICATE_ROLE")

    def test_superuser_login(self):
        a=fixture();a["roles"][0]["super"]=True
        self.assertTrue(any("UNSAFE_ROLE_ATTRIBUTE" in x for x in module.evaluate(a)))

    def test_bypassrls_runtime(self):
        a=fixture()
        x=next(r for r in a["roles"] if r["name"]=="assps_marks_signed_runtime")
        x["bypass"]=True
        self.check_rejected(a,"UNSAFE_ROLE_ATTRIBUTE:assps_marks_signed_runtime:bypass")

    def test_login_privilege_escalation(self):
        a=fixture()
        a["grants"][next(i for i,v in enumerate(a["grants"]) if
                         v["role"]=="assps_marks_signed_login" and v["table"]=="students")]["rights"]="S"
        self.check_rejected(a,"EFFECTIVE_GRANT_DRIFT:assps_marks_signed_login:students")

    def test_worker_can_read_student_data(self):
        a=fixture()
        a["grants"][next(i for i,v in enumerate(a["grants"]) if
                         v["role"]=="assps_core_ai_worker" and v["table"]=="exam_results")]["rights"]="S"
        self.check_rejected(a,"EFFECTIVE_GRANT_DRIFT:assps_core_ai_worker:exam_results")

    def test_missing_signed_crud_right(self):
        a=fixture()
        a["grants"][next(i for i,v in enumerate(a["grants"]) if
                         v["role"]=="assps_core_green_runtime" and v["table"]=="students")]["rights"]="SIU"
        self.check_rejected(a,"EFFECTIVE_GRANT_DRIFT:assps_core_green_runtime:students")

    def test_extra_membership(self):
        a=fixture()
        a["edges"].append({"member":"assps_core_green_login","granted":"pg_read_all_data",
                           "inherit":True,"set":True,"admin":False})
        self.check_rejected(a,"ROLE_MEMBERSHIP_DRIFT")

    def test_admin_option(self):
        a=fixture();a["edges"][0]["admin"]=True
        self.check_rejected(a,"UNEXPECTED_ROLE_ADMIN_OPTION")

    def test_unsafe_worker_can_set_role(self):
        a=fixture()
        a["edges"][0]["set"]=True
        self.check_rejected(a,"ROLE_MEMBERSHIP_DRIFT")

    def test_lost_force_rls(self):
        a=fixture();a["protected"][0]["force"]=False
        self.check_rejected(a,"RESULT_STUDENT_FORCE_RLS_DRIFT")

    def test_missing_table_grant(self):
        a=fixture();a["grants"].pop()
        self.check_rejected(a,"MISSING_OR_EXTRA_GRANT_ROW")

    def test_bad_evidence_shape(self):
        self.check_rejected({"roles":[],"edges":None,"grants":[],
                             "protected":[]},"MALFORMED_EVIDENCE")

    def test_duplicate_grants(self):
        a=fixture();a["grants"].append(a["grants"][0].copy())
        self.check_rejected(a,"DUPLICATE_GRANT")

    def test_missing_pg_role_field_fails_closed(self):
        a=fixture();a["roles"][0].pop("replicate")
        self.assertTrue(any("UNSAFE_ROLE_ATTRIBUTE" in x for x in module.evaluate(a)))


if __name__=="__main__":
    unittest.main()
