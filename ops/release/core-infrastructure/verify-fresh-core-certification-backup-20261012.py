#!/usr/bin/env python3
"""Read-only cryptographic and restore-catalogue gate for a fresh Core dump.

Never runs pg_restore into a database, reads private table records or mutates
production; the backup remains protected in root-only storage.
"""
import hashlib
import json
from pathlib import Path
import re
import stat
import subprocess
import sys
import time

BACKUP=Path('/root/assps-release-backups/core-certification-20261012T171242Z')
MAX_AGE_SECONDS=24*3600

def evaluate(f):
  issues=[]
  for name in ('directory_secure','files_secure','digest_valid','restore_catalogue_valid',
               'archive_db_apexos','policy_count_matches','table_data_present','fresh'):
    if f.get(name) is not True:issues.append(name+'_required')
  return {'status':'PASS_BACKUP_READINESS_ONLY' if not issues else 'HOLD',
          'issues':issues,'read_only':True,'rollback_drill_completed':False,
          'full_release_certified':False}

def secure_path(p,expected_mode):
  if p.is_symlink() or not p.exists() or p.resolve()!=p:
    return False
  info=p.stat()
  return info.st_uid==0 and stat.S_IMODE(info.st_mode)==expected_mode

def inspect():
  f={}
  if BACKUP.parent!=Path('/root/assps-release-backups') or not BACKUP.name.startswith('core-certification-20261012T'):
    raise RuntimeError('Unexpected backup directory identity')
  f['directory_secure']=secure_path(BACKUP,0o700) and BACKUP.is_dir()
  dump=BACKUP/'apexos.dump';manifest=BACKUP/'sha256.txt'
  f['files_secure']=f['directory_secure'] and all(secure_path(p,0o600) and p.is_file()
                                                   for p in (dump,manifest))
  if not f['files_secure']:return f
  digest=hashlib.sha256()
  with dump.open('rb') as source:
    while block:=source.read(1024*1024):digest.update(block)
  expected=manifest.read_text()
  f['digest_valid']=expected==digest.hexdigest()+'  apexos.dump\n'
  f['fresh']=0 <= time.time()-dump.stat().st_mtime < MAX_AGE_SECONDS
  run=subprocess.run(['pg_restore','-l',str(dump)],capture_output=True,text=True,timeout=15)
  toc=run.stdout
  f['restore_catalogue_valid']=run.returncode==0 and bool(re.search(r';\s*TOC Entries:\s*(1[0-9]{3}|[2-9][0-9]{3,})\b',toc))
  f['archive_db_apexos']=bool(re.search(r';\s*dbname:\s*apexos\s*$',toc,re.M))
  f['policy_count_matches']=sum(' POLICY ' in line for line in toc.splitlines())==368
  f['table_data_present']=sum(' TABLE DATA ' in line for line in toc.splitlines())>=75
  return f

def main():
  try:checks=inspect();result=evaluate(checks)
  except (RuntimeError,OSError,ValueError,subprocess.TimeoutExpired) as error:
    checks={};result={'status':'HOLD','issues':['backup_inspection:'+type(error).__name__],
                      'read_only':True,'rollback_drill_completed':False,
                      'full_release_certified':False}
  print(json.dumps({'snapshot':'core-certification-20261012T171242Z',
                    'checks':checks,**result},sort_keys=True))
  return 0 if result['status']=='PASS_BACKUP_READINESS_ONLY' else 2
if __name__=='__main__':sys.exit(main())
