#!/usr/bin/env python3
"""Read-only Core-to-Paper source-forwardport contract and revision check.

Does not modify any worktree, inspect school records or authorize deployment.
Other stream publications need their own independent release acceptance.
"""
import json
from pathlib import Path
import subprocess
import sys

REPO=Path('/root/workspace/assps-core-next-three-gates-20261012')
FORWARDPORT_BASE_SHA='e3030c1c519ec79ccc0f688bccc6a676a646b8f9'
PAPER_SHA='921acf05e523665e132fe2f0cc4a398724789903'
CORE_REF='fix/core-rls-clone-candidate-and-ops-20261012'
PAPER_REF='test/paper-core-rls77-forwardport-20261012'
ALLOWED_PREFIXES=('al-siddique-frontend/src/Modules/Paper-Generator/',
                  'docs/coordination/PAPER_STUDIO_', 'ops/paper-studio/')

def run_git(*args,timeout=12):
    p=subprocess.run(['git','-C',str(REPO),*args],capture_output=True,text=True,timeout=timeout)
    if p.returncode:raise RuntimeError('Source revision or remote verification command failed')
    return p.stdout.strip()

def classify(local_core,remote_core,local_paper,remote_paper,changed,dirty,core_parent):
    problems=[]
    if local_core!=remote_core or not local_core:problems.append('core_source_or_origin_sha_drift')
    if local_paper!=PAPER_SHA or remote_paper!=PAPER_SHA:problems.append('paper_source_or_origin_sha_drift')
    if dirty:problems.append('core_source_worktree_dirty')
    if core_parent is False:problems.append('canonical_core_or_forwardport_base_ancestry_missing')
    if not changed:problems.append('paper_forwardport_contains_no_diff')
    unauthorized=[p for p in changed if not p.startswith(ALLOWED_PREFIXES)]
    if unauthorized:problems.append('cross_owner_modifications='+','.join(unauthorized[:12]))
    return {'status':'PASS_SOURCE_BOUNDARY_ONLY' if not problems else 'HOLD',
            'issues':problems,'paper_only_change_count':len(changed),
            'read_only':True,'core_owns_production':True,
            'paper_live_deployment_certified':False}

def main():
    try:
        local_core=run_git('rev-parse','HEAD')
        local_paper=run_git('rev-parse',PAPER_SHA)
        remote=run_git('ls-remote','--heads','origin',CORE_REF,PAPER_REF)
        refs=dict((line.split('\t',1)[1],line.split('\t',1)[0]) for line in remote.splitlines())
        changed=run_git('diff','--name-only',FORWARDPORT_BASE_SHA,PAPER_SHA).splitlines()
        dirty=bool(run_git('status','--porcelain'))
        parent=subprocess.run(['git','-C',str(REPO),'merge-base','--is-ancestor',
                               FORWARDPORT_BASE_SHA,'HEAD'],
                               capture_output=True,timeout=8).returncode==0
        outcome=classify(local_core,refs.get('refs/heads/'+CORE_REF),
                         local_paper,refs.get('refs/heads/'+PAPER_REF),changed,dirty,parent)
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as ex:
        outcome={'status':'HOLD','issues':['source_inspection_failed:'+type(ex).__name__],
                 'read_only':True,'paper_live_deployment_certified':False}
    print(json.dumps(outcome,sort_keys=True))
    return 0 if outcome['status']=='PASS_SOURCE_BOUNDARY_ONLY' else 2
if __name__=='__main__':sys.exit(main())
