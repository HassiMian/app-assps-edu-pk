#!/usr/bin/env python3
"""Read-only audit of protected print/result/fee template source fingerprints.

Never modifies manifest or approved layout source to force a green gate.
A changed template needs historical source-to-owner acceptance reconciliation.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
MANIFEST=ROOT/'docs/template-baseline/TEMPLATE_BASELINE_SHA256_20261005.txt'
ENTRY=re.compile(r'^([a-fA-F0-9]{64})\s+(.+)$')

def parse_manifest(content):
    entries={}
    for line in content.splitlines():
        if not line.strip():continue
        m=ENTRY.fullmatch(line.strip())
        if not m:raise ValueError('Invalid protected template checksum record')
        sha,rel=m.groups()
        rel=rel.strip()
        p=Path(rel)
        if p.is_absolute() or '..' in p.parts or rel in entries or not rel.startswith('al-siddique-frontend/'):
            raise ValueError('Unsafe or duplicate protected template path')
        entries[rel]=sha.lower()
    if not entries:raise ValueError('Protected template baseline is empty')
    return entries

def inspect(root=ROOT,manifest=None):
    src=manifest if manifest is not None else root/'docs/template-baseline/TEMPLATE_BASELINE_SHA256_20261005.txt'
    if not src.is_file() or src.is_symlink():raise RuntimeError('Protected template baseline missing/redirected')
    entries=parse_manifest(src.read_text(encoding='utf-8'))
    changed=[];missing=[]
    for rel,expected in entries.items():
        file=root/rel
        if not file.is_file() or file.is_symlink():
            missing.append(rel)
            continue
        current=hashlib.sha256(file.read_bytes()).hexdigest()
        if current!=expected:changed.append(rel)
    return {'pass':True,'expected_protected_files':len(entries),
            'unchanged_protected_files':len(entries)-len(changed)-len(missing),
            'changed_paths':sorted(changed),'missing_paths':sorted(missing),
            'protected_template_baseline_intact':not changed and not missing,
            'interpretation':'SOURCE_SHA256_MATCH_ONLY_NOT_OWNER_VISUAL_PRINT_SIGNOFF'}

if __name__=='__main__':
    try:print(json.dumps(inspect(),indent=2,sort_keys=True))
    except (OSError,UnicodeError,ValueError,RuntimeError) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
