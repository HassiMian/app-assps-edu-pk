"""Adversarial A217 capacity and recovery gate tests. All synthetic and no live writes."""
import importlib.util
from pathlib import Path
import copy
import unittest

SRC = Path(__file__).resolve().parents[1] / "a217_capacity_disaster_recovery_gate.py"
spec = importlib.util.spec_from_file_location("a217", SRC)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
S = "9" * 64

def fixtures():
    dr = {
      "fullDataRestoreCompleted": True,
      "sourceAndRestoredDataAggregatesIdentical": True,
      "sourceAndRestoredObjectOwnerEffectiveAclRoleShapeAndPolicyMetadataIdentical": True,
      "metadataCanonicalRowCount": 610,
      "sourceCanonicalCatalogSha256": S,
      "restoredCanonicalCatalogSha256": S,
      "canonicalCatalogSha256": S,
      "localIsolatedClusterStopped": True,
      "temporaryClusterAndFullDataArchiveDeleted": True,
      "productionDatabaseModifiedByRestore": False,
      "rolePasswordsRestoredOrTested": True,
      "offHostRestoreCertified": True,
      "crossDeviceKeyMaterialRestored": True,
    }
    school = {"result":{"release":"READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW","blockerCount":0}}
    windows = {"freeGiB":12.0,"independentOffhostRestorePerformed":True,
      "postgresqlInstalled":True,"paperOrDatabaseContentsTransferred":True}
    return [dr,school,windows]

def evaluate(entities, disk=16, temp=False):
    return gate.inspect(*entities,disk_free_gib=disk,dr_temp_exists=temp)

def required(records, gate_code, **kwargs):
    result = evaluate(records, **kwargs)
    assert result["release"] == "HOLD", result
    assert gate_code in [x["gate"] for x in result["blockers"]], result
    return result

