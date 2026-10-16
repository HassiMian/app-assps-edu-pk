#!/usr/bin/env python3
"""Private repeatable Grade IX/X QA in disposable source copy. No publisher signing."""
from __future__ import annotations
import argparse,datetime as dt,hashlib,json,os
from pathlib import Path
import shutil,subprocess,sys,tempfile

SOURCE=Path("/root/workspace/assps-core-school-zero-human-20261016")
ROOT=Path("/var/lib/assps-grade910-weekly-qa")
RUNNER="ops/qbank/run-grade910-academic-mission.cjs"
FROZEN_ANCESTOR="4cc2c4d4fcb1e8cbb4aa9bd344fd5769cb7bedc8"
EXPRESS=Path("/var/www/apex-backend/node_modules")
FROZEN_RECEIPT="BLOCK_PUBLICATION_PENDING_AUTHENTICATED_SCHOOL_ADOPTION_AND_HUMAN_REVIEW"

def run(args,**kwargs):
    return subprocess.run([str(x) for x in args],capture_output=True,text=True,**kwargs)

def preflight():
    if not (SOURCE/RUNNER).is_file():raise RuntimeError("QA_RUNNER_MISSING")
    if not (EXPRESS/"express/package.json").is_file():raise RuntimeError("BACKEND_QA_DEPENDENCIES_MISSING")
    p=run(["git","-C",SOURCE,"status","--porcelain"],timeout=15)
    if p.returncode or p.stdout.strip():raise RuntimeError("CANONICAL_SOURCE_NOT_CLEAN")
    sha=run(["git","-C",SOURCE,"rev-parse","HEAD"],timeout=15).stdout.strip()
    p=run(["git","-C",SOURCE,"merge-base","--is-ancestor",FROZEN_ANCESTOR,sha],timeout=15)
    if p.returncode:raise RuntimeError("CANONICAL_SOURCE_ANCESTRY_NOT_VERIFIED")
    p=run(["node","-e",f"const p=require('{SOURCE/RUNNER}').plan();if(p.academicSourceFiles<84||p.stagingTestFiles!==111)process.exit(1);console.log(JSON.stringify({{academic:p.academicSourceFiles,staging:p.stagingTestFiles}}))"],timeout=15)
    if p.returncode:raise RuntimeError("GRADE910_SOURCE_TEST_INVENTORY_DRIFT")
    return sha

def receipt_write(path:Path,value:dict):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=".candidate-",dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,"w") as f:
            json.dump(value,f,sort_keys=True,indent=2);f.write("\n");f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def inspect_audit(path:Path):
    data=json.loads(path.read_text())
    batches=data.get("batches",[])
    passed=sum(x.get("passedGate") is True for x in batches)
    tests=sum(int(x.get("tests") or 0) for x in batches)
    successes=sum(int(x.get("passed") or 0) for x in batches)
    failed=sum(int(x.get("failed") or 0) for x in batches)
    verified=(data.get("allSourceTestsCompleted") is True
        and data.get("qualityGatesPassed") is True and len(batches)==30 and passed==30
        and tests==successes and failed==0
        and data.get("academicallyApproved")==0
        and data.get("verifiedPublished")==0
        and data.get("releaseDecision")==FROZEN_RECEIPT
        and data.get("deployment") is False)
    return {"qualityVerified":verified,"batches":len(batches),"passedBatches":passed,
            "tapTests":tests,"tapPassed":successes,"tapFailed":failed,
            "sourceReceiptSHA256":hashlib.sha256(path.read_bytes()).hexdigest(),
            "academicallyApproved":data.get("academicallyApproved"),
            "verifiedPublished":data.get("verifiedPublished"),
            "publicationDecision":data.get("releaseDecision")}

