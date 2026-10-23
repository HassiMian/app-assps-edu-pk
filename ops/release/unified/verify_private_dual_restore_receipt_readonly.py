#!/usr/bin/env python3
'''Verify durable HMAC receipt from real locally isolated dual-cluster restore.
Never mistake on-host rehearsal for off-host disaster recovery.
'''
import hmac,hashlib,json,os,re
from pathlib import Path
VAULT=Path('/root/secure-archive/assps-fivephase-recovery-evidence-20261023')
BACKUPS=Path('/var/backups')
HISTORIC=Path('/root/secure-archive/assps-p23-firstterm-forward-seal-20261023/exam9_school1_snapshot.json')
def verify_payload(envelope,key,manifest_hash,seal_hmac,latest):
 try:
  payload=envelope['receipt']
  raw=json.dumps(payload,sort_keys=True,separators=(',',':')).encode()
  if not hmac.compare_digest(hmac.new(key,raw,hashlib.sha256).hexdigest(),envelope['hmac_sha256']):return False
  if payload['schema']!='ASSPS_20261023_PRIVATE_ONHOST_DUAL_POSTGRESQL_RESTORE_V1':return False
  if payload['backup_snapshot']!=latest or payload['backup_manifest_sha256']!=manifest_hash:return False
  if payload['source_exam9_hmac_sha256']!=seal_hmac:return False
  if payload['main_databases']['count']!=64 or payload['signed_databases']['count']!=37:return False
  if len(payload['signed_sample_catalogs'])!=3:return False
  if payload['main_firstterm_exam9_rows']!=1854 or payload['main_firstterm_exam9_numeric_zeros']!=215:return False
  if not payload['main_firstterm_hmac_matches_forward_seal']:return False
  if payload['main_restore_errors']!=0 or payload['signed_restore_errors']!=0:return False
  if payload['signed_restore_psql_exit']!=0:return False
  if payload['offhost_two_cluster_restore_proven'] is not False:return False
  if payload['restored_live_production_mutated'] is not False:return False
  if payload['socket_only_listening'] is not True:return False
  return True
 except (KeyError,ValueError,TypeError):return False
def inspect():
 try:
  receipt=VAULT/'dual-cluster-onhost-restore-receipt.json'
  key=VAULT/'dual-restore-receipt.key'
  for file in (receipt,key):
   if not file.is_file() or file.is_symlink() or file.stat().st_mode&0o077:
    raise ValueError('UNTRUSTED_ATTESTATION_FILE')
  snapshots=sorted(p for p in BACKUPS.iterdir()
   if p.is_dir() and re.fullmatch(r'assps-critical-\d{8}T\d{6}Z',p.name))
  if not snapshots:raise ValueError('BACKUP_ABSENT')
  latest=snapshots[-1]
  manifest_hash=hashlib.sha256((latest/'SHA256SUMS').read_bytes()).hexdigest()
  actual=json.loads(receipt.read_text())
  historic=json.loads(HISTORIC.read_text())
  good=verify_payload(actual,key.read_bytes(),manifest_hash,historic['hmac_sha256'],latest.name)
  return {'pass':good,'read_only':True,'on_host_64_and_37_database_inventory_verified':good,
   'restored_firstterm_hmac_matched_original':good,
   'independent_off_host_restore_verified':False,
   'main_restore_shell_exit_explicitly_recorded':False}
 except (ValueError,OSError,KeyError,TypeError,IndexError):
  return {'pass':False,'read_only':True,'independent_off_host_restore_verified':False}
if __name__=='__main__':
 result=inspect()
 print(json.dumps(result,sort_keys=True))
 raise SystemExit(0 if result['pass'] else 3)
