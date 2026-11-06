import importlib.util
from pathlib import Path
import copy
import tempfile
import unittest
S=Path(__file__).resolve().parents[1]/"a220_offhost_restore_acceptance.py"
spec=importlib.util.spec_from_file_location("a220_dr",S)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
H=lambda token:(token*64)[:64]
def fixture():
 src={
  "machineInstanceId":"machine-A","providerAccountOrRegion":"PROVIDER-REGION-A",
  "school1FirstTermRows":1854,"publicRlsTableCount":90,"publicForceRlsTableCount":86,
  "protectedTablesOwnedByRuntimeLogin":73,"databaseRoleCount":34,
  "firstTermSha256":H("a"),"school1AggregateSha256":H("b"),
  "grantAclCanonicalSha256":H("c"),"ownershipCanonicalSha256":H("d"),
  "rlsPolicyCanonicalSha256":H("e"),"productionDatabaseNeverModifiedByDrill":True}
 target=copy.deepcopy(src)
 target.update({"machineInstanceId":"machine-B","providerAccountOrRegion":"PROVIDER-REGION-B"})
 for k in m.TRUE_PROOFS:target[k]=True
 target["restoreHostIsDisconnectedFromSourceStorage"]=True
 archive={"archiveSha256":H("f"),"sourceVerifiedArchiveSha256":H("f"),"targetVerifiedArchiveSha256":H("f"),
          "containsFullProductionData":True,"includesRoleGlobalsAndPasswordVerifierRecovery":True,
          "backupEncryptedAtRest":True,"expiryAndRetentionOwnerSigned":True}
 return src,target,archive
def decision(*stuff):
 return m.assess(*(stuff if stuff else fixture()))
class OffHostDRTests(unittest.TestCase):
 def test_synthetic_proof_only_human_review(self):
  o=decision()
  self.assertEqual(o["reviewState"],"READY_FOR_INDEPENDENT_HUMAN_CERTIFICATION")
  self.assertFalse(o["actualOffhostRestorePerformedByThisScript"])
  self.assertFalse(o["productionDeploymentAuthorized"])
  self.assertFalse(o["deletionAuthorized"])
 def test_same_host_rejected(self):
  a,b,c=fixture();b["machineInstanceId"]=a["machineInstanceId"]
  self.assertIn("SAME_OR_UNKNOWN_HOST",decision(a,b,c)["blockers"])
 def test_missing_host_rejected(self):
  a,b,c=fixture();b.pop("machineInstanceId")
  self.assertIn("SAME_OR_UNKNOWN_HOST",decision(a,b,c)["blockers"])
 def test_same_failure_domain_rejected(self):
  a,b,c=fixture();b["providerAccountOrRegion"]=a["providerAccountOrRegion"]
  self.assertIn("SAME_OR_UNKNOWN_FAILURE_DOMAIN",decision(a,b,c)["blockers"])
 def test_missing_failure_domain_rejected(self):
  a,b,c=fixture();b.pop("providerAccountOrRegion")
  self.assertIn("SAME_OR_UNKNOWN_FAILURE_DOMAIN",decision(a,b,c)["blockers"])
 def test_source_hash_missing(self):
  a,b,c=fixture();c["sourceVerifiedArchiveSha256"]=None
  self.assertIn("ARCHIVE_SHA_TRANSFER_MISMATCH",decision(a,b,c)["blockers"])
 def test_target_hash_mismatch(self):
  a,b,c=fixture();c["targetVerifiedArchiveSha256"]=H("0")
  self.assertIn("ARCHIVE_SHA_TRANSFER_MISMATCH",decision(a,b,c)["blockers"])
 def test_uppercase_hash_not_canonical(self):
  a,b,c=fixture();c["archiveSha256"]=H("A")
  self.assertIn("ARCHIVE_SHA_TRANSFER_MISMATCH",decision(a,b,c)["blockers"])
 def test_bad_hash_length(self):
  a,b,c=fixture();c["archiveSha256"]="1234"
  self.assertIn("ARCHIVE_SHA_TRANSFER_MISMATCH",decision(a,b,c)["blockers"])
 def test_non_dict_evidence_rejected(self):
  for vals in [(None,{},{}),({},None,{}),({}, {},None)]:
   with self.assertRaises(ValueError):m.assess(*vals)
 def test_schema_only_rejected(self):
  a,b,c=fixture();c["containsFullProductionData"]=False
  self.assertIn("SCHEMA_ONLY_OR_DATA_OMITTED",decision(a,b,c)["blockers"])
 def test_role_globals_missing(self):
  a,b,c=fixture();c["includesRoleGlobalsAndPasswordVerifierRecovery"]=False
  self.assertIn("PASSWORD_ROLE_GLOBALS_OMITTED",decision(a,b,c)["blockers"])
 def test_backup_encryption_missing(self):
  a,b,c=fixture();c["backupEncryptedAtRest"]=False
  self.assertIn("BACKUP_ENCRYPTION_NOT_PROVEN",decision(a,b,c)["blockers"])
 def test_unsigned_retention_owner_blocks(self):
  a,b,c=fixture();c["expiryAndRetentionOwnerSigned"]=False
  self.assertIn("RETENTION_OWNER_NOT_SIGNED",decision(a,b,c)["blockers"])
 def test_source_db_mutation_risk(self):
  a,b,c=fixture();a["productionDatabaseNeverModifiedByDrill"]=False
  self.assertIn("PRODUCTION_SOURCE_MUTATION_RISK",decision(a,b,c)["blockers"])
 def test_target_db_mutation_risk(self):
  a,b,c=fixture();b["productionDatabaseNeverModifiedByDrill"]=False
  self.assertIn("PRODUCTION_SOURCE_MUTATION_RISK",decision(a,b,c)["blockers"])
 def test_disconnected_host_storage_required(self):
  a,b,c=fixture();b["restoreHostIsDisconnectedFromSourceStorage"]=False
  self.assertIn("RESTORE_FAILURE_DOMAIN_STILL_SHARED",decision(a,b,c)["blockers"])
 def test_live_A217_claim_is_HOLD(self):
  cert={"release":"HOLD","observedFull40Minutes":True,
        "isolatedSameVpsDatabaseRestore":True,
        "sourceAndCloneDataAggregateParity":True,"rolePasswordsRestored":False}
  a,b,c=m.live_claim_from_a217(cert)
  r=m.assess(a,b,c)
  self.assertEqual(r["reviewState"],"HOLD")
  self.assertIn("SAME_OR_UNKNOWN_HOST",r["blockers"])
  self.assertIn("PROOF_MISSING_realPasswordAuthenticationTested",r["blockers"])
 def test_invalid_A217_cert_rejected(self):
  for value in [None,False]:
   with self.assertRaises(ValueError):m.live_claim_from_a217({"release":"HOLD","observedFull40Minutes":value})
 def test_A217_release_must_be_HOLD(self):
  with self.assertRaises(ValueError):m.live_claim_from_a217({"release":"READY","observedFull40Minutes":True})
 def test_all_empty_values_fail_closed(self):
  self.assertEqual(m.assess({}, {}, {})["reviewState"],"HOLD")
 def test_no_password_or_external_execution_in_code(self):
  script=S.read_text()
  for text in ["subprocess.run(", "subprocess.Popen(", "os.system(", "shutil.rmtree(", ".unlink(", "pg_restore", "pg_dump", "DELETE FROM"]:
   self.assertNotIn(text,script)

