import importlib.util
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "assps_academic_release_gate.py"
spec = importlib.util.spec_from_file_location("academic_gate", SOURCE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

def fixture():
    return {
        "cohorts": [
            {"className": "Pre Nine", "section": "Blue", "students": 12, "verifiedSubjects": 8},
            {"className": "Nine", "section": "Usman", "students": 9, "verifiedSubjects": 8},
        ],
        "configuredSubjectRows": 0, "approvedSubjectOfferings": 12,
        "assessment1to4": [4, 18, 100], "assessment5Headers": 1,
        "firstTermRows": 1854, "firstTermSHA256": gate.BASELINE_RESULTS_SHA256,
        "originalBrowser49Verified": True, "liveAttendanceUnsafeShells": 0,
        "attendanceCandidateDeployed": True, "principalTeacherAttendanceAccepted": True,
        "attendancePublishedMatrixCertified": True, "rollbackProven": True,
        "independentOffhostFullRestoreCertified": True, "diskFreeGiB": 16.001,
        "staffSignaturesVerified": True, "repositoryOwnershipCertified": True,
        "appRoleOwnedProtectedRls": {"forceRls": 73, "total": 73},
        "appDatabaseOwnerDdlPrivilegeRetired": True,
    }

class TestReleaseGate(unittest.TestCase):
    def test_clear_synthetic_fixture_not_real_production(self):
        self.assertEqual(gate.evaluate(fixture())["release"], "READY_FOR_INDEPENDENT_SIGNOFF")

    def test_missing_teacher_evidence_must_hold(self):
        d = fixture()
        d["cohorts"][0]["verifiedSubjects"] = 0
        r = gate.evaluate(d)
        self.assertEqual(r["studentsMissingScope"], 12)
        self.assertIn("TEACHER_SCOPE_EVIDENCE", [x["id"] for x in r["blockers"]])

    def test_pre_nine_cannot_merge_with_nine(self):
        d = fixture()
        d["cohorts"][0]["verifiedSubjects"] = 0
        result = gate.evaluate(d)
        self.assertEqual(result["missingClassSections"][0]["className"], "Pre Nine")
        self.assertEqual(result["studentsMissingScope"], 12)

    def test_approved_offerings_required(self):
        d = fixture()
        d["approvedSubjectOfferings"] = 0
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_assessment_offerings_required(self):
        d = fixture()
        d["assessment1to4"][1] = 0
        self.assertIn("ASSESSMENT_1_4_OFFERINGS_AND_MARKS", [b["id"] for b in gate.evaluate(d)["blockers"]])

    def test_assessment_results_required(self):
        d = fixture()
        d["assessment1to4"][2] = 0
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_assessment5_header_required(self):
        d = fixture()
        d["assessment5Headers"] = 0
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_historical_row_count_pinned(self):
        d = fixture()
        d["firstTermRows"] = 1853
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_historical_digest_pinned(self):
        d = fixture()
        d["firstTermSHA256"] = "0" * 64
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_original_browser_paper_provenance_required(self):
        d = fixture()
        d["originalBrowser49Verified"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_attendance_unsafe_shell_blocks(self):
        d = fixture()
        d["liveAttendanceUnsafeShells"] = 4
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_attendance_not_deployed_blocks(self):
        d = fixture()
        d["attendanceCandidateDeployed"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_principal_attendance_acceptance_required(self):
        d = fixture()
        d["principalTeacherAttendanceAccepted"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_published_matrix_required(self):
        d = fixture()
        d["attendancePublishedMatrixCertified"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_rollback_required(self):
        d = fixture()
        d["rollbackProven"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_offhost_restore_required(self):
        d = fixture()
        d["independentOffhostFullRestoreCertified"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_disk_just_below_threshold(self):
        d = fixture()
        d["diskFreeGiB"] = 15.999
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_disk_at_threshold(self):
        d = fixture()
        d["diskFreeGiB"] = 16
        self.assertEqual(gate.evaluate(d)["release"], "READY_FOR_INDEPENDENT_SIGNOFF")

    def test_staff_signatures_required(self):
        d = fixture()
        d["staffSignaturesVerified"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_canonical_repo_provenance_required(self):
        d = fixture()
        d["repositoryOwnershipCertified"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_force_rls_required_for_all_app_owned_tables(self):
        d = fixture()
        d["appRoleOwnedProtectedRls"] = {"forceRls": 72, "total": 73}
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_force_rls_not_equivalent_to_ddl_ownership(self):
        d = fixture()
        d["appDatabaseOwnerDdlPrivilegeRetired"] = False
        self.assertEqual(gate.evaluate(d)["release"], "HOLD")

    def test_empty_cohorts_invalid(self):
        with self.assertRaises(ValueError):
            gate.parse_cohorts([])

    def test_duplicate_cohort_invalid(self):
        with self.assertRaises(ValueError):
            gate.parse_cohorts(["SOURCE|Pre Nine|Blue|12|1|1|1", "SOURCE|Pre Nine|Blue|12|1|1|1"])

    def test_negative_count_invalid(self):
        with self.assertRaises(ValueError):
            gate.parse_cohorts(["SOURCE|Pre Nine|Blue|-1|0|0|0"])

    def test_ambiguous_identity_invalid(self):
        with self.assertRaises(ValueError):
            gate.parse_cohorts(["SOURCE||Blue|12|0|0|0"])

    def test_field_count_invalid(self):
        with self.assertRaises(ValueError):
            gate.parse_cohorts(["SOURCE|Nine|Usman|9|8|48"])

    def test_readonly_queries_have_rollback(self):
        for filename in ("a214_cohort_evidence.sql", "a214_subject_config.sql"):
            data = (gate.SQL_DIR / filename).read_text()
            self.assertTrue(data.startswith("BEGIN READ ONLY;"))
            self.assertTrue(data.rstrip().endswith("ROLLBACK;"))
        self.assertTrue(gate.EVIDENCE_SQL.lstrip().startswith("BEGIN READ ONLY;"))
        self.assertTrue(gate.EVIDENCE_SQL.rstrip().endswith("ROLLBACK;"))

    def test_production_never_uses_external_fixture(self):
        self.assertNotIn("--fixture", SOURCE.read_text())
        self.assertNotIn("--override-release", SOURCE.read_text())
        self.assertNotIn("UPDATE students", SOURCE.read_text())

if __name__ == "__main__":
    unittest.main()
