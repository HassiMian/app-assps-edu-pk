#!/usr/bin/env python3
"""Privacy-safe read-only record-drift gate against pinned known backup.
Counts only, never prints student identities, amounts per record, or mark IDs.
Independent academic attribution/approval is required before rebaselining.
"""
import csv
import gzip
import io
import json
import subprocess
from decimal import Decimal
from pathlib import Path

BACKUP=Path('/var/backups/assps-critical-20261022T141121Z/postgres-all.sql.gz')
SQL='SELECT id,marks_obtained,total_marks,grade,result_status FROM exam_results WHERE school_id=1 AND exam_id=9'

def as_score(value):
    if value is None or value==r'\N' or value=='':return None
    return Decimal(str(value))

def collect_backup(path=BACKUP):
    rows={}
    db=''
    reading=False
    fields=[]
    with gzip.open(path,'rt',errors='replace') as file:
        for line in file:
            if line.startswith('\\connect '):
                db=line.strip().split(None,1)[1]
                if rows and db!='apexos':break
            if reading:
                if line.startswith('\\.'):
                    reading=False
                else:
                    values=dict(zip(fields,line.rstrip('\n').split('\t')))
                    if values.get('school_id')=='1' and values.get('exam_id')=='9':
                        rows[int(values['id'])]=values
            elif db=='apexos' and line.startswith('COPY public.exam_results '):
                fields=[x.strip() for x in line.split('(',1)[1].split(')',1)[0].split(',')]
                reading=True
    return rows

def compare(backup,live):
    changes=0; zeros_to_positive=0; positive_to_zero=0; grade_only=0
    if set(backup)!=set(live):
        return {'pass':False,'record_membership_drift':len(set(backup)^set(live)),
                'backup_rows':len(backup),'live_rows':len(live)}
    for key in backup:
        b=backup[key];n=live[key]
        old=as_score(b['marks_obtained']);new=as_score(n['marks_obtained'])
        score_changed=old!=new or as_score(b['total_marks'])!=as_score(n['total_marks'])
        grade_changed=(b.get('grade') or '')!=(n.get('grade') or '')
        status_changed=(b.get('result_status') or '')!=(n.get('result_status') or '')
        if score_changed or grade_changed or status_changed:
            changes+=1
            if not score_changed and grade_changed and not status_changed:grade_only+=1
            if old==0 and new is not None and new>0:zeros_to_positive+=1
            if old is not None and old>0 and new==0:positive_to_zero+=1
    return {'pass':changes==0,'backup_rows':len(backup),'live_rows':len(live),
            'changed_results':changes,'zero_to_positive':zeros_to_positive,
            'positive_to_zero':positive_to_zero,'grade_only':grade_only}

def inspect():
    try:
        saved=collect_backup()
        if not saved:raise ValueError('EMPTY_VERIFIED_SNAPSHOT')
        p=subprocess.run(['runuser','-u','postgres','--','psql','-X','--csv','-p','5432',
            '-d','apexos','-v','ON_ERROR_STOP=1','-c',SQL],
            capture_output=True,text=True,timeout=18)
        if p.returncode:raise RuntimeError('LIVE_READONLY_DB_QUERY_FAILED')
        now={int(x['id']):x for x in csv.DictReader(io.StringIO(p.stdout))}
        result=compare(saved,now)
        result.update({'read_only':True,'school_id':1,'exam_id':9,
           'baseline':'2026-10-22T14:12Z','immutable_approved_baseline':False,
           'changes_not_automatically_reverted':True})
        return result
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as e:
        return {'pass':False,'read_only':True,'error_type':type(e).__name__}

if __name__=='__main__':
    report=inspect()
    print(json.dumps(report,sort_keys=True))
    raise SystemExit(0 if report['pass'] else 3)
