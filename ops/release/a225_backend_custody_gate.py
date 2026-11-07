#!/usr/bin/env python3
"""Read-only whole-backend source custody, mount parity, fail-closed release gate.

No migration, deployment, Git operation, login, or production filesystem write.
Output is a private JSON manifest of relative paths, checksums and safe counters.
"""
from __future__ import annotations
from pathlib import Path
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import stat
import sys

LIVE_DEFAULT=Path('/var/www/apex-backend/src')
MOUNT_RE=re.compile(r'\bmount\(\s*["\x27](/[^"\x27]*)["\x27]\s*,\s*["\x27](\./routes/[A-Za-z0-9_./-]+)["\x27]\s*\)')
def sha256(path):
    h=hashlib.sha256()
    with path.open('rb') as fh:
        for block in iter(lambda:fh.read(256*1024),b''):h.update(block)
    return h.hexdigest()

def index_source(root:Path):
    root=root.resolve(strict=True)
    if not root.is_dir():raise ValueError('SOURCE_ROOT_REQUIRED')
    listing={}
    for p in root.rglob('*.js'):
        if p.is_symlink():raise ValueError('SYMLINKED_JS_DENIED')
        rp=p.relative_to(root)
        if any(x in ('..','.') for x in rp.parts):raise ValueError('PATH_ESCAPE')
        if not p.is_file():raise ValueError('NONFILE_JS_PATH')
        if not p.resolve().is_relative_to(root):raise ValueError('SOURCE_ESCAPE')
        if p.stat().st_size>16*1024*1024:raise ValueError('UNEXPECTED_HUGE_SOURCE')
        listing[rp.as_posix()]={'sha256':sha256(p),'bytes':p.stat().st_size}
    if 'server.js' not in listing:raise ValueError('SERVER_ENTRYPOINT_MISSING')
    return dict(sorted(listing.items()))

def mounted(source:Path,index):
    data=source.joinpath('server.js').read_text(encoding='utf-8')
    entries=[]
    for route,rel in MOUNT_RE.findall(data):
        normalized=rel.removeprefix('./')
        if not normalized.endswith('.js'):normalized+='.js'
        mounted_path=normalized
        entries.append({'prefix':route,'module':mounted_path,'present':mounted_path in index})
    if not entries:raise ValueError('NO_STATIC_MOUNTS_FOUND')
    duplicates=[f'{x["prefix"]}:{x["module"]}' for x in entries]
    if len(duplicates)!=len(set(duplicates)):raise ValueError('DUPLICATED_ROUTE_MOUNT')
    return entries

def compare(live,candidate,main):
    report={}
    for name,other in [('candidate',candidate),('canonicalMain',main)]:
        absent=sorted(set(live)-set(other))
        modified=sorted(k for k in set(live)&set(other) if live[k]['sha256']!=other[k]['sha256'])
        exact=sorted(k for k in set(live)&set(other) if live[k]['sha256']==other[k]['sha256'])
        extra=sorted(set(other)-set(live))
        assert len(absent)+len(modified)+len(exact)==len(live)
        report[name]={
           'filesMissingFromTarget':len(absent),
           'filesDifferentFromLive':len(modified),
           'filesByteIdenticalToLive':len(exact),
           'candidateOnlyFiles':len(extra),
           'missingPathNames':absent,'differentPathNames':modified,'extraPathNames':extra,
           'wholeBackendReconciled':not absent and not modified,
        }
    return report

