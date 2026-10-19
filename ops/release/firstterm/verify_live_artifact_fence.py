#!/usr/bin/env python3
"""Read-only ASSPS frontend source-attestation fence. NEVER alters live files."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT_PATTERN=re.compile(r"(?m)^\s*root\s+([^;\s]+)\s*;")

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def known_commit(repo, commit):
    if not re.fullmatch(r"[0-9a-f]{40}", str(commit or "")):
        return False
    r=subprocess.run(["git","-C",str(repo),"cat-file","-e",str(commit)+"^{commit}"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False)
    return r.returncode==0

def check(nginx, repo):
    try:
        raw=Path(nginx).read_text(encoding="utf-8")
        roots=ROOT_PATTERN.findall(raw)
        if len(roots)!=1:
            return {"status":"HOLD","reason":"AMBIGUOUS_NGINX_ROOT","observed_roots":len(roots)}
        root=Path(roots[0])
        if not root.is_absolute():
            return {"status":"HOLD","reason":"NONABSOLUTE_ROOT"}
        html=root/"index.html"
        att=root/"assps-release-attestation.json"
        if not html.is_file() or not att.is_file():
            return {"status":"HOLD","reason":"MISSING_LIVE_INDEX_OR_ATTESTATION","root":str(root)}
        actual_before=sha(html)
        try:
            meta=json.loads(att.read_text(encoding="utf-8"))
        except (ValueError,UnicodeError):
            return {"status":"HOLD","reason":"MALFORMED_ATTESTATION","root":str(root)}
        actual_after=sha(html)
        claimed=meta.get("frontend_index_sha256")
        commit=meta.get("candidate_commit")
        checks={
            "stable_index":actual_before==actual_after,
            "sha_attested":isinstance(claimed,str) and re.fullmatch(r"[0-9a-f]{64}",claimed) is not None and claimed==actual_after,
            "source_commit_local_object":known_commit(repo,commit),
        }
        return {"status":"PASS" if all(checks.values()) else "HOLD",
                "reason":"SOURCE_ATTESTATION_CONSISTENT_ONLY" if all(checks.values()) else "LIVE_ARTIFACT_PROVENANCE_MISMATCH",
                "root":str(root),"actual_index_sha256":actual_after,
                "claimed_index_sha256":claimed,"candidate_commit":commit,"checks":checks}
    except (OSError,PermissionError) as exc:
        return {"status":"HOLD","reason":"READONLY_INSPECTION_FAILED","error_type":type(exc).__name__}

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--nginx",required=True)
    p.add_argument("--repo",required=True)
    args=p.parse_args(argv)
    result=check(args.nginx,args.repo)
    print(json.dumps(result,sort_keys=True))
    # PASS means metadata is consistent with local source object, not proof built assets derive from that commit.
    return 0 if result["status"]=="PASS" else 2
if __name__=="__main__":
    sys.exit(main())
