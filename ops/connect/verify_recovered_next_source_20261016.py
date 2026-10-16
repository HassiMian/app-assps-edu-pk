#!/usr/bin/env python3
"""Recreate reviewed Connect source delta against exact clean base; no live writes."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

RECOVERY = Path(__file__).with_name('recovery')
PATCH = RECOVERY / 'reviewed-next-role-neutral-firstlogin-20261016.patch'
MANIFEST = RECOVERY / 'reviewed-next-role-neutral-firstlogin-20261016.manifest.json'

def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def valid_manifest(manifest: dict, patch: bytes) -> bool:
    if (manifest.get('schema') != 'assps-connect-private-next-source-recovery-v1' or
        manifest.get('scope') != 'SOURCE_RECOVERY_ONLY_NOT_RELEASE_AUTHORITY' or
        manifest.get('production_modified') is not False or
        manifest.get('independent_security_certified') is not False or
        manifest.get('patch_sha256') != sha(patch)):
        return False
    for key in ('base_commit', 'reviewed_commit'):
        if not isinstance(manifest.get(key), str) or len(manifest[key]) != 40 or any(c not in '0123456789abcdef' for c in manifest[key]):
            return False
    paths = manifest.get('files')
    if not isinstance(paths, dict) or len(paths) != 10:
        return False
    for p, digests in paths.items():
        path = Path(p)
        if path.is_absolute() or '..' in path.parts or not p.startswith(('src/','next.config.ts','tsconfig.json')) or not isinstance(digests, dict):
            return False
        for key in ('base','reviewed'):
            value=digests.get(key)
            if not isinstance(value,str) or len(value)!=64 or any(c not in '0123456789abcdef' for c in value):
                return False
    return True

def run(repo: Path, manifest_path: Path = MANIFEST, patch_path: Path = PATCH) -> dict:
    result={'scope':'ISOLATED_REVIEWED_NEXT_SOURCE_RECOVERY',
            'source_recovery':'HOLD','production_changed':False,
            'full_release_certified':False,'checks':{}}
    try:
        m=json.loads(manifest_path.read_text())
        patch=patch_path.read_bytes()
        if not valid_manifest(m,patch):
            result['error']='INVALID_SOURCE_MANIFEST_OR_PATCH'
            return result
        base=m['base_commit']
        target=m['reviewed_commit']
        def git(args, *, cwd=None, input_bytes=None):
            return subprocess.run(['git',*args],cwd=cwd or repo,input=input_bytes,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
        if git(['rev-parse','HEAD']).decode().strip()!=target:
            result['error']='STALE_OR_UNREVIEWED_SOURCE_HEAD'
            return result
        result['checks']['reviewed_source_commit_exact']=True
        with TemporaryDirectory(prefix='connect-next-recovery-') as root:
            dest=Path(root)
            for path,digests in m['files'].items():
                data=git(['show',f'{base}:{path}'])
                if sha(data)!=digests['base']:
                    result['error']='BASE_FILE_SHA_MISMATCH'
                    return result
                f=dest/path
                f.parent.mkdir(parents=True,exist_ok=True)
                f.write_bytes(data)
            result['checks']['base_ten_source_hashes']=True
            subprocess.run(['git','apply','--check',str(patch_path)],cwd=dest,check=True,capture_output=True)
            subprocess.run(['git','apply',str(patch_path)],cwd=dest,check=True,capture_output=True)
            for path,digests in m['files'].items():
                expected=digests['reviewed']
                if sha((dest/path).read_bytes())!=expected or sha(git(['show',f'{target}:{path}']))!=expected:
                    result['error']='REPLAYED_FILE_SHA_MISMATCH'
                    return result
            result['checks']['replayed_ten_reviewed_source_hashes']=True
            result['checks']['patch_sha256_verified']=True
        result['source_recovery']='VERIFIED_SOURCE_ONLY'
    except (OSError,ValueError,KeyError,TypeError,json.JSONDecodeError,subprocess.CalledProcessError) as exc:
        result['error']=type(exc).__name__
    return result

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument('--source-repo',type=Path,required=True)
    args=parser.parse_args()
    result=run(args.source_repo.resolve())
    print(json.dumps(result,sort_keys=True,indent=2))
    return 0 if result['source_recovery']=='VERIFIED_SOURCE_ONLY' else 2

if __name__=='__main__':
    sys.exit(main())