def evaluate(live_root,candidate_root,main_root):
    live=index_source(live_root)
    candidate=index_source(candidate_root)
    main=index_source(main_root)
    live_mounts=mounted(live_root,live)
    candidate_mounts=mounted(candidate_root,candidate)
    main_mounts=mounted(main_root,main)
    if any(not x['present'] for x in live_mounts):
        raise ValueError('BROKEN_LIVE_ROUTE_MOUNT')
    parity=compare(live,candidate,main)
    live_pairs={(x['prefix'],x['module']) for x in live_mounts}
    candidate_pairs={(x['prefix'],x['module']) for x in candidate_mounts}
    main_pairs={(x['prefix'],x['module']) for x in main_mounts}
    extra_candidate=sorted(candidate_pairs-live_pairs)
    missing_candidate=sorted(live_pairs-candidate_pairs)
    unmatched_files=parity['candidate']['filesMissingFromTarget']+parity['candidate']['filesDifferentFromLive']
    decision='HOLD' if unmatched_files or missing_candidate or extra_candidate or any(not x['present'] for x in candidate_mounts) else 'READY_FOR_INDEPENDENT_CORE_REVIEW'
    return {
      'gate':'A225_WHOLE_BACKEND_CUSTODY_AND_ROUTER_MOUNT_PARITY',
      'checkedUtc':datetime.now(timezone.utc).isoformat(),
      'sourceCounts':{'live':len(live),'candidate':len(candidate),'canonicalMain':len(main)},
      'compare':parity,
      'mounts':{
         'liveCount':len(live_mounts),
         'candidateCount':len(candidate_mounts),
         'canonicalMainCount':len(main_mounts),
         'liveMounts':live_mounts,
         'candidateMounts':candidate_mounts,
         'mainMounts':main_mounts,
         'missingFromCandidate':[{'prefix':p,'module':m} for p,m in missing_candidate],
         'extraInCandidate':[{'prefix':p,'module':m} for p,m in extra_candidate],
         'candidateMissingLiveMounts':len(missing_candidate),
         'candidateExtraMountsNotInLive':len(extra_candidate),
         'candidateMountFilesMissing':sum(not x['present'] for x in candidate_mounts),
         'mainMissingLiveMounts':len(live_pairs-main_pairs),
      },
      'liveFileManifest':live,
      'publicationCertified':False,
      'sourceFreshnessAndRuntimeMemoryIdentityProven':False,
      'offhostDisasterRecoveryCertified':False,
      'fullFrontendBuiltAndAuthenticatedAccepted':False,
      'productionDeploymentAuthorized':False,
      'autoMergeOrFileDeletionAllowed':False,
      'productionWrites':0,
      'release':decision
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--live-root',type=Path,default=LIVE_DEFAULT)
    ap.add_argument('--candidate-root',required=True,type=Path)
    ap.add_argument('--canonical-root',required=True,type=Path)
    ap.add_argument('--out',required=True,type=Path)
    args=ap.parse_args()
    for root in [args.live_root,args.candidate_root,args.canonical_root]:
        if not root.is_dir():raise ValueError('SOURCE_DIR_MISSING')
    out=args.out.resolve(strict=False)
    if out.is_symlink() or (out.parent.exists() and out.parent.is_symlink()):
        raise ValueError('OUTPUT_SYMLINK_DENIED')
    for root in [args.live_root,args.candidate_root,args.canonical_root]:
        if out.is_relative_to(root.resolve()):raise ValueError('NO_WRITES_INSIDE_SOURCE_TREES')
    report=evaluate(args.live_root,args.candidate_root,args.canonical_root)
    out.parent.mkdir(parents=True,exist_ok=True)
    temp=out.with_name(out.name+'.tmp')
    temp.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    os.chmod(temp,0o600);os.replace(temp,out)
    print(json.dumps({'live':report['sourceCounts']['live'],
      'candidate':report['sourceCounts']['candidate'],
      'missing':report['compare']['candidate']['filesMissingFromTarget'],
      'different':report['compare']['candidate']['filesDifferentFromLive'],
      'missingRouteMounts':report['mounts']['candidateMissingLiveMounts'],
      'release':report['release']}))
    return 0 if report['release']=='READY_FOR_INDEPENDENT_CORE_REVIEW' else 3
if __name__=='__main__':
    try:sys.exit(main())
    except Exception as ex:
        print(f'A225 SOURCE CUSTODY FAIL CLOSED: {type(ex).__name__}: {ex}',file=sys.stderr)
        sys.exit(2)
