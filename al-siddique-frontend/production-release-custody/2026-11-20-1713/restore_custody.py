#!/usr/bin/env python3
"""Safely restore vetted ASSPS static release into isolated scratch only."""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import tarfile
from pathlib import Path

def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only validation + isolated recovery rehearsal")
    parser.add_argument('--snapshot',type=Path,required=True)
    parser.add_argument('--archive',type=Path,required=True)
    parser.add_argument('--destination',type=Path,required=True)
    args=parser.parse_args()
    snap=args.snapshot.resolve(strict=True)
    archive=args.archive.resolve(strict=True)
    dest=args.destination.resolve(strict=False)
    parent=Path('/root/workspace').resolve(strict=True)
    if dest.parent != parent or not dest.name.startswith('assps-a335-restore-'):
        raise ValueError('Destination must be isolated /root/workspace/assps-a335-restore-*')
    if dest.is_symlink():
        raise ValueError('Symlink destination refused')
    if dest.exists():
        if not dest.is_dir() or any(dest.iterdir()):
            raise ValueError('Destination is not an empty directory')
    checker=snap/'verify_release.py'
    if not checker.is_file():
        raise ValueError('Snapshot verifier unavailable')
    check=subprocess.run([sys.executable,str(checker),'--snapshot',str(snap),'--archive',str(archive)],capture_output=True,text=True,timeout=100)
    if check.returncode:
        raise ValueError('Source archive failed verification: '+check.stderr[-600:])
    dest.mkdir(mode=0o700,parents=False,exist_ok=True)
    count=0
    with tarfile.open(archive,'r:gz') as tar:
        for member in tar:
            name=member.name.removeprefix('./')
            if not name or name=='.':
                continue
            parts=Path(name).parts
            if member.name.startswith('/') or '..' in parts or len(parts)==0:
                raise ValueError('Unsafe tar member: '+member.name)
            target=dest.joinpath(*parts)
            if not target.resolve(strict=False).is_relative_to(dest):
                raise ValueError('Tar path escaped destination')
            if member.isdir():
                target.mkdir(parents=True,exist_ok=True)
                continue
            if not member.isfile():
                raise ValueError('Unsupported tar entry '+member.name)
            target.parent.mkdir(parents=True,exist_ok=True)
            with tar.extractfile(member) as source, open(target,'xb') as output:
                for block in iter(lambda:source.read(262144),b''):
                    output.write(block)
            os.chmod(target,0o644)
            count+=1
    checked=subprocess.run([sys.executable,str(checker),'--snapshot',str(snap),'--live',str(dest)],capture_output=True,text=True,timeout=100)
    if checked.returncode:
        raise ValueError('Restored static tree verification failed: '+checked.stderr[-600:])
    result=json.loads(checked.stdout)
    print(json.dumps({'result':'PASS','restored_files':count,'verified_files':result['live_files_verified'],'destination':str(dest),'production_deployment':'NOT_PERFORMED'},indent=2))
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as exc:
        print('ASSPS_A335_RESTORE_BLOCKED',str(exc),file=sys.stderr)
        sys.exit(2)

