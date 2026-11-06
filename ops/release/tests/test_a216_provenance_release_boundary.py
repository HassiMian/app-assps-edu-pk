"""A216 release guard adversarial fixtures; no production writes."""
import importlib.util
from pathlib import Path
import copy
import unittest
import datetime as dt
S=Path(__file__).resolve().parents[1]/"assps_a216_provenance_release_boundary.py"
spec=importlib.util.spec_from_file_location("a216",S)
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
def good():
    forensic={"originalBrowserProfileModifiedByAudit":False,
      "unionDistinctPaperIds":58,"sameIdDifferentContentBetweenDefault49AndProfile1_58":7,
      "principalApprovedConflictDisposition":True,"newPaperIdsOnlyIn58":9,
      "principalApprovedAdditionalPaperDisposition":True,
      "dpapiPreservation":{"encryptedLocalFiles":4,"allFourDecryptAndShaRoundTripsVerified":True,"portableOffhostRestore":True},
      "originalSnapshotsAutomaticallyMerged":False,"plaintextPaperContentsTransferredToVps":False,
      "principalRoleReauthenticationPerformed":True,"originalFullEditablePaperSaasRestorePerformed":True}
    restore={"pgRestoreExitZero":True,"sourceAndCloneReadOnlyAggregatesIdentical":True,
      "offhostRestoreCertified":True,"ownershipAndAclRecreated":True,
      "globalRolePasswordRestorationTested":True,"productionDatabaseNeverModifiedByRestore":True}
    published={"entryModulesConfirmed":4,"attendanceModuleUnsafeFallbackDirectImports":0,
      "attendanceModuleImportMapOverrideCount":0,"sourceCandidateDeployed":True,
      "importMapReplacementObservedInBrowser":True}
    academic={"evidence":{"firstTermRows":1854,"firstTermSHA256":g.BASELINE_SHA,"diskFreeGiB":16},
      "result":{"release":"READY_FOR_INDEPENDENT_SIGNOFF","blocked":0}}
    certified={"observedFull40Minutes":True,"fullDurationCyclesFailed":0,"fullDurationCyclesPassed":189}
    privileges={"databaseCreate":False,"publicSchemaCreate":False,"appOwnedProtectedRlsTables":0,"appOwnedProtectedForceRls":0}
    return dict(forensic=forensic,restore=restore,published=published,academic=academic,certified=certified,privileges=privileges,windows_local_confirmed=True)
def run(d):return g.evaluate_evidence(**d)
def holds(d, code):
    x=run(d)
    assert x["release"]=="HOLD",(code,x)
    assert code in {b["gate"] for b in x["blockers"]},(code,x)
