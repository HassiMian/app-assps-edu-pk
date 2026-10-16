#!/usr/bin/env python3
"""Actual restricted-role read-only QBank row-level security check.

Postgres SET LOCAL ROLE apex_app_runtime and session-local tenant context:
no access tokens, no impersonated human teacher, no cross-school row text,
no database mutation. This does NOT certify authenticated live login.
"""
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import tempfile

OUT=Path('/var/lib/assps-grade910-sourceclaims/tenant-rls-qbank-readonly.json')

def sql(query):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
                     '-v','ON_ERROR_STOP=1','-d','apexos','-c',query],
                     capture_output=True,text=True,timeout=25)
    if p.returncode:raise RuntimeError('READONLY_RESTRICTED_ROLE_RLS_SQL_FAILED')
    return [s for s in p.stdout.splitlines() if s.count('|')==2]

def as_counts(lines):
    if len(lines)!=1:raise ValueError('RLS_COUNT_ONLY_RESULT_MISSING')
    try:return tuple(int(k) for k in lines[0].split('|'))
    except Exception as e:raise ValueError('INVALID_RESTRICTED_RLS_COUNTS') from e

def validate(base,none,school1,school5,rls,role):
    # trusted base: (all, school1, school5) from privileged READ-ONLY
    if not all(isinstance(v,int) and v>=0 for g in (base,none,school1,school5) for v in g):
        raise ValueError('NEGATIVE_OR_NONNUMERIC_RLS_COUNTS')
    if (rls.get('enabled') is not True or rls.get('forced') is not True
        or role.get('rolsuper') is not False or role.get('rolbypassrls') is not False):
        raise ValueError('RLS_OR_RESTRICTED_ROLE_SECURITY_DISABLED')
    if (base[0]<base[1]+base[2] or min(base[1:])<1
        or none!=(0,0,0)
        or school1!=(base[1],base[1],0)
        or school5!=(base[2],0,base[2])):
        raise ValueError('UNEXPECTED_CROSS_TENANT_ROWS_VISIBLE')
    return {
      'schema':'ASSPS_GRADE910_RESTRICTED_ROLE_QBANK_READ_ONLY_RLS_V1',
      'observedUTC':dt.datetime.now(dt.timezone.utc).isoformat(),
      'roleTested':'apex_app_runtime',
      'readOnlySessionRoleContext':True,
      'forcedRLS':True,
      'roleSuperuserOrBypassRLS':False,
      'noTenantContextVisibleRows':none[0],
      'school1OwnVisibleRows':school1[1],
      'school1PeerSchool5VisibleRows':school1[2],
      'school5OwnVisibleRows':school5[2],
      'school5PeerSchool1VisibleRows':school5[1],
      'crossTenantLeakCount':0,
      'untestedOtherSchoolRows':base[0]-base[1]-base[2],
      'authenticatedRealTeacherLoginVerified':False,
      'independentPeerSchoolRealLoginVerified':False,
      'CoreProductionSecurityCertificationGranted':False,
      'databaseWrites':0,
      'questionTextOrStaffSecretsPersisted':False,
    }

def select_rows(context):
    if context not in (None,1,5):raise ValueError('TENANT_NOT_IN_AUDIT_SCOPE')
    context_set=f"SET LOCAL app.tenant_id='{context}'; " if context else ''
    query=("BEGIN TRANSACTION READ ONLY; "
           "SET LOCAL ROLE apex_app_runtime; "
           "SET LOCAL app.is_super_admin='false'; "+context_set+
           "SELECT COUNT(*),COUNT(*) FILTER(WHERE school_id=1),"
           "COUNT(*) FILTER(WHERE school_id=5) FROM public.question_bank;ROLLBACK;")
    return as_counts(sql(query))

def run():
    trusted=as_counts(sql("BEGIN TRANSACTION READ ONLY;SELECT COUNT(*),"
      "COUNT(*) FILTER(WHERE school_id=1),COUNT(*) FILTER(WHERE school_id=5) "
      "FROM public.question_bank;ROLLBACK;"))
    check_rls=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
       '-d','apexos','-v','ON_ERROR_STOP=1','-c',
       "SELECT c.relrowsecurity,c.relforcerowsecurity,r.rolsuper,r.rolbypassrls "
       "FROM pg_class c,pg_roles r WHERE c.oid='public.question_bank'::regclass "
       "AND r.rolname='apex_app_runtime'"],
       capture_output=True,text=True,timeout=20)
    if check_rls.returncode:raise RuntimeError('DATABASE_ROLE_OR_RLS_METADATA_MISSING')
    values=check_rls.stdout.strip().splitlines()
    if len(values)!=1 or len(values[0].split('|'))!=4:raise ValueError('RLS_METADATA_WRONG')
    yes=[v=='t' for v in values[0].split('|')]
    return validate(trusted,select_rows(None),select_rows(1),select_rows(5),
                    {'enabled':yes[0],'forced':yes[1]},
                    {'rolsuper':yes[2],'rolbypassrls':yes[3]})

def save(path,data):
    path.parent.mkdir(exist_ok=True,parents=True,mode=0o700)
    if path.parent.stat().st_mode&0o077:raise RuntimeError('PRIVATE_RLS_EVIDENCE_DIRECTORY_REQUIRED')
    fd,tmp=tempfile.mkstemp(prefix='.tenant-',dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(data,f,sort_keys=True,indent=2);f.write('\n')
            f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

if __name__=='__main__':
    receipt=run();save(OUT,receipt)
    print(json.dumps(receipt,sort_keys=True))
