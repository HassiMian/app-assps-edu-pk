#!/usr/bin/env python3
"""Read-only PostgreSQL globals/ACL restore preflight for a fresh DB archive.

A per-database pg_dump archive does not contain CREATE ROLE statements. Never
create privileged legacy users automatically or pretend --no-acl is complete.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

CATALOG=Path('/root/assps-release-backups/core-certification-20261012T171242Z/catalogue.private.txt')

def parse_acl_owners(lines):
    counts={}
    for line in lines.splitlines():
        if re.match(r'^\d+;\s+\d+\s+\d+\s+(?:DEFAULT\s+)?ACL\s+',line):
            owner=line.rsplit(None,1)[-1]
            if not re.fullmatch(r'[a-z_][a-z0-9_]*',owner):
                raise ValueError('Unexpected owner identifier in ACL catalogue')
            counts[owner]=counts.get(owner,0)+1
    return counts

def classify(owners,cluster_roles,source_roles):
    issues=[]
    if sum(owners.values())!=176:issues.append('fresh_archive_acl_count_mismatch')
    if owners.get('apexos_user')!=155:issues.append('legacy_role_acl_ownership_changed')
    if owners.get('apex_paper_owner')!=6:issues.append('paper_role_acl_ownership_changed')
    if owners.get('postgres')!=15:issues.append('administrative_acl_ownership_changed')
    missing=sorted(set(owners)-set(cluster_roles))
    if missing:issues.append('missing_restore_cluster_global_roles')
    unsafe=[role for role in owners if role!='postgres' and source_roles.get(role,{}).get('bypass_rls')]
    if unsafe:issues.append('privileged_source_role_requires_explicit_safe_mapping')
    return {'status':'PASS_GLOBALS_READY_ONLY' if not issues else 'HOLD',
            'issues':issues,'acl_entries':sum(owners.values()),
            'missing_role_names':missing,'unsafe_source_owners':sorted(unsafe),
            'read_only':True,'does_not_restore_roles':True,
            'production_rollback_certified':False}

def roles(port):
    sql="SELECT rolname||'|'||rolbypassrls::int FROM pg_roles"
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
             '-p',str(port),'-d','postgres','-c',sql],capture_output=True,text=True,timeout=12)
    if p.returncode:raise RuntimeError('PostgreSQL globals inventory unavailable')
    entries={}
    for line in p.stdout.splitlines():
        role,bypass=line.split('|')
        entries[role]={'bypass_rls':bypass=='1'}
    return entries

def main():
    try:
        st=CATALOG.stat()
        if not CATALOG.is_file() or st.st_uid!=0 or st.st_mode & 0o077:
            raise RuntimeError('Backup catalogue protection invalid')
        owners=parse_acl_owners(CATALOG.read_text())
        source_roles=roles(5432)
        clone_roles=roles(55432)
        result=classify(owners,clone_roles,source_roles)
    except (OSError,RuntimeError,ValueError,subprocess.TimeoutExpired) as ex:
        result={'status':'HOLD','issues':['global_role_inspection_failed:'+type(ex).__name__],
                'read_only':True,'production_rollback_certified':False}
    print(json.dumps(result,sort_keys=True))
    return 0 if result['status']=='PASS_GLOBALS_READY_ONLY' else 2
if __name__=='__main__':sys.exit(main())
