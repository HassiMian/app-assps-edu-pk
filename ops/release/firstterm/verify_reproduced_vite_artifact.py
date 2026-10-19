#!/usr/bin/env python3
"""Static Vite build provenance: fail unless the entire deployed artifact matches a reproducible source build."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

def inventory(path):
    root=Path(path)
    if not root.is_dir() or root.is_symlink():
        raise ValueError("INVALID_BUILD_ROOT")
    out={}
    for p in root.rglob("*"):
        if p.is_symlink():
            raise ValueError("SYMLINK_IN_ARTIFACT")
        if not p.is_file():
            continue
        rel=p.relative_to(root).as_posix()
        out[rel]=hashlib.sha256(p.read_bytes()).hexdigest()
    if "index.html" not in out:
        raise ValueError("NO_INDEX_HTML")
    return out

def check(live,reproduced):
    try:
        x=inventory(live)
        y=inventory(reproduced)
        shared=set(x)&set(y)
        changed=sorted(k for k in shared if x[k]!=y[k])
        added=sorted(set(x)-set(y))
        missing=sorted(set(y)-set(x))
        result={"status":"PASS" if not (changed or added or missing) else "HOLD",
                "reason":"FULL_ARTIFACT_BYTE_PARITY" if not (changed or added or missing) else "UNATTESTED_ARTIFACT_DIFFERENCE",
                "live_files":len(x),"reproduced_files":len(y),
                "identical_files":sum(x[k]==y[k] for k in shared),
                "changed_paths":changed[:15],
                "extra_live_count":len(added),"missing_live_count":len(missing)}
        return result
    except (OSError,ValueError) as exc:
        return {"status":"HOLD","reason":"ARTIFACT_PROVENANCE_CHECK_ERROR","error_class":type(exc).__name__}

if __name__=="__main__":
    a=argparse.ArgumentParser()
    a.add_argument("--live-dir",required=True)
    a.add_argument("--reproduced-dir",required=True)
    args=a.parse_args()
    r=check(args.live_dir,args.reproduced_dir)
    print(json.dumps(r,sort_keys=True))
    sys.exit(0 if r["status"]=="PASS" else 2)
