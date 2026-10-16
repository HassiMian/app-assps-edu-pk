#!/usr/bin/env python3
"""Verify the actual successful isolated Next build; never authorizes production."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

MANIFEST=Path(__file__).with_name("recovery")/"successful-optimized-next-build-20261016.json"
STAGE=Path("/root/workspace/apex-connect-eslint-full-source-reconcile-20261016")
BASE=Path("/root/assps-release-evidence/connect-optimized-next-build-20261016/build-proof")
SOURCE="9fcca4320bdbeb834f6494d1af82d82f1d9b818f"
BUILD_ID="SAsg3cC_el5cq2_nN2a46"
ARTIFACTS={".next/BUILD_ID",".next/server/app/login/page.js",".next/server/app/dashboard/page.js",
           ".next/server/app/api/auth/me/route.js",".next/required-server-files.json",
           "src/generated/buildProvenance.ts","eslint.config.mjs"}
def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1<<20),b""):
            h.update(chunk)
    return h.hexdigest()

def valid(m):
    return (isinstance(m,dict)
        and m.get("schema")=="assps-connect-optimized-next-build-success-v1"
        and m.get("scope")=="COMPILED_ISOLATED_CONNECT_ONLY"
        and m.get("source_commit")==SOURCE and m.get("build_id")==BUILD_ID
        and type(m.get("actual_build_process_exit")) is int and m["actual_build_process_exit"]==0
        and m.get("full_typescript_and_postbuild_observed") is True
        and m.get("private_http_passed")==5
        and m.get("private_https_real_chromium_synthetic_passed")==14
        and all(m.get(k) is False for k in ("signed_staff_login_certified",
          "independent_school2_denial_certified","production_release_authorized",
          "production_changed"))
        and isinstance(m.get("files"),dict) and set(m["files"])==ARTIFACTS
        and all(isinstance(x,str) and len(x)==64 and
                all(c in "0123456789abcdef" for c in x)
                for x in list(m["files"].values())+[m.get("build_log_sha256",""),
                                                    m.get("build_exit_record_sha256","")]))

def verify(m,stage=STAGE,base=BASE):
    if not valid(m) or not stage.is_dir() or stage.is_symlink():
        return False
    try:
        p=subprocess.run(["git","-C",str(stage),"rev-parse","HEAD"],capture_output=True,text=True,timeout=5,check=True)
        if p.stdout.strip()!=SOURCE:
            return False
        for rel,sha in m["files"].items():
            f=stage/rel
            if not f.is_file() or f.is_symlink() or digest(f)!=sha:
                return False
        if (stage/".next/BUILD_ID").read_text().strip()!=BUILD_ID:
            return False
        rc=base.with_suffix(".rc")
        log=base.with_suffix(".log")
        if rc.read_text().strip()!="0" or digest(rc)!=m["build_exit_record_sha256"] or digest(log)!=m["build_log_sha256"]:
            return False
        text=log.read_text()
        return ("Compiled successfully" in text and
                "Finished TypeScript" in text and
                "Generating static pages" in text and
                "NEXT_EXTERNAL_LINKS_NORMALIZED 0" in text and
                SOURCE in (stage/"src/generated/buildProvenance.ts").read_text())
    except (OSError,UnicodeError,subprocess.SubprocessError):
        return False

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--stage",type=Path,default=STAGE)
    p.add_argument("--manifest",type=Path,default=MANIFEST)
    p.add_argument("--build-base",type=Path,default=BASE)
    a=p.parse_args()
    try: ok=verify(json.loads(a.manifest.read_text()),a.stage,a.build_base)
    except (OSError,ValueError):ok=False
    print(json.dumps({"decision":"OPTIMIZED_NEXT_BUILD_PROVENANCE_PASS" if ok else "HOLD",
        "optimized_build_exit_observed":ok,"production_release_authorized":False,
        "independent_security_certified":False,"production_changed":False},sort_keys=True))
    sys.exit(0 if ok else 2)