class A217SafetyTests(unittest.TestCase):
    def test_synthetic_all_green_only_allows_human_review_not_deploy(self):
        x=evaluate(fixtures())
        self.assertEqual(x["release"],"READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW")
        self.assertEqual(x["productionDeployments"],0)
        self.assertEqual(x["sameVpsDataAndEffectiveRoleAclDrill"],"PASS")
    def test_current_snapshot_from_older_mission_not_verified_as_offhost(self):
        d=fixtures();d[0]["offHostRestoreCertified"]=False
        required(d,"FULL_OFFHOST_DR")
    def test_partial_data_not_certified(self):
        d=fixtures();d[0]["fullDataRestoreCompleted"]=False
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_data_aggregate_drift(self):
        d=fixtures();d[0]["sourceAndRestoredDataAggregatesIdentical"]=False
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_owner_acl_drift(self):
        d=fixtures();d[0]["sourceAndRestoredObjectOwnerEffectiveAclRoleShapeAndPolicyMetadataIdentical"]=False
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_metadata_catalog_610_rows_required(self):
        d=fixtures();d[0]["metadataCanonicalRowCount"]=609
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_source_restore_digest_mismatch(self):
        d=fixtures();d[0]["restoredCanonicalCatalogSha256"]="8"*64
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_unpinned_different_primary_digest(self):
        d=fixtures();d[0]["canonicalCatalogSha256"]="8"*64
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_truncated_catalog_sha(self):
        d=fixtures();d[0]["sourceCanonicalCatalogSha256"]="9"*63
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_non_hex_catalog_sha(self):
        d=fixtures();d[0]["sourceCanonicalCatalogSha256"]="z"*64
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_temp_cluster_retained_denies_acceptance(self):
        d=fixtures()
        required(d,"SAME_HOST_ROLE_ACL_PARITY",temp=True)
    def test_cluster_not_stopped(self):
        d=fixtures();d[0]["localIsolatedClusterStopped"]=False
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_temp_dump_not_deleted(self):
        d=fixtures();d[0]["temporaryClusterAndFullDataArchiveDeleted"]=False
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_production_db_modified(self):
        d=fixtures();d[0]["productionDatabaseModifiedByRestore"]=True
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_role_passwords_untested(self):
        d=fixtures();d[0]["rolePasswordsRestoredOrTested"]=False
        required(d,"LOGIN_SECRET_RESTORATION")
    def test_cross_device_keys_missing(self):
        d=fixtures();d[0]["crossDeviceKeyMaterialRestored"]=False
        required(d,"CROSS_DEVICE_KEYS")
    def test_disk_one_byte_under_threshold(self):
        d=fixtures()
        required(d,"VPS_DISK_CAPACITY",disk=15.999)
    def test_disk_exactly_16_allowed(self):
        d=fixtures()
        self.assertEqual(evaluate(d,disk=16)["release"],"READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW")
    def test_missing_academic_release(self):
        d=fixtures();d[1]["result"]["release"]="HOLD"
        required(d,"EXISTING_ACADEMIC_AND_ATTENDANCE_RELEASE_HOLD")
    def test_one_prior_blocker(self):
        d=fixtures();d[1]["result"]["blockerCount"]=1
        required(d,"EXISTING_ACADEMIC_AND_ATTENDANCE_RELEASE_HOLD")
    def test_windows_low_disk_warning_but_not_global_certification(self):
        d=fixtures();d[2]["freeGiB"]=2.21
        x=evaluate(d)
        self.assertIn("WINDOWS_LOW_FREE_SPACE",[i["code"] for i in x["warnings"]])
        self.assertEqual(x["release"],"READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW")
    def test_windows_pg_not_available_warning(self):
        d=fixtures();d[2]["postgresqlInstalled"]=False
        x=evaluate(d)
        self.assertIn("WINDOWS_NOT_VERIFIED_AS_OFFHOST_DR_TARGET",[i["code"] for i in x["warnings"]])
    def test_windows_has_no_data_transfer_warning(self):
        d=fixtures();d[2]["paperOrDatabaseContentsTransferred"]=False
        self.assertTrue(evaluate(d)["warnings"])
    def test_malformed_windows_space_warns_not_pass_fraud(self):
        d=fixtures();d[2]["freeGiB"]="unknown"
        self.assertTrue(evaluate(d)["warnings"])
    def test_null_dr_fields_fail_closed(self):
        d=fixtures();d[0]={}
        required(d,"SAME_HOST_ROLE_ACL_PARITY")
    def test_missing_school_authority_fails(self):
        d=fixtures();d[1]={}
        required(d,"EXISTING_ACADEMIC_AND_ATTENDANCE_RELEASE_HOLD")
    def test_same_host_success_distinct_from_offhost_success(self):
        d=fixtures();d[0]["offHostRestoreCertified"]=False
        x=evaluate(d)
        self.assertEqual(x["sameVpsDataAndEffectiveRoleAclDrill"],"PASS")
        self.assertEqual(x["release"],"HOLD")
    def test_no_write_commands_in_readonly_gate(self):
        s=SRC.read_text()
        for bad in ("UPDATE students","INSERT INTO","DELETE FROM","DROP TABLE","pg_restore --clean"):
            self.assertNotIn(bad,s)
    def test_canonical_acl_comparison_normalizes_implicit_owner_defaults(self):
        s=(SRC.parent/"experiments/a217_same_host_owner_acl_drill.sh").read_text()
        self.assertIn("acldefault(CASE WHEN c.relkind",s)
        self.assertIn("COALESCE(c.relacl,acldefault",s)
    def test_dr_shell_never_restores_on_prod_socket(self):
        s=(SRC.parent/"experiments/a217_same_host_owner_acl_drill.sh").read_text()
        self.assertIn("--no-role-passwords",s)
        self.assertIn("-h \"$SOCK\" -p \"$PORT\" -C -d postgres",s)
        self.assertIn("listen_addresses=''",s)
        self.assertIn("BEGIN READ ONLY;",s)
        self.assertIn("rm -rf -- \"$T\"",s)
        self.assertNotIn("pg_restore --clean -d apexos",s)
    def test_archive_is_not_persisted_into_git_review_tree(self):
        s=(SRC.parent/"experiments/a217_same_host_owner_acl_drill.sh").read_text()
        self.assertIn("/tmp/assps-a217-isolated-dr-",s)
        self.assertIn('runuser -u postgres -- pg_dump',s)
        self.assertIn("trap cleanup EXIT",s)
if __name__=="__main__":
    unittest.main()
