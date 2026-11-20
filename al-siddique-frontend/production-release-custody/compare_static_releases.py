#!/usr/bin/env python3
"""Read-only delta reporter between two immutable ASSPS production custody snapshots."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load_snapshot(root: Path) -> dict:
    root = root.resolve(strict=True)
    data = json.loads((root/'manifest.json').read_text())
    index = (root/'index.html').read_bytes()
    if hashlib.sha256(index).hexdigest() != data['index_sha256']:
        raise ValueError(f"Invalid index SHA for {root}")
    hit = re.search(rb'<script type="importmap">(.*?)</script>', index, re.S)
    if not hit:
        raise ValueError("No import-map found")
    mapping = json.loads(hit.group(1))['imports']
    if mapping != data['importmap']:
        raise ValueError("Snapshot import-map manifest diverged")
    for record in data['reference_files']:
        rel = record['path']
        if not rel.startswith('/assets/') or '..' in Path(rel).parts:
            raise ValueError("Untrusted asset path")
        file = root/rel.lstrip('/')
        if not file.is_file() or file.is_symlink():
            raise ValueError(f"Missing snapshot asset {rel}")
        if file.stat().st_size != record['bytes'] or sha(file) != record['sha256']:
            raise ValueError(f"Corrupt snapshot asset {rel}")
    return data

def changes(left: dict, right: dict) -> dict:
    leftmap = left['importmap']
    rightmap = right['importmap']
    remapped = [
        {'import_path':key,'previous':leftmap.get(key),'current':rightmap.get(key)}
        for key in sorted(set(leftmap)|set(rightmap))
        if leftmap.get(key)!=rightmap.get(key)
    ]
    oldfiles = {x['path']:x for x in left['all_live_file_inventory']}
    newfiles = {x['path']:x for x in right['all_live_file_inventory']}
    added = sorted(set(newfiles)-set(oldfiles))
    removed = sorted(set(oldfiles)-set(newfiles))
    altered = sorted(x for x in set(oldfiles)&set(newfiles) if oldfiles[x]['sha256']!=newfiles[x]['sha256'])
    olddirect = set(left['entrypoints'])
    newdirect = set(right['entrypoints'])
    return {
        'result':'PASS',
        'previous_release':left['release_id'],
        'current_release':right['release_id'],
        'previous_index_sha256':left['index_sha256'],
        'current_index_sha256':right['index_sha256'],
        'immutable_snapshots_verified':True,
        'previous_inventory':len(oldfiles),
        'current_inventory':len(newfiles),
        'changed_import_map_targets':remapped,
        'direct_assets_added':sorted(newdirect-olddirect),
        'direct_assets_removed':sorted(olddirect-newdirect),
        'files_added_count':len(added),
        'files_removed_count':len(removed),
        'files_modified_count':len(altered),
        'files_added':added[:150],
        'files_removed':removed[:150],
        'files_modified':altered[:150],
        'requires_explicit_release_review':bool(remapped or added or removed or altered),
        'production_changed':False,
    }

def main() -> int:
    arg=argparse.ArgumentParser(description='Compare two immutable static snapshots; no write to VPS.')
    arg.add_argument('--previous',type=Path,required=True)
    arg.add_argument('--current',type=Path,required=True)
    arg.add_argument('--json-out',type=Path)
    args=arg.parse_args()
    before=load_snapshot(args.previous)
    after=load_snapshot(args.current)
    report=changes(before,after)
    text=json.dumps(report,indent=2,ensure_ascii=False)+'\n'
    if args.json_out:
        args.json_out.write_text(text)
    print(text)
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as err:
        print('A335_DELTA_VERIFICATION_FAILURE',str(err),file=sys.stderr)
        sys.exit(2)

