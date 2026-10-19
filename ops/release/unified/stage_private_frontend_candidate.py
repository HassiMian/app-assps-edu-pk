#!/usr/bin/env python3
"""Privately stage exact current frontend build minus prohibited static media.

NO /var/www mutation, NO reload, NO deployment, NO public Git push.
Not a production release certificate; authenticated signature delivery remains blocked.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import tarfile
import tempfile
from datetime import datetime, timezone
import verify_frontend_artifact_closure_readonly as provenance

ARCHIVE_PARENT=Path('/root/secure-archive/assps-unified-20261019')
PROHIBITED_TERMS=('signature','credentials','private_key','.env','.pfx','.p12','.pem')

def sensitive(name):
    return any(s in name.casefold() for s in PROHIBITED_TERMS)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def private_stage(base, parent, name):
    parent=Path(parent).resolve(strict=True)
    if not parent.is_dir() or parent.is_symlink():
        raise ValueError('Trusted private staging parent is missing')
    if not name.startswith('verified-clean-front-') or not all(c.isalnum() or c in '-_' for c in name):
        raise ValueError('Invalid private candidate name')
    destination=parent/name
    if destination.exists() or destination.is_symlink():
        raise ValueError('Refusing to overwrite an existing private candidate')
    base=Path(base)
    tarpath=base/'verified-source-build.tar.gz'
    receipt=(base/'ARCHIVE.sha256').read_text()
    if sha(tarpath.read_bytes()) not in receipt:
        raise ValueError('Trusted upstream frontend tar digest mismatch')
    manifest=provenance.read_manifest(base/'BUILT_ASSET_SHA256SUMS')
    provenance.verify_tar(tarpath,manifest)
    omitted=[k for k in manifest if sensitive(k)]
    if not omitted:
        raise ValueError('No prohibited media identified; review the release contract before staging')
    sanitized={k:v for k,v in manifest.items() if k not in omitted}
    if 'index.html' not in sanitized:
        raise ValueError('Sensitive exclusion would remove the SPA index')
    tmp=Path(tempfile.mkdtemp(prefix='.assps-clean-staging-',dir=str(parent)))
    try:
        files=tmp/'site'
        files.mkdir(mode=0o700)
        with tarfile.open(tarpath,mode='r:gz') as tar:
            for member in tar:
                if not member.isfile():
                    continue
                path=provenance.safe_member_name(member.name)
                if path not in sanitized:
                    continue
                data=tar.extractfile(member).read()
                if sha(data)!=sanitized[path]:
                    raise ValueError('Input tar changed since independent manifest verification')
                target=files/path
                target.parent.mkdir(parents=True,exist_ok=True)
                with target.open('xb') as f:
                    f.write(data)
                os.chmod(target,0o440)
        filecount=sum(p.is_file() for p in files.rglob('*'))
        if filecount!=len(sanitized) or any(sensitive(str(p.relative_to(files))) for p in files.rglob('*') if p.is_file()):
            raise ValueError('Clean staged file set not verified')
        for path in sorted([*files.rglob('*'),files],key=lambda p:len(p.parts),reverse=True):
            if path.is_dir():
                os.chmod(path,0o550)
        references=0
        # Count explicit references to private filenames in other packaged assets.
        # This count is a HOLD indicator; do not leak filenames/content in reports.
        for p in files.rglob('*'):
            if p.is_file() and p.suffix in ('.js','.css','.html'):
                content=p.read_bytes().lower()
                for private_path in omitted:
                    if Path(private_path).name.lower().encode() in content:
                        references+=1
        receipt={
            'schema':'ASSPS_PRIVATE_SANITIZED_FRONTEND_CANDIDATE_V1',
            'source_commit':'3f7fbfa4ed0cf893a83f0805f182f9d7264c069f',
            'source_archive_sha256':sha(tarpath.read_bytes()),
            'original_packaged_count':len(manifest),
            'excluded_protected_media_count':len(omitted),
            'staged_public_asset_count':filecount,
            'staged_index_sha256':sanitized['index.html'],
            'sensitive_static_asset_present':False,
            'unresolved_private_static_references':references,
            'safe_to_deploy':False,
            'site_active_release_changed':False,
            'created_utc':datetime.now(timezone.utc).isoformat(),
        }
        (tmp/'STAGING_RECEIPT.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
        (tmp/'STAGED_SHA256SUMS').write_text(''.join(
            f"{value}  site/{k}\n" for k,value in sorted(sanitized.items())))
        # Root-only archive, no public URL or uncontrolled Nginx root switch.
        os.chmod(tmp/'STAGING_RECEIPT.json',0o400)
        os.chmod(tmp/'STAGED_SHA256SUMS',0o400)
        os.chmod(tmp,0o700)
        os.rename(tmp,destination)
        return receipt
    except Exception:
        # Only newly created private temp staging directory may be removed.
        shutil.rmtree(tmp,ignore_errors=True)
        raise

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--candidate-name',required=True)
    p=parser.parse_args()
    try:
        result=private_stage(provenance.BASE,ARCHIVE_PARENT,p.candidate_name)
        print(json.dumps(result,indent=2,sort_keys=True))
    except (OSError,ValueError,tarfile.TarError) as e:
        print(json.dumps({'status':'PRIVATE_STAGE_HOLD','error_type':type(e).__name__}))
        raise SystemExit(3)

if __name__=='__main__':
    main()