class TestA216(unittest.TestCase):
    def test_synthetic_fully_approved_fixture_ready_for_review_not_deployment(self):
        x=run(good())
        self.assertEqual(x["release"],"READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW")
        self.assertEqual(x["productionDeployments"],0)
    def test_missing_original_windows_confirmation(self):
        d=good();d["windows_local_confirmed"]=False;holds(d,"ORIGINAL_DEVICE_PRESENT")
    def test_original_browser_modified(self):
        d=good();d["forensic"]["originalBrowserProfileModifiedByAudit"]=True;holds(d,"FORENSIC_READ_ONLY")
    def test_unknown_id_inventory(self):
        d=good();d["forensic"]["unionDistinctPaperIds"]=57;holds(d,"UNION_ID_BASELINE")
    def test_unexpected_revision_diff_count(self):
        d=good();d["forensic"]["sameIdDifferentContentBetweenDefault49AndProfile1_58"]=8;holds(d,"SOURCE_REVISIONS_CONFLICT")
    def test_revisions_unapproved(self):
        d=good();d["forensic"]["principalApprovedConflictDisposition"]=False;holds(d,"REVISION_CONFLICT_APPROVAL")
    def test_seven_known_conflicts_still_require_review(self):
        d=good();d["forensic"]["sameIdDifferentContentBetweenDefault49AndProfile1_58"]=7;d["forensic"]["principalApprovedConflictDisposition"]=False;holds(d,"REVISION_CONFLICT_APPROVAL")
    def test_new_id_count_drift(self):
        d=good();d["forensic"]["newPaperIdsOnlyIn58"]=8;holds(d,"ADDITIONAL_PAPER_IDS")
    def test_unapproved_new_ids(self):
        d=good();d["forensic"]["principalApprovedAdditionalPaperDisposition"]=False;holds(d,"ADDITIONAL_PAPER_APPROVAL")
    def test_nine_new_ids_cannot_automerge(self):
        d=good();d["forensic"]["newPaperIdsOnlyIn58"]=9;d["forensic"]["principalApprovedAdditionalPaperDisposition"]=False;holds(d,"ADDITIONAL_PAPER_APPROVAL")
    def test_less_than_four_dpapi_files(self):
        d=good();d["forensic"]["dpapiPreservation"]["encryptedLocalFiles"]=3;holds(d,"WINDOWS_LOCAL_SNAPSHOTS")
    def test_unverified_crypto_roundtrip(self):
        d=good();d["forensic"]["dpapiPreservation"]["allFourDecryptAndShaRoundTripsVerified"]=False;holds(d,"WINDOWS_LOCAL_SNAPSHOTS")
    def test_silent_browser_merge(self):
        d=good();d["forensic"]["originalSnapshotsAutomaticallyMerged"]=True;holds(d,"NOT_AUTOMERGED")
    def test_plaintext_server_transfer(self):
        d=good();d["forensic"]["plaintextPaperContentsTransferredToVps"]=True;holds(d,"NOT_AUTOMERGED")
    def test_no_principal_reauthentication(self):
        d=good();d["forensic"]["principalRoleReauthenticationPerformed"]=False;holds(d,"WINDOWS_PRINCIPAL_AUTH")
    def test_dpapi_not_a_portable_restore(self):
        d=good();d["forensic"]["dpapiPreservation"]["portableOffhostRestore"]=False;holds(d,"PORTABLE_RECOVERY")
    def test_no_editable_original_paper_restore(self):
        d=good();d["forensic"]["originalFullEditablePaperSaasRestorePerformed"]=False;holds(d,"EDITABLE_SAAS_RESTORATION")
    def test_failed_isolated_database_restore(self):
        d=good();d["restore"]["pgRestoreExitZero"]=False;holds(d,"ISOLATED_DB_DATA_DRILL")
    def test_mismatched_cloned_aggregates(self):
        d=good();d["restore"]["sourceAndCloneReadOnlyAggregatesIdentical"]=False;holds(d,"ISOLATED_DB_DATA_DRILL")
    def test_same_host_is_not_offhost(self):
        d=good();d["restore"]["offhostRestoreCertified"]=False;holds(d,"OFFHOST_DB_ROLES_ACL")
    def test_owner_acl_missing(self):
        d=good();d["restore"]["ownershipAndAclRecreated"]=False;holds(d,"OFFHOST_DB_ROLES_ACL")
    def test_role_passwords_missing(self):
        d=good();d["restore"]["globalRolePasswordRestorationTested"]=False;holds(d,"OFFHOST_DB_ROLES_ACL")
    def test_live_restore_prohibited(self):
        d=good();d["restore"]["productionDatabaseNeverModifiedByRestore"]=False;holds(d,"NO_LIVE_DB_RESTORE")
    def test_four_published_shells_required(self):
        d=good();d["published"]["entryModulesConfirmed"]=3;holds(d,"PUBLISHED_FOUR_SHELL_ATTENDANCE")
    def test_one_unsafe_attendance_chunk_blocks(self):
        d=good();d["published"]["attendanceModuleUnsafeFallbackDirectImports"]=1;holds(d,"PUBLISHED_FOUR_SHELL_ATTENDANCE")
    def test_importmap_override_not_equivalent_to_source(self):
        d=good();d["published"]["attendanceModuleImportMapOverrideCount"]=1;holds(d,"PUBLISHED_FOUR_SHELL_ATTENDANCE")
    def test_undeployed_candidate_blocks(self):
        d=good();d["published"]["sourceCandidateDeployed"]=False;holds(d,"PUBLISHED_FOUR_SHELL_ATTENDANCE")
    def test_unobserved_real_browser(self):
        d=good();d["published"]["importMapReplacementObservedInBrowser"]=False;holds(d,"REAL_BROWSER_REACHABILITY")
    def test_no_academic_approval(self):
        d=good();d["academic"]["result"]["release"]="HOLD";holds(d,"ACADEMIC_AUTHORIZATION")
    def test_any_academic_blocker_blocks(self):
        d=good();d["academic"]["result"]["blocked"]=1;holds(d,"ACADEMIC_AUTHORIZATION")
    def test_historical_result_rows_pinned(self):
        d=good();d["academic"]["evidence"]["firstTermRows"]=1853;holds(d,"HISTORIC_FIRST_TERM")
    def test_historical_result_checksum_pinned(self):
        d=good();d["academic"]["evidence"]["firstTermSHA256"]="0"*64;holds(d,"HISTORIC_FIRST_TERM")
    def test_disk_headroom_strict(self):
        d=good();d["academic"]["evidence"]["diskFreeGiB"]=15.999;holds(d,"DISK_CAPACITY")
    def test_a215_full_monitor_required(self):
        d=good();d["certified"]["observedFull40Minutes"]=False;holds(d,"A215_PRIOR_PROVENANCE")
    def test_a215_zero_fail_required(self):
        d=good();d["certified"]["fullDurationCyclesFailed"]=1;holds(d,"A215_PRIOR_PROVENANCE")
    def test_no_a215_cycles_not_valid(self):
        d=good();d["certified"]["fullDurationCyclesPassed"]=0;holds(d,"A215_PRIOR_PROVENANCE")
    def test_all_missing_evidence_fails_closed(self):
        d=good();d["forensic"]={};d["restore"]={};d["published"]={};d["academic"]={"result":{},"evidence":{}};d["certified"]={}
        self.assertEqual(run(d)["release"],"HOLD")
    def test_app_role_database_create_blocks(self):
        d=good();d["privileges"]["databaseCreate"]=True;holds(d,"APP_ROLE_LEAST_PRIVILEGE")
    def test_app_role_public_schema_create_blocks(self):
        d=good();d["privileges"]["publicSchemaCreate"]=True;holds(d,"APP_ROLE_LEAST_PRIVILEGE")
    def test_app_owner_of_protected_tables_blocks(self):
        d=good();d["privileges"]["appOwnedProtectedRlsTables"]=73;d["privileges"]["appOwnedProtectedForceRls"]=73;holds(d,"APP_ROLE_LEAST_PRIVILEGE")
    def test_force_rls_mismatch_blocks(self):
        d=good();d["privileges"]["appOwnedProtectedRlsTables"]=1;d["privileges"]["appOwnedProtectedForceRls"]=0;holds(d,"APP_OWNED_RLS_FORCE")
    def test_windows_hash_attestation_requires_matching_sha_and_age(self):
        now=dt.datetime(2026,11,6,7,21,30,tzinfo=dt.timezone.utc)
        forensic={"dpapiPreservation":{"manifestSha256":"a"*64}}
        a={"observedUtc":"2026-11-06T07:21:03Z","source":"Windows read-only encrypted paper artifacts",
           "manifestSHA256":"a"*64,"verifiedCiphertexts":4,"failures":0,
           "originalBrowserModified":False,"principalReauthenticated":False,"paperContentTransferred":False}
        self.assertTrue(g.observed_windows_hash_proof(a,forensic,now))
        for k,v in [("manifestSHA256","b"*64),("verifiedCiphertexts",3),("failures",1),("originalBrowserModified",True),("paperContentTransferred",True)]:
            x={**a,k:v};self.assertFalse(g.observed_windows_hash_proof(x,forensic,now),k)
        self.assertFalse(g.observed_windows_hash_proof(a,forensic,now+dt.timedelta(hours=5)))
        self.assertFalse(g.observed_windows_hash_proof(a,forensic,now-dt.timedelta(hours=1)))
    def test_no_fixture_cli_or_unsafe_write(self):
        src=S.read_text()
        self.assertNotIn("UPDATE students",src)
        self.assertNotIn("--force-release",src)
        self.assertNotIn("INSERT INTO paper",src)
        self.assertNotIn("DELETE FROM",src)
if __name__=="__main__":unittest.main()
