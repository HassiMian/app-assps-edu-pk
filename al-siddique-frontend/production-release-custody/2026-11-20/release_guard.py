#!/usr/bin/env python3
"""Read-only deployment gate for ASSPS's current vetted static release."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def parse_index(content: bytes) -> tuple[dict, set[str]]:
    hit = re.search(rb'<script type="importmap">(.*?)</script>', content, re.S)
    mapping = json.loads(hit.group(1))['imports'] if hit else {}
    direct = {x.decode() for x in re.findall(rb'<(?:script|link)[^>]+(?:src|href)="(/assets/[^"]+)', content)}
    return mapping, direct

def analyze(snapshot: Path, candidate: Path, replace_index: bytes | None = None) -> dict:
    metadata = json.loads((snapshot/'manifest.json').read_text())
    good = replace_index if replace_index is not None else (candidate/'index.html').read_bytes()
    expected_bytes = (snapshot/'index.html').read_bytes()
    expected_imports, expected_direct = parse_index(expected_bytes)
    got_imports, got_direct = parse_index(good)
    missing_scripts = sorted(expected_direct - got_direct)
    missing_overrides = sorted(k for k,v in expected_imports.items() if got_imports.get(k)!=v)
    failures = []
    for item in missing_scripts:
        failures.append('Missing deployed script/style: '+item)
    for key in missing_overrides:
        failures.append('Missing or changed import-map overlay: '+key+' -> '+expected_imports[key])
    for record in metadata['reference_files']:
        rel = record['path']
        if not rel.startswith('/assets/') or '..' in Path(rel).parts:
            failures.append('Invalid release reference: '+rel)
            continue
        target = candidate/rel.lstrip('/')
        if not target.is_file() or target.is_symlink():
            failures.append('Missing deployed asset: '+rel)
        elif sha(target.read_bytes()) != record['sha256']:
            failures.append('Changed asset hash: '+rel)
    return dict(
        verdict='PASS' if not failures else 'BLOCK',
        release=metadata['release_id'],
        snapshot_index_sha=metadata['index_sha256'],
        candidate_index_sha=sha(good),
        critical_direct_entries=len(expected_direct),
        critical_import_map_entries=len(expected_imports),
        dependency_integrity=len(metadata['reference_files']),
        blockers_total=len(failures),
        blockers=failures[:25],
        no_production_modifications=True,
    )

def main() -> int:
    p=argparse.ArgumentParser()
    p.add_argument('--snapshot',required=True,type=Path)
    p.add_argument('--candidate',type=Path)
    p.add_argument('--self-test',action='store_true')
    args=p.parse_args()
    root=args.snapshot.resolve(strict=True)
    if args.self_test:
        original=(root/'index.html').read_bytes()
        _, scripts=parse_index(original)
        entry=next((x for x in scripts if 'assps-a336-unified-navigation' in x),None)
        if not entry:
            raise ValueError('Navigation anchor missing from snapshot')
        altered=original.replace(entry.encode(),b'/assets/NOT_DEPLOYED.js',1)
        result=analyze(root,root,altered)
        if result['verdict']!='BLOCK' or result['blockers_total']<1:
            raise ValueError('Gate self-test failed to detect missing navigation')
        print(json.dumps({'self_test':'PASS','blocked_mutant':True,'reason':result['blockers'][0]}))
        return 0
    if not args.candidate:
        p.error('--candidate is required unless --self-test is supplied')
    result=analyze(root,args.candidate.resolve(strict=True))
    print(json.dumps(result,indent=2))
    return 0 if result['verdict']=='PASS' else 2

if __name__=='__main__':
    try: sys.exit(main())
    except Exception as exc:
        print('ASSPS_A335_RELEASE_GUARD_ERROR',str(exc),file=sys.stderr)
        sys.exit(3)\n