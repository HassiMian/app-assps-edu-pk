#!/usr/bin/env python3
"""Read-only First Term score/grade drift vs the pinned, SHA256-sealed Oct23 backup.
The snapshot is not an authorized award sheet. No identifiers or row values printed.
"""
from pathlib import Path
import hashlib,csv,io,json,subprocess
import verify_firstterm_snapshot_drift_readonly as baseline
BACKUP_DIR=Path('/var/backups/assps-critical-20261023T013552Z')
BACKUP=BACKUP_DIR/'postgres-all.sql.gz'
def inspect(*,backup=None,live=None,verified_backup_digest=None):
    try:
        saved=backup if backup is not None else baseline.collect_backup(BACKUP)
        if live is None:
            q=subprocess.run(['runuser','-u','postgres','--','psql','-X','--csv','-p','5432',
                '-d','apexos','-v','ON_ERROR_STOP=1','-c',baseline.SQL],
                capture_output=True,text=True,timeout=20)
            if q.returncode:raise RuntimeError('READ_ONLY_LIVE_DB_FAILED')
            live={int(r['id']):r for r in csv.DictReader(io.StringIO(q.stdout))}
        if verified_backup_digest is None:
            digest_entries=(BACKUP_DIR/'SHA256SUMS').read_text().splitlines()
            matching=[entry for entry in digest_entries if entry.endswith('/postgres-all.sql.gz')]
            if len(matching)!=1:raise ValueError('SEALED_ARCHIVE_DIGEST_ENTRY_MISSING')
            expected=matching[0][:64]
            if len(expected)!=64:raise ValueError('INVALID_ARCHIVE_DIGEST')
            actual=hashlib.sha256(BACKUP.read_bytes()).hexdigest()
            verified_backup_digest=(expected==actual)
        if not verified_backup_digest:raise ValueError('BACKUP_CHECKSUM_DRIFT')
        if not saved or len(saved)!=len(live) or set(saved)!=set(live):
            raise ValueError('BACKUP_LIVE_ROW_SET_DRIFT')
        result=baseline.compare(saved,live)
        result.update({'pass':result['changed_results']==0,'read_only':True,
                       'baseline':'2026-10-23T01:35:52Z',
                       'immutable_approved_baseline':False,
                       'changes_not_automatically_reverted':True,
                       'source_archive_sha256_verified':True})
        return result
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as err:
        return {'pass':False,'read_only':True,'error_type':type(err).__name__}
if __name__=='__main__':
    answer=inspect()
    print(json.dumps(answer,sort_keys=True))
    raise SystemExit(0 if answer['pass'] else 3)