def clean_old_runs(keep=2):
    runs=sorted((p for p in ROOT.glob("run-*") if p.is_dir()),key=lambda p:p.name,reverse=True)
    for p in runs[keep:]:
        if p.parent!=ROOT:raise RuntimeError("UNSAFE_CLEANUP_TARGET")
        shutil.rmtree(p)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    parser.add_argument("--smoke",action="store_true")
    parser.add_argument("--run",action="store_true")
    args=parser.parse_args()
    if sum(bool(x) for x in (args.check,args.smoke,args.run))!=1:
        parser.error("choose exactly one")
    try:
        head=preflight()
        if args.check:
            print(json.dumps({"decision":"READY_TO_RUN","head":head,"productionMutation":False}))
            return 0
        ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
        dest=Path(tempfile.mkdtemp(prefix="run-",dir=ROOT))
        os.chmod(dest,0o700)
        # Only this disposable copy receives test-generated source/review fixture changes.
        stage=dest/"source"
        shutil.copytree(SOURCE,stage,symlinks=True,
                        ignore=shutil.ignore_patterns("node_modules","dist","__pycache__"))
        # Bind preinstalled dependencies read-only; never npm install or mutate production node_modules.
        (stage/"al-siddique-backend/node_modules").symlink_to(EXPRESS,target_is_directory=True)
        frontend_deps=SOURCE/"al-siddique-frontend/node_modules"
        if frontend_deps.exists():
            (stage/"al-siddique-frontend/node_modules").symlink_to(frontend_deps.resolve(),target_is_directory=True)
        if args.smoke:
            p=run(["node","--test","ops/tests/grade910-draft-selector-http.test.cjs"],cwd=stage,timeout=45)
            receipt={"decision":"SMOKE_PASS" if p.returncode==0 else "SMOKE_FAIL",
                     "sourceSHA":head,"productionMutation":False,"approved":False,
                     "details":(p.stdout+p.stderr)[-1600:]}
            receipt_write(dest/"smoke-receipt.json",receipt)
            print(json.dumps({k:v for k,v in receipt.items() if k!="details"}))
            clean_old_runs()
            return 0 if p.returncode==0 else 3
        env=dict(os.environ,ASSPS_GRADE910_EVIDENCE_DIR=str(dest/"evidence"))
        p=subprocess.run(["node",RUNNER],cwd=stage,env=env,stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE,text=True,timeout=2400)
        target=dest/"evidence/mission-audit.json"
        audit=inspect_audit(target) if target.exists() else {"qualityVerified":False}
        receipt={"decision":"QA_PASSED_NO_AUTOMATIC_ACADEMIC_PUBLICATION"
                 if p.returncode==0 and audit.get("qualityVerified")
                 else "QA_FAILED_HOLD_PUBLICATION",
                 "observedUTC":dt.datetime.now(dt.timezone.utc).isoformat(),
                 "sourceSHA":head,"productionMutation":False,"printerJob":False,
                 "schoolPrincipalAcceptance":"CARRIED_FORWARD_DO_NOT_REASK",
                 "academicSourceChecks":audit,
                 "runnerExit":p.returncode,
                 "stderrTail":p.stderr[-500:]}
        receipt_write(ROOT/"latest.json",receipt)
        receipt_write(dest/"receipt.json",receipt)
        # Limit retained private evidence; fixed source never changed.
        shutil.rmtree(stage)
        clean_old_runs()
        print(json.dumps({k:v for k,v in receipt.items() if k!="stderrTail"}))
        return 0 if receipt["decision"]=="QA_PASSED_NO_AUTOMATIC_ACADEMIC_PUBLICATION" else 3
    except Exception as e:
        if args.check:print(json.dumps({"decision":"HOLD", "reason":str(e)[:240]}));return 3
        ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
        receipt={"decision":"QA_FAILED_HOLD_PUBLICATION","observedUTC":dt.datetime.now(dt.timezone.utc).isoformat(),
                 "reason":str(e)[:240],"productionMutation":False}
        receipt_write(ROOT/"latest.json",receipt)
        print(json.dumps(receipt))
        return 3
if __name__=="__main__":sys.exit(main())