def _count_mismatch(name):
 def case(self):
  a,b,c=fixture();b[name]=a[name]+1
  self.assertIn("COUNT_MISMATCH_"+name,decision(a,b,c)["blockers"])
 return case
def _count_bool(name):
 def case(self):
  a,b,c=fixture();b[name]=True
  self.assertIn("COUNT_MISMATCH_"+name,decision(a,b,c)["blockers"])
 return case
def _hash_mismatch(name):
 def case(self):
  a,b,c=fixture();b[name]=H("0")
  self.assertIn("HASH_MISMATCH_"+name,decision(a,b,c)["blockers"])
 return case
def _hash_missing(name):
 def case(self):
  a,b,c=fixture();b.pop(name)
  self.assertIn("HASH_MISMATCH_"+name,decision(a,b,c)["blockers"])
 return case
def _proof_missing(name):
 def case(self):
  a,b,c=fixture();b[name]=False
  self.assertIn("PROOF_MISSING_"+name,decision(a,b,c)["blockers"])
 return case
for key in m.MATCHING_COUNT_FIELDS:
 setattr(OffHostDRTests,"test_count_mismatch_"+key,_count_mismatch(key))
 setattr(OffHostDRTests,"test_count_boolean_"+key,_count_bool(key))
for key in m.MATCHING_HASH_FIELDS:
 setattr(OffHostDRTests,"test_hash_mismatch_"+key,_hash_mismatch(key))
 setattr(OffHostDRTests,"test_hash_missing_"+key,_hash_missing(key))
for key in m.TRUE_PROOFS:
 setattr(OffHostDRTests,"test_proof_missing_"+key,_proof_missing(key))
if __name__=="__main__":unittest.main()
