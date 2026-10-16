#!/usr/bin/env python3
"""Fail-closed, non-public source stage for reviewed Phase 1 worker/lesson repair.

Never edits the running backend, its .env, PostgreSQL, PM2 or Nginx.
This is deliberately NOT a signed production release or an --apply command.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import time

OVERLAYS = (
    'services/ai/aiQueueWorkerDatabase.js',
    'services/ai/paperAiQueue.js',
    'services/lessonPlanningPublicationGuard.js',
    'routes/lessonPlanRoutes.js',
    'routes/opsRoutes.js',
)
ORIGINALS = (
    'services/ai/paperAiQueue.js',
    'routes/lessonPlanRoutes.js',
    'routes/opsRoutes.js',
)
DEFAULT_LIVE = Path('/var/www/apex-backend/src')
PRIVATE_ROOT = Path('/root/assps-release-candidates')
BASE_COMMIT = '418d4cc02e465ee27449675d97bb165a2d82ac05'

def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def git(repo, *args):
    p = subprocess.run(('git', '-C', str(repo), *args), capture_output=True, text=True, timeout=20)
    if p.returncode: raise RuntimeError('Git prerequisite failed: ' + ' '.join(args))
    return p.stdout.strip()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', required=True)
    parser.add_argument('--live-src', default=str(DEFAULT_LIVE))
    parser.add_argument('--expected-live-lessons', required=True)
    parser.add_argument('--expected-live-ops', required=True)
    parser.add_argument('--expected-live-queue', required=True)
    parser.add_argument('--stage', action='store_true', help='Write only a private isolated candidate and rollback archive')
    x = parser.parse_args()
    repo = Path(x.repo).resolve(strict=True)
    live = Path(x.live_src).resolve(strict=True)
    if live != DEFAULT_LIVE: raise RuntimeError('Only the explicitly reviewed live backend source root is supported')
    if git(repo, 'status', '--porcelain'): raise RuntimeError('Candidate source worktree is dirty')
    git(repo, 'merge-base', '--is-ancestor', BASE_COMMIT, 'HEAD')
    commit = git(repo, 'rev-parse', 'HEAD')
    reviewed = repo / 'al-siddique-backend/src'
    original_shas = {
        'routes/lessonPlanRoutes.js': x.expected_live_lessons,
        'routes/opsRoutes.js': x.expected_live_ops,
        'services/ai/paperAiQueue.js': x.expected_live_queue,
    }
    for rel in OVERLAYS:
        source = reviewed / rel
        if not source.is_file() or source.is_symlink(): raise RuntimeError('Reviewed source missing or symlink: ' + rel)
    for rel, expected in original_shas.items():
        f = live / rel
        if not f.is_file() or f.is_symlink() or sha(f) != expected:
            raise RuntimeError('Live source SHA changed; abort without staging: '+rel)
    if any((live/rel).exists() for rel in set(OVERLAYS) - set(ORIGINALS)):
        raise RuntimeError('An additional worker/guard is now live; source reconciliation required')
    verdict = {'decision':'SAFE_TO_STAGE_SOURCE_ONLY','source_commit':commit,
        'reviewed_files':len(OVERLAYS), 'original_live_hashes':original_shas,
        'production_backend_changed':False,'database_changed':False,
        'signed_core_security_certified':False}
    if not x.stage:
        print(json.dumps(verdict,sort_keys=True));return 0
    os.umask(0o077)
    PRIVATE_ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
    stage = PRIVATE_ROOT / ('phase1-backend-green-'+commit[:12])
    if stage.exists() or stage.is_symlink(): raise RuntimeError('Immutable stage already exists; never overwrite')
    temp = PRIVATE_ROOT / ('.staging-phase1-'+commit[:12]+'-'+str(os.getpid()))
    if temp.exists() or temp.is_symlink(): raise RuntimeError('Temporary candidate collision')
    temp.mkdir(mode=0o700)
    try:
        def ignored(directory, names):
            return {n for n in names if n == 'node_modules' or n.startswith('.env') or
                    n.endswith(('.pem','.key','.p12','.pfx')) or
                    (Path(directory)/n).is_symlink()}
        shutil.copytree(live,temp/'src',ignore=ignored,symlinks=False)
        for rel in OVERLAYS:
            dst=temp/'src'/rel
            dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(reviewed/rel,dst)
            if sha(dst)!=sha(reviewed/rel):raise RuntimeError('Staged source parity mismatch: '+rel)
            check=subprocess.run(('node','--check',str(dst)),capture_output=True,text=True,timeout=20)
            if check.returncode:raise RuntimeError('Node syntax failed: '+rel+' '+check.stderr[:300])
        if any((temp/'src'/n).exists() for n in ('.env','.env.production','.env.local')):
            raise RuntimeError('Secret environment copied into stage')
        with tarfile.open(temp/'live-original-three-files.tar.gz','w:gz') as tar:
            for rel in ORIGINALS:tar.add(live/rel,arcname=rel,recursive=False)
        verdict.update(decision='PRIVATE_STAGE_READY_NOT_DEPLOYED',
            stage=str(stage),stage_shas={rel:sha(temp/'src'/rel) for rel in OVERLAYS},
            originals_archive_sha256=sha(temp/'live-original-three-files.tar.gz'),
            created_at_epoch=int(time.time()),runtime_secrets_copied=False)
        (temp/'stage-manifest.json').write_text(json.dumps(verdict,indent=2,sort_keys=True)+'\n')
        os.rename(temp,stage)
        print(json.dumps(verdict,sort_keys=True));return 0
    except BaseException:
        # Retain aborted private data for forensic inspection; NEVER touch live.
        raise

if __name__ == '__main__':
    try:sys.exit(main())
    except Exception as exc:
        print(json.dumps({'decision':'HOLD_NO_PRODUCTION_CHANGE','reason':str(exc)}),file=sys.stderr)
        sys.exit(2)
