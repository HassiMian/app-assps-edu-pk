#!/usr/bin/env python3
"""Read-only reconciliation of current live backend vs a candidate, with no file copy or deletions."""
import hashlib
import json
from pathlib import Path
from collections import Counter
import sys

LIVE=Path('/var/www/apex-backend/src')
CANDIDATE=Path('/root/workspace/assps-unified-production-mission-20261019/al-siddique-backend/src')
EXTENSIONS=frozenset({'.js','.cjs','.mjs','.json'})
EXCLUDED=frozenset({'node_modules','__pycache__','.git'})
INDEPENDENT_PREFIXES=('shared/','services/whatsapp/','services/ai/','runtime/')

def all_sources(root):
    if not root.is_dir() or root.is_symlink():
        raise RuntimeError('Required source root missing or redirected')
    found={}
    for path in root.rglob('*'):
        if path.suffix not in EXTENSIONS or any(x in EXCLUDED for x in path.parts):
            continue
        if path.is_symlink():
            raise RuntimeError('Unexpected symlink in protected source code tree')
        if not path.is_file():
            continue
        rel=path.relative_to(root).as_posix()
        found[rel]=path
    return found

def file_sha(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):
            h.update(block)
    return h.hexdigest()

def compare(live,candidate):
    original=all_sources(live)
    staged=all_sources(candidate)
    preserved=[]
    differing=[]
    live_only=[]
    for rel,path in original.items():
        if rel not in staged:
            live_only.append(rel)
        elif file_sha(path)==file_sha(staged[rel]):
            preserved.append(rel)
        else:
            differing.append(rel)
    staged_only=sorted(set(staged)-set(original))
    # A meaningful safe deployment requires explicit inclusion, with named
    # provenance, of all live-only paths and review of every conflicting path.
    return {
      'live_files':len(original),
      'staged_files':len(staged),
      'byte_identical':len(preserved),
      'different_count':len(differing),
      'live_only_count':len(live_only),
      'staged_only_count':len(staged_only),
      'different_paths':sorted(differing),
      'live_only_by_namespace':dict(Counter(p.split('/')[0] for p in live_only)),
      'independently_owned_live_only_count':sum(p.startswith(INDEPENDENT_PREFIXES) for p in live_only),
      'can_replace_live_tree_wholesale':not differing and not live_only,
      'source_review_required':bool(differing or live_only),
    }

def main():
    x=compare(LIVE,CANDIDATE)
    print(json.dumps(x,indent=2,sort_keys=True))
    raise SystemExit(2 if x['source_review_required'] else 0)

if __name__=='__main__':
    main()
