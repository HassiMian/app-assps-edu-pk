#!/usr/bin/env python3
"""ASSPS A216 provenance and release checks. Strictly read-only; never promotes production."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

# These source locations are local audit evidence, not a remote school database.
WINDOWS_FORENSIC = Path("/root/workspace/assps-mission-20261106-a215-private/A215_WINDOWS_FORENSIC_REDACTED_EVIDENCE.json")
ISOLATED_RESTORE = Path("/root/workspace/assps-mission-20261106-a215-private/A215_ISOLATED_FULL_DATA_RESTORE_CERT.json")
PUB_GRAPH = Path("/root/workspace/assps-mission-20261106-a213-private/A213_CURRENT_ACTIVE_INDEX_IMPORTMAP_PARITY.json")
A215_MASTER = Path("/root/workspace/assps-mission-20261106-a215-private/A215_MASTER_CERTIFICATION.json")
PUBLISHED_REFRESH = Path("/root/workspace/assps-mission-20261106-a213-private/A213_PUBLISHED_IMPORT_GRAPH_READONLY.py")
WINDOWS_HASH_RECHECK = Path("/root/workspace/assps-mission-20261106-a216-private/A216_WINDOWS_CIPHERTEXT_HASH_RECHECK.json")
A214_GATE = Path(__file__).resolve().parent / "assps_academic_release_gate.py"
BASELINE_SHA = "420c6cbd4c433906156e771449f6ff40ef48efce6e53ca591692dace1aad0539"
EXPECTED_58 = 58
EXPECTED_CONFLICTS = 7
EXPECTED_NEW = 9

def safe_json(path):
    data = json.loads(Path(path).read_text())
    if not isinstance(data, dict):
        raise ValueError("Expected evidence object")
    return data

def evaluate_evidence(*, forensic, restore, published, academic, certified, privileges=None, windows_local_confirmed=False):
    blockers = []
    def block_unless(ok, name, detail):
        if not ok:
            blockers.append({"gate": name, "detail": detail})
    f=forensic
    require54 = [
        ("ORIGINAL_DEVICE_PRESENT", windows_local_confirmed,
         "Original Windows local preservation must be independently confirmed"),
        ("FORENSIC_READ_ONLY", f.get("originalBrowserProfileModifiedByAudit") is False,
         "Original browser source mutation forbidden"),
        ("UNION_ID_BASELINE", f.get("unionDistinctPaperIds") == EXPECTED_58,
         "Observed 58 unique IDs must be re-reviewed if source changes"),
        ("SOURCE_REVISIONS_CONFLICT", f.get("sameIdDifferentContentBetweenDefault49AndProfile1_58") == EXPECTED_CONFLICTS,
         "Seven same-ID different-content changes compared against certified provenance baseline"),
        ("REVISION_CONFLICT_APPROVAL", f.get("principalApprovedConflictDisposition") is True,
         "Seven conflicting original revisions not resolved and approved by Principal"),
        ("ADDITIONAL_PAPER_IDS", f.get("newPaperIdsOnlyIn58") == EXPECTED_NEW,
         "Nine additional IDs compared against certified provenance baseline"),
        ("ADDITIONAL_PAPER_APPROVAL", f.get("principalApprovedAdditionalPaperDisposition") is True,
         "Nine additional paper IDs await authenticated school owner disposition"),
        ("WINDOWS_LOCAL_SNAPSHOTS", f.get("dpapiPreservation",{}).get("encryptedLocalFiles") == 4 and
         f.get("dpapiPreservation",{}).get("allFourDecryptAndShaRoundTripsVerified") is True,
         "Four DPAPI backups with local round-trip checks required"),
        ("NOT_AUTOMERGED", f.get("originalSnapshotsAutomaticallyMerged") is False and
         f.get("plaintextPaperContentsTransferredToVps") is False,
         "Audit must not silently merge or upload original papers"),
        ("WINDOWS_PRINCIPAL_AUTH", f.get("principalRoleReauthenticationPerformed") is True,
         "Authenticated Principal recheck is required before SaaS import"),
        ("PORTABLE_RECOVERY", f.get("dpapiPreservation",{}).get("portableOffhostRestore") is True,
         "DPAPI copies are device-bound; independent portable encrypted recovery not verified"),
        ("EDITABLE_SAAS_RESTORATION", f.get("originalFullEditablePaperSaasRestorePerformed") is True,
         "No verified, authorized restore of editable original papers"),
    ]
    for code,ok,desc in require54:block_unless(ok,code,desc)
    r=restore
    block_unless(r.get("pgRestoreExitZero") is True and r.get("sourceAndCloneReadOnlyAggregatesIdentical") is True,
                 "ISOLATED_DB_DATA_DRILL","Restore into a separate same-host cluster must match source aggregates")
    block_unless(r.get("offhostRestoreCertified") is True and
                 r.get("ownershipAndAclRecreated") is True and
                 r.get("globalRolePasswordRestorationTested") is True,
                 "OFFHOST_DB_ROLES_ACL","Same-VPS data-only drill is not full independent off-host DR")
    block_unless(r.get("productionDatabaseNeverModifiedByRestore") is True,
                 "NO_LIVE_DB_RESTORE","Production database must remain untouched by recovery drill")
    p=published
    block_unless(p.get("entryModulesConfirmed")==4 and
                 p.get("attendanceModuleUnsafeFallbackDirectImports")==0 and
                 p.get("attendanceModuleImportMapOverrideCount")==0 and
                 p.get("sourceCandidateDeployed") is True,
                 "PUBLISHED_FOUR_SHELL_ATTENDANCE","All four active published attendance shells must be proven safe")
    block_unless(p.get("importMapReplacementObservedInBrowser") is True,
                 "REAL_BROWSER_REACHABILITY","Actual browser module graph execution must be verified")
    academic_e=academic["evidence"]; academic_r=academic["result"]
    block_unless(academic_r.get("release") == "READY_FOR_INDEPENDENT_SIGNOFF" and
                 academic_r.get("blocked")==0,
                 "ACADEMIC_AUTHORIZATION","Live academic subject and assessment approvals incomplete")
    block_unless(academic_e.get("firstTermRows")==1854 and
                 academic_e.get("firstTermSHA256")==BASELINE_SHA,
                 "HISTORIC_FIRST_TERM","Original First Term protected digest must remain intact")
    block_unless(academic_e.get("diskFreeGiB",0)>=16,
                 "DISK_CAPACITY","VPS root capacity below 16 GiB independent recovery guard")
    if privileges is not None:
        block_unless(privileges.get("databaseCreate") is False and privileges.get("publicSchemaCreate") is False and
                     privileges.get("appOwnedProtectedRlsTables") == 0,
                     "APP_ROLE_LEAST_PRIVILEGE","Generic application login retains CREATE or protected-table ownership privileges")
        block_unless(privileges.get("appOwnedProtectedForceRls") == privileges.get("appOwnedProtectedRlsTables"),
                     "APP_OWNED_RLS_FORCE","Application-owned protected tables must all enforce FORCE RLS")
    block_unless(certified.get("observedFull40Minutes") is True and
                 certified.get("fullDurationCyclesFailed")==0 and
                 certified.get("fullDurationCyclesPassed",0)>0,
                 "A215_PRIOR_PROVENANCE","Previous A215 monitor certification absent or failed")
    return {
      "release": "HOLD" if blockers else "READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW",
      "blockerCount":len(blockers),"blockers":blockers,
      "verifiedBrowserPaperIds":f.get("unionDistinctPaperIds"),
      "differentContentSamePaperId":f.get("sameIdDifferentContentBetweenDefault49AndProfile1_58"),
      "additionalPaperIds":f.get("newPaperIdsOnlyIn58"),
      "productionWrites":0,"productionDeployments":0,
      "warning":"A passing synthetic test fixture is not a production authorization. Never auto deploy."
    }

def live_privileges_readonly():
    sql = """BEGIN READ ONLY;
