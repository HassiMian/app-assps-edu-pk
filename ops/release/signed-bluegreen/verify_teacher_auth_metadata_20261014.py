#!/usr/bin/env python3
"""Read-only school employee->user login mapping; never reads hashes or credentials.
This is a credential-free account PREflight, NOT evidence of an authenticated session.
"""
import argparse
import json
import subprocess
import sys


def interpret(f):
    checks = {
        'one_linked_employee': f.get('employee_count') == 1,
        'linked_user_exists': f.get('user_id') is not None,
        'employee_enabled': f.get('employee_active') is True and f.get('portal_active') is True,
        'user_enabled': f.get('user_active') is True,
        'both_roles_teacher': f.get('employee_role') == 'teacher' and f.get('user_role') == 'teacher',
        'same_school': f.get('employee_school_id') == f.get('user_school_id') and f.get('user_school_id') is not None,
        'tenant_matches_school': f.get('school_tenant') == f.get('user_tenant') and bool(f.get('school_tenant')),
        'exact_portal_username_mapping': f.get('portal_username_matches') is True,
        'no_login_identifier_collision': f.get('login_match_count') == 1,
        'stored_user_credential_present': f.get('user_password_present') is True,
    }
    return {'status': 'ACCOUNT_METADATA_READY_FOR_GENUINE_LOGIN' if all(checks.values()) else 'ACCOUNT_METADATA_HOLD',
            'checks': checks,
            'temporary_password_challenge_expected': f.get('must_change_password') is True,
            'authenticated_existing_staff_login_verified': False,
            'production_writes': False}


def scan(employee_id, school_id):
    eid = int(employee_id)
    sid = int(school_id)
    # Literal integers have been parsed into ints, never allow text SQL injection.
    sql = f"""BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
      SELECT row_to_json(q) FROM (
       SELECT
        (SELECT count(*)::int FROM public.employees e WHERE e.id={eid} AND e.school_id={sid}) AS employee_count,
        e.school_id AS employee_school_id, e.user_id, e.is_active AS employee_active,
        e.portal_active, lower(trim(coalesce(e.portal_role,''))) AS employee_role,
        u.school_id AS user_school_id, u.is_active AS user_active,
        lower(trim(coalesce(u.role,''))) AS user_role,
        u.must_change_password,
        (nullif(u.password,'') IS NOT NULL) AS user_password_present,
        (nullif(e.portal_username,'') IS NOT NULL AND lower(trim(e.portal_username))=lower(trim(u.username))) AS portal_username_matches,
        s.tenant_id AS school_tenant, u.tenant_id AS user_tenant,
        (SELECT count(*)::int FROM public.users x WHERE
           lower(trim(coalesce(x.username,'')))=lower(trim(u.username)) OR
           lower(trim(coalesce(x.email,'')))=lower(trim(u.username))) AS login_match_count
       FROM public.employees e
       LEFT JOIN public.users u ON u.id=e.user_id
       LEFT JOIN public.schools s ON s.id=e.school_id
       WHERE e.id={eid} AND e.school_id={sid}
       LIMIT 1
      ) q;
    ROLLBACK;"""
    cp = subprocess.run(['runuser','-u','postgres','--','psql','-X','-q','-t','-A','-d','apexos','-v','ON_ERROR_STOP=1'], input=sql, text=True, capture_output=True, timeout=25)
    if cp.returncode:
        raise RuntimeError('Read-only PostgreSQL account preflight failed; see protected server logs')
    lines = [ln.strip() for ln in cp.stdout.splitlines() if ln.strip().startswith('{')]
    if len(lines) != 1:
        return {'employee_count': 0}
    return json.loads(lines[0])


def main():
    p=argparse.ArgumentParser(description='Only metadata; no credential, password or JWT inspection')
    p.add_argument('--school-id',type=int,required=True)
    p.add_argument('--employee-id',type=int,required=True)
    args=p.parse_args()
    if args.school_id<=0 or args.employee_id<=0: p.error('positive IDs required')
    try: verdict=interpret(scan(args.employee_id,args.school_id))
    except Exception as ex:
        print(json.dumps({'status':'ACCOUNT_METADATA_HOLD','reason':str(ex),'production_writes':False}))
        return 2
    print(json.dumps({'gate':'CORE_EMPLOYEE_USER_LOGIN_METADATA_20261014',**verdict},sort_keys=True,indent=2))
    return 0 if verdict['status']=='ACCOUNT_METADATA_READY_FOR_GENUINE_LOGIN' else 2

if __name__=='__main__':sys.exit(main())
