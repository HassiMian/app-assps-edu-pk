#!/usr/bin/env python3
"""Detailed, read-only source vs deployed immutable release compatibility checklist."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

def run():
    p=argparse.ArgumentParser()
    p.add_argument('--snapshot',required=True,type=Path)
    p.add_argument('--candidate',required=True,type=Path)
    p.add_argument('--output',required=True,type=Path)
    a=p.parse_args()
    snap=a.snapshot.resolve(strict=True)
    spec=importlib.util.spec_from_file_location('release_guard_local',snap/'release_guard.py')
    if not spec or not spec.loader:raise ValueError('Verifier unavailable')
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    result=mod.analyze(snap,a.candidate.resolve(strict=True))
    groups={
       'P0 Missing runtime scripts and styles':[],
       'P0 Active import-map aliases':[],
       'P1 Missing referenced assets':[],
       'P1 Changed reference asset hashes':[],
       'Other':[],
    }
    for item in result['blockers']:
        if item.startswith('Missing deployed script/style:'):name=list(groups)[0]
        elif item.startswith('Missing or changed import-map overlay:'):name=list(groups)[1]
        elif item.startswith('Missing deployed asset:'):name=list(groups)[2]
        elif item.startswith('Changed asset hash:'):name=list(groups)[3]
        else:name='Other'
        groups[name].append(item)
    count=sum(len(x) for x in groups.values())
    if count!=result['blockers_total']:raise ValueError('Truncated failures: source gate must enumerate all')
    lines=[
        '# A335 Source-to-production reconciliation backlog',
        '',
        'Snapshot: '+result['release'],
        '',
        'Snapshot index SHA256: '+result['snapshot_index_sha'],
        '',
        'Candidate index SHA256: '+result['candidate_index_sha'],
        '',
        'Unresolved release compatibility checks: '+str(count),
        '',
        'Release gate: HOLD. This is a record of compatibility checks, not '+str(count)+' separate product bugs.',
        '',
        'Preserve real paper edit/save/reopen/print, Diary and unsaved-draft recovery. Changes require source implementation, regression tests and a new vetted release. Never deploy a general clean source build while mismatches remain.',
        '',
    ]
    for title,items in groups.items():
        if not items:continue
        lines += ['## '+title+' ('+str(len(items))+')','']
        lines += [str(i)+'. '+v for i,v in enumerate(items,1)]
        lines.append('')
    lines+=['## Release controls','',
      '1. Reconcile existing tested overlays into the canonical source while preserving school RBAC, tenant boundaries and original paper revision identity.',
      '2. Run parser unit tests, source navigation/Diary stylesheet checksum tests and a clean frontend build.',
      '3. Verify 61 navigation routes desktop/mobile, Paper Studio tabs, original paper editing and dual-medium printing.',
      '4. Re-run release guard. Do not promote while source-to-production parity is BLOCK.',
      '5. If another agent changes live files, capture new immutable evidence rather than overwrite newer production.',
      '']
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps({'blockers':count,'categories':{k:len(v) for k,v in groups.items()},'output':str(a.output),'production_writes':0}))
    return 0

if __name__=='__main__':
    try:sys.exit(run())
    except Exception as e:
        print('A335_PARITY_BACKLOG_ERROR',str(e),file=sys.stderr)
        sys.exit(2)