SELECT has_database_privilege('apexos_user',current_database(),'CREATE'),has_schema_privilege('apexos_user','public','CREATE'),count(*) FILTER(WHERE pg_get_userbyid(c.relowner)='apexos_user'),count(*) FILTER(WHERE pg_get_userbyid(c.relowner)='apexos_user' AND c.relforcerowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relrowsecurity;
ROLLBACK;"""
    p=subprocess.run(["runuser","-u","postgres","--","psql","-X","-q","-At","-v","ON_ERROR_STOP=1","-d","apexos"],input=sql,capture_output=True,text=True,timeout=25)
    if p.returncode:raise RuntimeError("Read-only role inventory failed")
    parts=[line.split("|") for line in p.stdout.splitlines() if "|" in line]
    if len(parts)!=1 or len(parts[0])!=4:raise ValueError("Invalid role inventory evidence")
    a,b,n,forced=parts[0]
    if a not in ("t","f") or b not in ("t","f"):raise ValueError("Unexpected privilege type")
    return {"databaseCreate":a=="t","publicSchemaCreate":b=="t","appOwnedProtectedRlsTables":int(n),"appOwnedProtectedForceRls":int(forced)}

def live_academic_gate(output):
    p=subprocess.run([sys.executable,str(A214_GATE),"--out",str(output)],capture_output=True,text=True,timeout=35)
    if p.returncode not in (0,3):
        raise RuntimeError("Authoritative live academic evidence unavailable: "+p.stderr[-300:])
    return safe_json(output)

def observed_windows_hash_proof(attestation, forensic, now):
    try:
        observed=dt.datetime.fromisoformat(attestation["observedUtc"].replace("Z","+00:00"))
        age=(now-observed).total_seconds()
        return 0<=age<=4*3600 and attestation.get("source")=="Windows read-only encrypted paper artifacts" and \
            attestation.get("manifestSHA256")==forensic.get("dpapiPreservation",{}).get("manifestSha256") and \
            attestation.get("verifiedCiphertexts")==4 and attestation.get("failures")==0 and \
            attestation.get("originalBrowserModified") is False and \
            attestation.get("principalReauthenticated") is False and \
            attestation.get("paperContentTransferred") is False
    except (KeyError,ValueError,TypeError):
        return False

def main():
    arg=argparse.ArgumentParser()
    arg.add_argument("--out",required=True)
    arg.add_argument("--academic-out",required=True)
    opts=arg.parse_args()
    a_out=Path(opts.academic_out)
    academic=live_academic_gate(a_out)
    fresh=subprocess.run([sys.executable,str(PUBLISHED_REFRESH)],capture_output=True,text=True,timeout=35)
    if fresh.returncode:raise RuntimeError("Published effective import graph is not current/verified: "+fresh.stderr[-180:])
    source={
      "forensic":safe_json(WINDOWS_FORENSIC),
      "restore":safe_json(ISOLATED_RESTORE),
      "published":safe_json(PUB_GRAPH),
      "certified":safe_json(A215_MASTER),
      "privileges":live_privileges_readonly(),
    }
    # Audit evidence proves prior snapshot presence, NOT a fresh authenticated Principal session.
    attestation=safe_json(WINDOWS_HASH_RECHECK) if WINDOWS_HASH_RECHECK.is_file() else {}
    device_present=observed_windows_hash_proof(attestation,source["forensic"],dt.datetime.now(dt.timezone.utc))
    verdict=evaluate_evidence(**source,academic=academic,windows_local_confirmed=device_present)
    artifact={
      "mission":"A216_RELEASE_BOUNDARY_READ_ONLY","checkedUtc":dt.datetime.now(dt.timezone.utc).isoformat(),
      "sourcesSha256":{k:hashlib.sha256(Path(loc).read_bytes()).hexdigest() for k,loc in [
        ("forensic",WINDOWS_FORENSIC),("isolatedRestore",ISOLATED_RESTORE),
        ("published",PUB_GRAPH),("certifiedA215",A215_MASTER),("academic",a_out)]},
      "rolePrivilegeReadOnly":source["privileges"],
      "windowsCiphertextHashPresent":device_present,
      "windowsHashRecheckSha256":hashlib.sha256(WINDOWS_HASH_RECHECK.read_bytes()).hexdigest() if WINDOWS_HASH_RECHECK.is_file() else None,
      "result":verdict,
      "productionWrites":0,
      "productionDeployments":0
    }
    dest=Path(opts.out);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(artifact,indent=2)+"\n");os.chmod(dest,0o600)
    print(json.dumps({"release":verdict["release"],"blockers":verdict["blockerCount"],
      "observedPaperIds":verdict["verifiedBrowserPaperIds"],"sameIdContentConflicts":verdict["differentContentSamePaperId"]}))
    return 3 if verdict["release"]=="HOLD" else 0

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as ex:
        print("A216 cannot certify: "+type(ex).__name__+": "+str(ex),file=sys.stderr)
        sys.exit(2)
