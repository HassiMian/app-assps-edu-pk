#!/usr/bin/env python3
"""SaaS Core, READ-ONLY Connect green boot recipe consistency; never restart or deploy."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import stat
import subprocess
import sys

ROOT = Path('/var/www/apex-connect')
CONFIG = ROOT / 'ecosystem.connect.config.cjs'
PM2_DUMP = Path('/root/.pm2/dump.pm2')
BACKUP = Path('/root/assps-release-evidence/core-connect-green-runtime-guard-20261017/ecosystem.connect.config.original.cjs')
PATCH_META = BACKUP.with_name('config-guard-metadata.json')
KNOWN_CONFIG_SHA = '9b36d91f1b030bc3bc574729a72bc4cd306bd2a3b170c467eb08a1abd6be4f44'


def safe_regular_file(path, private=False):
    f = path.lstat()
    if not stat.S_ISREG(f.st_mode) or f.st_uid != 0 or (f.st_mode & 0o022):
        raise ValueError('UNTRUSTED_STARTUP_FILE')
    if private and stat.S_IMODE(f.st_mode) != 0o600:
        raise ValueError('UNSAFE_PRIVATE_BACKUP_PERMISSIONS')
    return path.read_bytes()


def config_is_reviewed(config_bytes, stable_manifest_present, stable_build_present):
    if hashlib.sha256(config_bytes).hexdigest() != KNOWN_CONFIG_SHA:
        raise ValueError('STARTUP_RECIPE_SHA_DRIFT')
    text = config_bytes.decode('utf-8')
    if text.count("NEXT_DIST_DIR: '.next'") != 1 or '.next-candidate' in text:
        raise ValueError('CONNECT_CANDIDATE_STARTUP_RISK')
    if not stable_manifest_present or not stable_build_present:
        raise ValueError('APPROVED_STABLE_NEXT_BUILD_MISSING')
    return True


def check_pm2(public_values, saved_values):
    if not isinstance(public_values,list) or not isinstance(saved_values,list):
        raise ValueError('BAD_PM2_METADATA')
    now = [p for p in public_values if p.get('name') == 'apex-connect-green']
    previous = [p for p in saved_values if p.get('name') == 'apex-connect-green']
    if len(now)!=1 or len(previous)!=1:
        raise ValueError('GREEN_PROCESS_NOT_UNIQUE_OR_NOT_SAVED')
    a = now[0].get('pm2_env',{})
    b = previous[0]
    if a.get('status')!='online' or a.get('NEXT_DIST_DIR')!='.next' or str(a.get('APP_PORT'))!='3002':
        raise ValueError('RUNTIME_GREEN_DIST_OR_PORT_DRIFT')
    if b.get('NEXT_DIST_DIR')!='.next' or str(b.get('APP_PORT'))!='3002':
        raise ValueError('PERSISTED_GREEN_DIST_OR_PORT_DRIFT')
    if b.get('pm_cwd')!='/var/www/apex-connect' or a.get('pm_cwd')!='/var/www/apex-connect':
        raise ValueError('GREEN_RUNTIME_CWD_DRIFT')
    if type(a.get('restart_time')) is not int or a['restart_time']<0:
        raise ValueError('INVALID_PM2_RESTART_COUNT')
    return a['restart_time']


def read_live_status():
    config = safe_regular_file(CONFIG)
    stable=ROOT/'.next'
    config_is_reviewed(config,
        (stable/'required-server-files.json').is_file() and not (stable/'required-server-files.json').is_symlink(),
        (stable/'BUILD_ID').is_file() and not (stable/'BUILD_ID').is_symlink())
    original = safe_regular_file(BACKUP, private=True)
    meta = json.loads(safe_regular_file(PATCH_META, private=True))
    if hashlib.sha256(original).hexdigest()!=meta.get('before_sha256') or hashlib.sha256(config).hexdigest()!=meta.get('after_sha256'):
        raise ValueError('RECOVERY_BACKUP_OR_RECEIPT_DRIFT')
    saved = json.loads(safe_regular_file(PM2_DUMP))
    command = subprocess.run(['pm2','jlist'], capture_output=True,text=True,timeout=16)
    if command.returncode:raise ValueError('PM2_UNAVAILABLE')
    live = json.loads(command.stdout)
    restarts = check_pm2(live,saved)
    return {'runtime_green_restarts_historical':restarts,'live_and_persisted_dist':'.next',
            'fallback_backup_valid':True,'approved_stable_build_exists':True,
            'runtime_recipe_sha256':KNOWN_CONFIG_SHA}


def main(argv=None):
    cli=argparse.ArgumentParser()
    cli.add_argument('--live-readonly',action='store_true')
    args=cli.parse_args(argv)
    if not args.live_readonly:
        print(json.dumps({'status':'HOLD_EXPLICIT_LIVE_READONLY_REQUIRED'}))
        return 2
    try:
        facts=read_live_status()
        print(json.dumps({'status':'STARTUP_RECIPE_CONSISTENT_NOT_SIGNED_RELEASE',
                          'production_modified':False,'full_release_authorized':False,**facts},sort_keys=True))
    except (OSError,ValueError,subprocess.SubprocessError,UnicodeError,KeyError,TypeError,json.JSONDecodeError):
        print(json.dumps({'status':'HOLD_CONNECT_GREEN_STARTUP_UNVERIFIED',
                          'production_modified':False,'full_release_authorized':False},sort_keys=True))
    return 2  # A boot recipe never independently certifies full production.


if __name__=='__main__':sys.exit(main())
