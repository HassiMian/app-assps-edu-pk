#!/usr/bin/env python3
"""Read-only reconciliation of CURRENT Core 278 and Connect 17097 release candidates.

Never deploys, signs, authenticates people, changes staff credentials, or writes SQL.
The official Core release verifier remains the exclusive production gate.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

CORE_BASE = "2782179f6ed0d3658ed8d7025cd5a7908b7ebdd0"
CONNECT_SHA = "859ee13f367db8e755a8b4e88c4ca65b6dd5feac"
WORKER_SHA = "97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc"
CONNECT_BUILD = "1C7EPZhqltxUUzTMiDTwQ"
CONNECT_PROXY_SHA = "7978b360f2ccc235a086283463851f0c5a8c98390efd57b17476cc32b21fd015"
BLUE_BUILD = "ONDwxEIZlx5onDIKY7wYf"
BLUE_ARCHIVE_SHA = "844430b88e1b12906ef00945f8a382a69905f5a0a05727e35e0729452466947e"
DB_DUMP_SHA = "a989b0ef674014109f1f30108a56e9fe4555027712ede8aaed9f82a397f7169a"

CORE_DIR = Path(__file__).resolve().parents[3]
CONNECT_DIR = Path("/root/workspace/assps-connect-current-live-role-neutral-ingress-20261015")
BACKEND_STAGE = Path("/root/assps-release-candidates/apex-backend-core278-current-live-20261015")
NEXT_STAGE = Path("/root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015")
LIVE_BACKEND = Path("/var/www/apex-backend")
LIVE_NEXT = Path("/var/www/apex-connect")
BLUE_ARCHIVE = Path("/root/assps-release-backups/connect-current-ond-blue-20261015T0209Z/current-next-nginx-blue.tar.zst")
DB_DUMP = Path("/root/assps-release-backups/core-login-ond-post-worker-20261015/apexos-full-current.dump")
REVIEWED = ("services/ai/aiQueueWorkerDatabase.js","services/ai/paperAiQueue.js","routes/opsRoutes.js")
PRESERVE = ("server.js","routes/lessonPlanRoutes.js")
AUTH_HASHES = {
 "src/components/LoginClient.tsx":"3d45699280a63c0089b5b35a629b307306fc74f69eee684b5b3ac66c34f965b8",
 "src/app/auth/change-password/page.tsx":"4f1087fae2f6d2c6d9457e8ea255ea1085b6b87002bb5a521b1e5eaea21860f6",
 "src/lib/server/auth-user.ts":"06c47ef8ff003f7425f9204ad08b4e5a6e25a13c3d6cde45cd07bfb46166cc90",
}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def same(a,b):
    return a.is_file() and b.is_file() and sha(a)==sha(b)

def artifacts(core_src, backend_stage, live_backend, next_stage, expected_worker=WORKER_SHA,
              expected_build=CONNECT_BUILD, expected_proxy=CONNECT_PROXY_SHA, expected_auth=AUTH_HASHES):
    checks={}
    for f in REVIEWED:
        checks["reviewed_"+f.replace("/","_")] = same(core_src/f, backend_stage/"src"/f)
    checks["exact_hardened_worker_sha"] = (backend_stage/"src"/REVIEWED[0]).is_file() and sha(backend_stage/"src"/REVIEWED[0])==expected_worker
    for f in PRESERVE:
        checks["live_preserved_"+f.replace("/","_")] = same(live_backend/"src"/f, backend_stage/"src"/f)
    checks["no_private_backend_env_in_stage"]=not (backend_stage/".env").exists() and not (backend_stage/"src"/".env").exists()
    checks["new_next_compiled_build_id"]=(next_stage/".next"/"BUILD_ID").is_file() and (next_stage/".next"/"BUILD_ID").read_text().strip()==expected_build
    checks["new_next_proxy_matches_review"]=(next_stage/"src/proxy.ts").is_file() and sha(next_stage/"src/proxy.ts")==expected_proxy
    checks["no_private_next_env_in_stage"]=not (next_stage/".env").exists()
    for fname,digest in expected_auth.items():
        f=next_stage/fname
        checks["reviewed_auth_"+fname.replace("/","_")]=f.is_file() and sha(f)==digest
    return checks

def run(args, timeout=18):
    return subprocess.run(args,capture_output=True,text=True,timeout=timeout)

def current_releases():
    checks={}
    corehead=run(["git","-C",str(CORE_DIR),"merge-base","--is-ancestor",CORE_BASE,"HEAD"])
    checks["latest_core_278_is_ancestor"]=corehead.returncode==0
    connect=run(["git","-C",str(CONNECT_DIR),"rev-parse","HEAD"])
    checks["reviewed_connect_git_head"]=connect.returncode==0 and connect.stdout.strip()==CONNECT_SHA
    checks.update(artifacts(CORE_DIR/"al-siddique-backend/src",BACKEND_STAGE,LIVE_BACKEND,NEXT_STAGE))
    checks["current_blue_archive_sha"]=BLUE_ARCHIVE.is_file() and sha(BLUE_ARCHIVE)==BLUE_ARCHIVE_SHA
    checks["current_db_full_acl_dump_sha"]=DB_DUMP.is_file() and sha(DB_DUMP)==DB_DUMP_SHA
    checks["public_next_remains_unchanged"]=(LIVE_NEXT/".next/BUILD_ID").is_file() and (LIVE_NEXT/".next/BUILD_ID").read_text().strip()==BLUE_BUILD
    checks["public_backend_adapter_not_promoted"]=not (LIVE_BACKEND/"src"/REVIEWED[0]).exists()
    return checks

def official_core_gate():
    verifier=CORE_DIR/"ops/release/signed-bluegreen/verify-connect-login-only-core-20261014.py"
    p=run([sys.executable,str(verifier),"--release-id","ASSPS_CONNECT_LOGIN_ONLY_20261015",
           "--approved-proxy-sha256",CONNECT_PROXY_SHA,"--approved-build-id",CONNECT_BUILD],60)
    try:
        result=json.loads(p.stdout)
        return {"status":result.get("status","HOLD"),"blocked":result.get("blocked",[]),
                "exit_code":p.returncode,"source":"official Core read-only verifier"}
    except json.JSONDecodeError:
        return {"status":"HOLD","blocked":["official_verifier_invalid_output"],"exit_code":p.returncode}

def main():
    a=argparse.ArgumentParser()
    a.add_argument("--with-core-gate",action="store_true",help="execute the official read-only Core release verifier")
    opts=a.parse_args()
    checks=current_releases()
    technical=all(checks.values())
    coregate=official_core_gate() if opts.with_core_gate else {"status":"NOT_RUN"}
    result={"gate":"ASSPS_JOINT_CURRENT_LIVE_CANDIDATE_20261015",
            "core_base":CORE_BASE,"connect_source":CONNECT_SHA,
            "reviewed_worker_sha":WORKER_SHA,"private_next_build_id":CONNECT_BUILD,
            "technical_candidate_status":"PASS" if technical else "HOLD",
            "checks":checks,"core_official_gate":coregate,
            "genuine_existing_teacher_password_change_relogin_verified":False,
            "independent_authenticated_peer_school_and_subject_denials_verified":False,
            "independent_human_release_and_rollback_signature_verified":False,
            "public_cutover_performed_by_this_script":False,
            "overall_production_release":"HOLD"}
    print(json.dumps(result,indent=2,sort_keys=True))
    return 0 if technical and (not opts.with_core_gate or coregate["status"]=="HOLD" and coregate.get("exit_code")==2) else 2

if __name__=="__main__":
    sys.exit(main())
