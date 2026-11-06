#!/usr/bin/env python3
"""Strict offline off-host DR evidence contract, not a restore operator or release authority.

Checks independently produced proof fields only. Synthetic true flags never
certify any real production environment; no data, passwords or keys are read.
"""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json
import os
import sys

SRC_CERT=Path("/root/workspace/assps-mission-20261106-a217-private/A217_MASTER_CERTIFICATION.json")
PRIVATE_OUT=Path("/root/workspace/assps-mission-20261106-a220-private")
MATCHING_COUNT_FIELDS=(
    "school1FirstTermRows",
    "publicRlsTableCount",
    "publicForceRlsTableCount",
    "protectedTablesOwnedByRuntimeLogin",
    "databaseRoleCount",
)
MATCHING_HASH_FIELDS=(
    "firstTermSha256",
    "school1AggregateSha256",
    "grantAclCanonicalSha256",
    "ownershipCanonicalSha256",
    "rlsPolicyCanonicalSha256",
)
TRUE_PROOFS=(
    "realPasswordAuthenticationTested",
    "sourceArchiveSha256VerifiedAfterTransfer",
    "pgRestoreCompletedWithoutError",
    "databaseOwnerPrivilegesRechecked",
    "tenantIsolationNegativeProbesPassed",
    "rollbackToOriginalEndpointProven",
    "operatorAuthenticityIndependentlyAttested",
    "differentProviderFailureDomainVerified",
)

def verified_sha(value):
    return isinstance(value,str) and len(value)==64 and all(ch in "0123456789abcdef" for ch in value)

def assess(source, target, backup):
    if not all(isinstance(x,dict) for x in (source,target,backup)):
        raise ValueError("DR evidence objects required")
    blockers=[]
    def must(ok, code):
        if not ok:blockers.append(code)
    src_host=source.get("machineInstanceId")
    dst_host=target.get("machineInstanceId")
    src_provider=source.get("providerAccountOrRegion")
    dst_provider=target.get("providerAccountOrRegion")
    must(bool(src_host) and bool(dst_host) and src_host!=dst_host, "SAME_OR_UNKNOWN_HOST")
    must(bool(src_provider) and bool(dst_provider) and src_provider!=dst_provider,
         "SAME_OR_UNKNOWN_FAILURE_DOMAIN")
    must(bool(backup.get("archiveSha256")) and verified_sha(backup.get("archiveSha256")) and
         backup.get("sourceVerifiedArchiveSha256")==backup.get("archiveSha256") and
         backup.get("targetVerifiedArchiveSha256")==backup.get("archiveSha256"),
         "ARCHIVE_SHA_TRANSFER_MISMATCH")
    for key in MATCHING_COUNT_FIELDS:
        a=source.get(key);b=target.get(key)
        must(type(a) is int and a>=0 and type(b) is int and b>=0 and a==b,
             "COUNT_MISMATCH_"+key)
    for key in MATCHING_HASH_FIELDS:
        a=source.get(key);b=target.get(key)
        must(verified_sha(a) and verified_sha(b) and a==b,"HASH_MISMATCH_"+key)
    for key in TRUE_PROOFS:
        must(target.get(key) is True,"PROOF_MISSING_"+key)
    must(target.get("restoreHostIsDisconnectedFromSourceStorage") is True,
         "RESTORE_FAILURE_DOMAIN_STILL_SHARED")
    must(backup.get("containsFullProductionData") is True,
         "SCHEMA_ONLY_OR_DATA_OMITTED")
    must(backup.get("includesRoleGlobalsAndPasswordVerifierRecovery") is True,
         "PASSWORD_ROLE_GLOBALS_OMITTED")
    must(backup.get("backupEncryptedAtRest") is True,
         "BACKUP_ENCRYPTION_NOT_PROVEN")
    must(backup.get("expiryAndRetentionOwnerSigned") is True,
         "RETENTION_OWNER_NOT_SIGNED")
    must(source.get("productionDatabaseNeverModifiedByDrill") is True and
         target.get("productionDatabaseNeverModifiedByDrill") is True,
         "PRODUCTION_SOURCE_MUTATION_RISK")
    return {
        "reviewState":"HOLD" if blockers else "READY_FOR_INDEPENDENT_HUMAN_CERTIFICATION",
        "blockers":blockers,
        "blockerCount":len(blockers),
        "sourceAndDestinationDistinctClaimsAreNotCryptographicAttestation":True,
        "runtimeRolePasswordsAreNeverStoredInThisEvidence":True,
        "actualOffhostRestorePerformedByThisScript":False,
        "productionDeploymentAuthorized":False,
        "deletionAuthorized":False,
    }

def live_claim_from_a217(record):
    """A217 proved same-host DB+object parity; do not fabricate missing offhost proofs."""
    if record.get("release")!="HOLD" or record.get("observedFull40Minutes") is not True:
        raise ValueError("A217 source certification invalid")
    digest="420c6cbd4c433906156e771449f6ff40ef48efce6e53ca591692dace1aad0539"
    src={"machineInstanceId":"srv1769723","providerAccountOrRegion":"HOSTINGER_VPS_SAME_HOST",
         "school1FirstTermRows":1854,
         "firstTermSha256":digest,
         "productionDatabaseNeverModifiedByDrill":True}
    dst={"machineInstanceId":"srv1769723",
         "providerAccountOrRegion":"HOSTINGER_VPS_SAME_HOST",
         "school1FirstTermRows":1854,
         "firstTermSha256":digest,
         "productionDatabaseNeverModifiedByDrill":True,
         "pgRestoreCompletedWithoutError":bool(record.get("isolatedSameVpsDatabaseRestore")),
         "realPasswordAuthenticationTested":bool(record.get("rolePasswordsRestored"))}
    return src,dst,{"containsFullProductionData":bool(record.get("sourceAndCloneDataAggregateParity"))}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",required=True)
    a=parser.parse_args()
    dest=Path(a.out).resolve()
    if dest.parent!=PRIVATE_OUT or dest.is_symlink() or not dest.name.startswith("A220_OFFHOST_DR_") or dest.suffix != ".json":
        raise ValueError("Only private evidence output paths are accepted")
    original=SRC_CERT.read_bytes()
    record=json.loads(original)
    source,target,backup=live_claim_from_a217(record)
    decision=assess(source,target,backup)
    artifact={"mission":"A220_OFFHOST_RESTORE_ACCEPTANCE_READONLY",
              "checkedUtc":datetime.now(timezone.utc).isoformat(),
              "A217MasterSha256":hashlib.sha256(original).hexdigest(),
              "result":decision,
              "offhostRestorePerformed":False,
              "credentialDataStored":False,"productionWrites":0,
              "deploymentPerformed":False,"sourceFilesDeleted":0}
    tmp=dest.with_suffix(".tmp")
    tmp.write_text(json.dumps(artifact,indent=2)+"\n");os.chmod(tmp,0o600);os.replace(tmp,dest)
    print(json.dumps({"release":decision["reviewState"],"blockers":decision["blockerCount"],
                      "sourceHost":source["machineInstanceId"],
                      "destinationHost":target["machineInstanceId"],
                      "passwordLoginVerified":target["realPasswordAuthenticationTested"],
                      "noProductionChanges":True}))
    return 3 if decision["reviewState"]=="HOLD" else 0

if __name__=="__main__":
    try:sys.exit(main())
    except (ValueError,OSError,TypeError,RuntimeError) as ex:
        print(f"A220 offhost gate evidence invalid: {type(ex).__name__}: {ex}",file=sys.stderr)
        sys.exit(2)
